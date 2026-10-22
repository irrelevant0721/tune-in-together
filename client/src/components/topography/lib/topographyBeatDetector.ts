import { createKickEnvelopeState, stepKickEnvelope, type KickEnvelopeState } from './topographyKickEnvelope';

export interface BeatWindow {
  name: 'Deep' | 'Classic' | 'Punch' | 'Wide';
  start: number;
  end: number;
}

export interface BeatDetectorState {
  activeWindowIndex: number;
  windowScores: number[];
  previousWindowLevels: number[];
  fluxHistory: number[];
  fluxHistoryIndex: number;
  smoothedFlux: number;
  previousSmoothedFlux: number;
  cooldownRemaining: number;
  kickEnvelopeState: KickEnvelopeState;
}

export interface BeatDetectorOutput {
  state: BeatDetectorState;
  kickLevel: number;
  kickFlux: number;
  kickThreshold: number;
  kickOnset: number;
  kickEnvelope: number;
  kickConfidence: number;
  activeWindow: BeatWindow;
}

export interface BeatDetectorSettings {
  sensitivity: number;
}

export interface BeatDetectorParams {
  thresholdStdDevGain: number;
  thresholdFloor: number;
  minTriggerFlux: number;
}

export interface BeatTimelineState {
  beats: number[];
  lastBeatAt: number;
}

export const BEAT_WINDOWS: BeatWindow[] = [
  { name: 'Deep', start: 0, end: 2 },
  { name: 'Classic', start: 1, end: 4 },
  { name: 'Punch', start: 2, end: 6 },
  { name: 'Wide', start: 0, end: 7 },
];

const FLUX_HISTORY_SIZE = 90;
const WINDOW_SCORE_DECAY = 0.965;
const FLUX_SMOOTHING = 0.35;
const COOLDOWN_SECONDS = 0.12;
const MIN_TRIGGER_FLUX = 0.045;
const THRESHOLD_STDDEV_GAIN = 1.8;
const THRESHOLD_FLOOR = 0.028;
const BEAT_LAMP_MS = 180;
export const BEAT_DETECTOR_STORAGE_KEY = 'sonic-topography-beat-detector-v1';
const DEFAULT_BEAT_DETECTOR_SENSITIVITY = 100;

const STRICT_PARAMS: BeatDetectorParams = {
  thresholdStdDevGain: 2.6,
  thresholdFloor: 0.05,
  minTriggerFlux: 0.07,
};

const DEFAULT_PARAMS: BeatDetectorParams = {
  thresholdStdDevGain: THRESHOLD_STDDEV_GAIN,
  thresholdFloor: THRESHOLD_FLOOR,
  minTriggerFlux: MIN_TRIGGER_FLUX,
};

const SENSITIVE_PARAMS: BeatDetectorParams = {
  thresholdStdDevGain: 1.1,
  thresholdFloor: 0.016,
  minTriggerFlux: 0.025,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

export function normalizeBeatDetectorSettings(settings?: Partial<BeatDetectorSettings> | null): BeatDetectorSettings {
  const rawSensitivity = settings?.sensitivity ?? DEFAULT_BEAT_DETECTOR_SENSITIVITY;
  const sensitivity = Number.isFinite(rawSensitivity)
    ? Math.round(clamp(rawSensitivity, 0, 100))
    : DEFAULT_BEAT_DETECTOR_SENSITIVITY;

  return { sensitivity };
}

export function deriveBeatDetectorParams(settings?: Partial<BeatDetectorSettings> | null): BeatDetectorParams {
  const { sensitivity } = normalizeBeatDetectorSettings(settings);
  const lowerHalf = sensitivity <= 50 ? sensitivity / 50 : 1;
  const upperHalf = sensitivity > 50 ? (sensitivity - 50) / 50 : 0;
  const fromStrict = {
    thresholdStdDevGain: lerp(STRICT_PARAMS.thresholdStdDevGain, DEFAULT_PARAMS.thresholdStdDevGain, lowerHalf),
    thresholdFloor: lerp(STRICT_PARAMS.thresholdFloor, DEFAULT_PARAMS.thresholdFloor, lowerHalf),
    minTriggerFlux: lerp(STRICT_PARAMS.minTriggerFlux, DEFAULT_PARAMS.minTriggerFlux, lowerHalf),
  };

  return {
    thresholdStdDevGain: lerp(fromStrict.thresholdStdDevGain, SENSITIVE_PARAMS.thresholdStdDevGain, upperHalf),
    thresholdFloor: lerp(fromStrict.thresholdFloor, SENSITIVE_PARAMS.thresholdFloor, upperHalf),
    minTriggerFlux: lerp(fromStrict.minTriggerFlux, SENSITIVE_PARAMS.minTriggerFlux, upperHalf),
  };
}

export function readBeatDetectorSettingsStorage(): BeatDetectorSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return normalizeBeatDetectorSettings();
  }

  try {
    const raw = window.localStorage.getItem(BEAT_DETECTOR_STORAGE_KEY);
    if (!raw) return normalizeBeatDetectorSettings();
    return normalizeBeatDetectorSettings(JSON.parse(raw));
  } catch {
    return normalizeBeatDetectorSettings();
  }
}

export function writeBeatDetectorSettingsStorage(settings: Partial<BeatDetectorSettings>) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(
      BEAT_DETECTOR_STORAGE_KEY,
      JSON.stringify(normalizeBeatDetectorSettings(settings)),
    );
  } catch {
    // Storage can be unavailable in private windows or tests; detector keeps the in-memory value.
  }
}

