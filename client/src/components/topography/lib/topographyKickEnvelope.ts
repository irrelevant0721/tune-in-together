export interface KickEnvelopeState {
  noiseFloor: number;
  kickLevel: number;
  kickOnset: number;
  kickEnvelope: number;
}

const NOISE_FLOOR_ATTACK_RATE = 1.15;
const NOISE_FLOOR_RELEASE_RATE = 0.35;
const LEVEL_GATE = 0.025;
const BREATH_GAIN = 0.18;
const MAX_BREATH = 0.11;
const ONSET_MIN_IMPULSE = 0.48;
const ONSET_GAIN = 0.95;
const ENVELOPE_ATTACK_RATE = 42;
const ENVELOPE_RELEASE_RATE = 11.5;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function blendForRate(rate: number, deltaSeconds: number) {
  const safeDelta = Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0);
  return clamp(1 - Math.exp(-rate * safeDelta), 0, 1);
}

export function createKickEnvelopeState(): KickEnvelopeState {
  return {
    noiseFloor: 0,
    kickLevel: 0,
    kickOnset: 0,
    kickEnvelope: 0,
  };
}

export function stepKickEnvelope({
  state,
  rawKickLevel,
  onset,
  deltaSeconds,
}: {
  state: KickEnvelopeState;
  rawKickLevel: number;
  onset: boolean;
  deltaSeconds: number;
}): KickEnvelopeState {
  const safeRaw = clamp(Number.isFinite(rawKickLevel) ? rawKickLevel : 0, 0, 1);
  const floorRate = safeRaw > state.noiseFloor ? NOISE_FLOOR_ATTACK_RATE : NOISE_FLOOR_RELEASE_RATE;
  const noiseFloor = state.noiseFloor + (safeRaw - state.noiseFloor) * blendForRate(floorRate, deltaSeconds);
  const kickLevel = clamp(safeRaw - noiseFloor - LEVEL_GATE, 0, 1);
  const breathTarget = Math.min(MAX_BREATH, kickLevel * BREATH_GAIN);
  const onsetTarget = onset ? Math.max(ONSET_MIN_IMPULSE, kickLevel * ONSET_GAIN) : 0;
  const targetEnvelope = Math.max(breathTarget, onsetTarget);
  const envelopeRate = targetEnvelope > state.kickEnvelope ? ENVELOPE_ATTACK_RATE : ENVELOPE_RELEASE_RATE;
  const kickEnvelope = Math.max(
    breathTarget,
    state.kickEnvelope + (targetEnvelope - state.kickEnvelope) * blendForRate(envelopeRate, deltaSeconds),
  );

  return {
    noiseFloor,
    kickLevel,
    kickOnset: onset ? 1 : 0,
    kickEnvelope: clamp(kickEnvelope, 0, 1),
  };
}