export function createBeatDetectorState(): BeatDetectorState {
  return {
    activeWindowIndex: 1,
    windowScores: new Array(BEAT_WINDOWS.length).fill(0),
    previousWindowLevels: new Array(BEAT_WINDOWS.length).fill(0),
    fluxHistory: new Array(FLUX_HISTORY_SIZE).fill(0),
    fluxHistoryIndex: 0,
    smoothedFlux: 0,
    previousSmoothedFlux: 0,
    cooldownRemaining: 0,
    kickEnvelopeState: createKickEnvelopeState(),
  };
}

export function createBeatTimelineState(): BeatTimelineState {
  return {
    beats: [],
    lastBeatAt: 0,
  };
}

function readWindowLevel(frequencyData: Uint8Array, window: BeatWindow) {
  let weighted = 0;
  let weightTotal = 0;
  const center = (window.start + window.end) / 2;
  const halfWidth = Math.max(1, (window.end - window.start + 1) / 2);

  for (let bin = window.start; bin <= window.end; bin++) {
    const distance = Math.abs(bin - center);
    const weight = 0.35 + 0.65 * (1 - Math.min(1, distance / halfWidth));
    weighted += (frequencyData[bin] / 255) * weight;
    weightTotal += weight;
  }

  return weightTotal > 0 ? weighted / weightTotal : 0;
}

function fluxStats(history: number[]) {
  const avg = history.reduce((sum, value) => sum + value, 0) / Math.max(1, history.length);
  const variance = history.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / Math.max(1, history.length);
  return { avg, stdDev: Math.sqrt(variance) };
}

export function stepBeatDetector({
  state,
  frequencyData,
  deltaSeconds,
  settings,
}: {
  state: BeatDetectorState;
  frequencyData: Uint8Array;
  deltaSeconds: number;
  settings?: Partial<BeatDetectorSettings>;
}): BeatDetectorOutput {
  const safeDelta = Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0);
  const params = deriveBeatDetectorParams(settings);
  const windowLevels = BEAT_WINDOWS.map((window) => readWindowLevel(frequencyData, window));
  const nextScores = state.windowScores.map((score, index) => {
    const flux = Math.max(0, windowLevels[index] - state.previousWindowLevels[index]);
    const windowWidth = BEAT_WINDOWS[index].end - BEAT_WINDOWS[index].start + 1;
    const focusBonus = 1 / Math.sqrt(windowWidth);
    return score * WINDOW_SCORE_DECAY + flux * focusBonus;
  });

  let activeWindowIndex = state.activeWindowIndex;
  for (let i = 0; i < nextScores.length; i++) {
    if (nextScores[i] > nextScores[activeWindowIndex] * 1.03) {
      activeWindowIndex = i;
    }
  }

  const rawFlux = Math.max(0, windowLevels[activeWindowIndex] - state.previousWindowLevels[activeWindowIndex]);
  const smoothedFlux = state.smoothedFlux + (rawFlux - state.smoothedFlux) * FLUX_SMOOTHING;
  const { avg, stdDev } = fluxStats(state.fluxHistory);
  const threshold = Math.max(params.thresholdFloor, avg + stdDev * params.thresholdStdDevGain);
  const cooldownRemaining = Math.max(0, state.cooldownRemaining - safeDelta);
  const isPeak = state.previousSmoothedFlux > threshold
    && state.previousSmoothedFlux >= smoothedFlux
    && state.previousSmoothedFlux >= params.minTriggerFlux;
  const onset = cooldownRemaining <= 0 && isPeak;
  const displayedFlux = onset ? state.previousSmoothedFlux : smoothedFlux;

  const nextHistory = [...state.fluxHistory];
  nextHistory[state.fluxHistoryIndex] = smoothedFlux;
  const nextHistoryIndex = (state.fluxHistoryIndex + 1) % nextHistory.length;
  const nextEnvelope = stepKickEnvelope({
    state: state.kickEnvelopeState,
    rawKickLevel: windowLevels[activeWindowIndex],
    onset,
    deltaSeconds: safeDelta || 1 / 60,
  });
  const confidence = clamp(displayedFlux / Math.max(0.001, threshold * 2.2), 0, 1);

  return {
    state: {
      activeWindowIndex,
      windowScores: nextScores,
      previousWindowLevels: windowLevels,
      fluxHistory: nextHistory,
      fluxHistoryIndex: nextHistoryIndex,
      smoothedFlux,
      previousSmoothedFlux: smoothedFlux,
      cooldownRemaining: onset ? COOLDOWN_SECONDS : cooldownRemaining,
      kickEnvelopeState: nextEnvelope,
    },
    kickLevel: nextEnvelope.kickLevel,
    kickFlux: displayedFlux,
    kickThreshold: threshold,
    kickOnset: onset ? 1 : 0,
    kickEnvelope: nextEnvelope.kickEnvelope,
    kickConfidence: confidence,
    activeWindow: BEAT_WINDOWS[activeWindowIndex],
  };
}

export function stepBeatTimeline({
  state,
  now,
  onset,
  windowMs = 6000,
}: {
  state: BeatTimelineState;
  now: number;
  onset: boolean;
  windowMs?: number;
}): BeatTimelineState {
  const nextBeats = onset ? [...state.beats, now] : [...state.beats];
  return {
    beats: nextBeats.filter((beatAt) => now - beatAt <= windowMs),
    lastBeatAt: onset ? now : state.lastBeatAt,
  };
}

export function getBeatLampValue({
  now,
  lastBeatAt,
  holdMs = BEAT_LAMP_MS,
}: {
  now: number;
  lastBeatAt: number;
  holdMs?: number;
}) {
  return lastBeatAt > 0 && now - lastBeatAt <= holdMs ? 1 : 0;
}
