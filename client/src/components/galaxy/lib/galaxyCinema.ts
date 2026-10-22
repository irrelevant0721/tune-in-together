import { getSharedAudio } from '../../../lib/audioElement';

type BeatCombo = 'downbeat' | 'push' | 'drop' | 'rebound' | 'accent';

interface BeatCameraEvent {
  start?: number;
  hit?: number;
  amp: number;
  attack: number;
  hold: number;
  release: number;
  zoomAmp: number;
  thetaAmp: number;
  phiAmp: number;
  rollAmp: number;
  mode: 'deep' | 'body' | 'snap';
  combo: BeatCombo;
  phase: number;
  mass: number;
}

export interface BeatCameraKick {
  punch: number;
  thetaKick: number;
  phiKick: number;
  radiusKick: number;
  rollKick: number;
}

const beatCam = {
  events: [] as BeatCameraEvent[],
  punch: 0,
  thetaKick: 0,
  phiKick: 0,
  radiusKick: 0,
  rollKick: 0,
  lastTriggerAt: -10,
  lastRealtimeAt: -10,
  beatCount: 0,
  prevAudioTime: -1,
  attack: 0.028,
  hold: 0.03,
  release: 0.185,
  realtimeMinInterval: 0.46,
};

const cinemaDynamics = { avg: 0, lowAvg: 0, peak: 0.3, scale: 0.82 };

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clampRange(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function easeBeatCamera(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function cameraDynamicsScale(extra = 1): number {
  return clampRange((cinemaDynamics.scale || 0.82) * extra, 0.18, 1.18);
}

export function getCameraDynamicsScale(extra = 1): number {
  return cameraDynamicsScale(extra);
}

export function resetGalaxyCinema(): void {
  beatCam.events.length = 0;
  beatCam.punch = 0;
  beatCam.thetaKick = 0;
  beatCam.phiKick = 0;
  beatCam.radiusKick = 0;
  beatCam.rollKick = 0;
  beatCam.lastTriggerAt = -10;
  beatCam.lastRealtimeAt = -10;
  beatCam.beatCount = 0;
  beatCam.prevAudioTime = -1;
  cinemaDynamics.avg = 0;
  cinemaDynamics.lowAvg = 0;
  cinemaDynamics.peak = 0.3;
  cinemaDynamics.scale = 0.82;
}

export function updateGalaxyCinemaDynamics(rawEnergy: number, rawLow: number): void {
  const e = clamp01(rawEnergy);
  const l = clamp01(rawLow);
  const composite = e * 0.62 + l * 0.38;
  cinemaDynamics.avg += (composite - cinemaDynamics.avg) * (composite > cinemaDynamics.avg ? 0.01 : 0.004);
  cinemaDynamics.lowAvg += (l - cinemaDynamics.lowAvg) * (l > cinemaDynamics.lowAvg ? 0.012 : 0.005);
  cinemaDynamics.peak = Math.max(0.3, cinemaDynamics.peak * 0.9988, composite);
  const floor = Math.max(0.1, cinemaDynamics.avg * 0.82);
  const span = Math.max(0.18, cinemaDynamics.peak - floor);
  const lift = clamp01((composite - floor) / span);
  let target = 0.42 + lift * 0.56 + clamp01((l - cinemaDynamics.lowAvg) / 0.36) * 0.12;
  if (cinemaDynamics.avg < 0.18 && l < 0.32) target *= 0.78;
  cinemaDynamics.scale += (target - cinemaDynamics.scale) * (target > cinemaDynamics.scale ? 0.045 : 0.022);
}

export interface LiveBeatCameraInput {
  strength: number;
  confidence: number;
  score: number;
  low: number;
  body?: number;
  snap?: number;
  tempoAssist?: boolean;
}

export interface MapBeatCameraInput {
  time: number;
  strength: number;
  confidence: number;
  impact?: number;
  combo?: BeatCombo;
  low: number;
  body: number;
  snap: number;
  mass?: number;
  sharpness?: number;
  index?: number;
}

function pushBeatCameraEvent(ev: BeatCameraEvent): void {
  const audio = getSharedAudio();
  const nowT = audio.currentTime || 0;
  beatCam.events.push({
    ...ev,
    start: ev.start ?? nowT - ev.attack * 0.42,
    hit: ev.hit ?? nowT,
  });
  if (beatCam.events.length > 8) {
    beatCam.events.splice(0, beatCam.events.length - 8);
  }
}

function buildCameraEventFromTones(
  beat: LiveBeatCameraInput | MapBeatCameraInput,
  combo: BeatCombo,
  index: number,
): Omit<BeatCameraEvent, 'start' | 'hit'> & { amp: number } {
  const strength = clamp01(beat.strength);
  const confidence = clamp01(beat.confidence);
  const lowTone = clamp01(beat.low);
  const bodyTone = clamp01(beat.body ?? 0.22);
  const snapTone = clamp01(beat.snap ?? 0.16);
  const toneSum = Math.max(0.001, lowTone + bodyTone + snapTone);
  const lowN = lowTone / toneSum;
  const bodyN = bodyTone / toneSum;
  const snapN = snapTone / toneSum;
  const sharpness = 'sharpness' in beat && beat.sharpness != null ? beat.sharpness : snapN;
  const mass =
    'mass' in beat && beat.mass != null
      ? clamp01(beat.mass)
      : clamp01(lowN * 0.72 + bodyN * 0.36 + strength * 0.2);

  let mode: BeatCameraEvent['mode'] = 'deep';
  if (snapN > 0.42 && snapN > lowN * 1.18 && snapN > bodyN * 1.08) mode = 'snap';
  else if (bodyN > 0.46 && bodyN > lowN * 1.12) mode = 'body';

  let amp = clampRange(0.15 + strength * 0.34 + confidence * 0.06 + mass * 0.13 + snapN * 0.04, 0.18, 0.72);
  if (mode === 'deep') amp = Math.min(0.62, amp * 1.12);
  const impact = 'impact' in beat && beat.impact != null ? beat.impact : strength;
  amp *= 0.68 + clamp01(impact) * 0.46;

  const dynScale = cameraDynamicsScale(0.92 + clamp01(impact) * 0.12 + mass * 0.08);
  amp *= dynScale;

  const attack = clampRange(beatCam.attack * (1.18 - sharpness * 0.55), 0.014, 0.038);
  const hold = clampRange(beatCam.hold * (0.62 + lowN * 0.55 + bodyN * 0.25), 0.014, 0.052);
  const release = clampRange(
    beatCam.release * (0.76 + mass * 0.56 + bodyN * 0.18 - sharpness * 0.18),
    0.11,
    0.255,
  );

  let zoomAmp = 0.07 + mass * 0.19 + (mode === 'deep' ? 0.095 : 0.018) + strength * 0.045;
  let thetaAmp = 0.00035;
  let phiAmp = 0.002 + (mode === 'body' ? 0.012 : mode === 'snap' ? 0.005 : 0.002);
  let rollAmp = mode === 'snap' ? 0.003 + snapN * 0.004 : 0.0008;
  zoomAmp *= 0.76 + dynScale * 0.28;
  phiAmp *= 0.82 + dynScale * 0.2;
  rollAmp *= 0.78 + dynScale * 0.24;

  if (combo === 'downbeat') {
    amp *= 1.1;
    zoomAmp *= 1.18;
    phiAmp *= 0.72;
  } else if (combo === 'push') {
    amp *= 0.84;
    zoomAmp *= 0.88;
    phiAmp *= 0.62;
  } else if (combo === 'drop') {
    amp *= 0.96;
    zoomAmp *= 0.72;
    phiAmp *= 1.22;
  } else if (combo === 'rebound') {
    amp *= 0.74;
    zoomAmp *= 0.62;
    phiAmp *= 0.78;
  } else if (combo === 'accent') {
    amp *= 1.14;
    zoomAmp *= 0.86;
    rollAmp *= 1.48;
  }

  return {
    amp,
    attack,
    hold,
    release,
    zoomAmp,
    thetaAmp,
    phiAmp,
    rollAmp,
    mode,
    combo,
    phase: index * 2.399963 + (snapN - lowN) * 1.4,
    mass,
  };
}

/** beatMap 预解析节点 → 电影镜头 */
export function scheduleMapBeatCamera(beat: MapBeatCameraInput): void {
  if (beat.strength < 0.38 && (beat.impact ?? 0) < 0.2) return;
  const combo = beat.combo ?? 'downbeat';
  const built = buildCameraEventFromTones(beat, combo, beat.index ?? Math.floor(beat.time * 2.7));
  const audio = getSharedAudio();
  const nowT = audio.currentTime || 0;
  pushBeatCameraEvent({
    ...built,
    hit: beat.time,
    start: nowT + (beat.time - nowT) - built.attack,
  });
  beatCam.lastTriggerAt = beat.time;
}

export function syncBeatCameraCursor(_t: number, preserveVisual = false): void {
  if (!preserveVisual) {
    beatCam.events.length = 0;
    beatCam.punch = 0;
    beatCam.thetaKick = 0;
    beatCam.phiKick = 0;
    beatCam.radiusKick = 0;
    beatCam.rollKick = 0;
  }
}

/** 实时节拍引擎命中时调度一个电影镜头节点 */
export function scheduleLiveBeatCamera(beat: LiveBeatCameraInput): void {
  const audio = getSharedAudio();
  const nowT = audio.currentTime || 0;
  const strength = clamp01(beat.strength);
  if (nowT - beatCam.lastRealtimeAt < beatCam.realtimeMinInterval && strength < 0.78) return;

  const idx = beatCam.beatCount;
  const comboSlot = Math.abs(idx) % 4;
  let combo: BeatCombo =
    comboSlot === 0 ? 'downbeat' : comboSlot === 1 ? 'push' : comboSlot === 2 ? 'drop' : 'rebound';
  if (strength > 0.84 && combo !== 'downbeat') combo = 'accent';

  const built = buildCameraEventFromTones(beat, combo, idx);
  pushBeatCameraEvent({
    ...built,
    hit: nowT,
    start: nowT - built.attack * 0.42,
  });
  beatCam.lastRealtimeAt = nowT;
  beatCam.lastTriggerAt = nowT;
  beatCam.beatCount++;
}

/** 每帧更新电影镜头 envelope，返回当前 kick 偏移 */
export function tickGalaxyCinema(dt: number): BeatCameraKick {
  const audio = getSharedAudio();
  const t = audio.currentTime || 0;

  if (audio.paused) {
    beatCam.punch *= Math.pow(0.08, dt);
    beatCam.thetaKick *= Math.pow(0.05, dt);
    beatCam.phiKick *= Math.pow(0.05, dt);
    beatCam.radiusKick *= Math.pow(0.05, dt);
    beatCam.rollKick *= Math.pow(0.05, dt);
    beatCam.events.length = 0;
    beatCam.prevAudioTime = t;
    return {
      punch: beatCam.punch,
      thetaKick: beatCam.thetaKick,
      phiKick: beatCam.phiKick,
      radiusKick: beatCam.radiusKick,
      rollKick: beatCam.rollKick,
    };
  }

  if (beatCam.prevAudioTime >= 0 && Math.abs(t - beatCam.prevAudioTime) > 0.55) {
    beatCam.events.length = 0;
  }
  beatCam.prevAudioTime = t;

  let punch = 0;
  let thetaKick = 0;
  let phiKick = 0;
  let radiusKick = 0;
  let rollKick = 0;
  let leadEvent: BeatCameraEvent | null = null;
  let leadPunch = 0;
  let leadVal = 0;

  for (let i = beatCam.events.length - 1; i >= 0; i--) {
    const ev = beatCam.events[i];
    const attack = ev.attack || beatCam.attack;
    const hold = ev.hold || beatCam.hold;
    const release = ev.release || beatCam.release;
    const local = t - (ev.start ?? t);
    let val = 0;
    if (local < 0) {
      val = 0;
    } else if (local < attack) {
      val = easeBeatCamera(local / attack);
    } else if (local < attack + hold) {
      val = 1;
    } else if (local < attack + hold + release) {
      val = 1 - easeBeatCamera((local - attack - hold) / release);
    } else {
      beatCam.events.splice(i, 1);
      continue;
    }
    const evPunch = val * ev.amp;
    punch = Math.max(punch, evPunch);
    if (evPunch > leadPunch) {
      leadEvent = ev;
      leadPunch = evPunch;
      leadVal = val;
    }
  }

  if (leadEvent) {
    const sign = Math.sin(leadEvent.phase) >= 0 ? 1 : -1;
    const snapFlick = 1 - clamp01((leadVal - 0.25) / 0.75);
    const combo = leadEvent.combo;
    if (combo === 'downbeat') {
      radiusKick = leadPunch * leadEvent.zoomAmp;
      phiKick = -leadPunch * 0.0032;
    } else if (combo === 'push') {
      radiusKick = leadPunch * leadEvent.zoomAmp * 0.72;
      phiKick = -leadPunch * 0.0014;
    } else if (combo === 'drop') {
      radiusKick = leadPunch * leadEvent.zoomAmp * 0.46;
      phiKick = leadPunch * leadEvent.phiAmp * 0.92;
    } else if (combo === 'rebound') {
      radiusKick = leadPunch * leadEvent.zoomAmp * 0.3;
      phiKick = -leadPunch * leadEvent.phiAmp * 0.22;
    } else if (combo === 'accent') {
      radiusKick = leadPunch * leadEvent.zoomAmp * 0.9;
      phiKick = -leadPunch * 0.0022;
      rollKick = sign * leadPunch * (leadEvent.rollAmp || 0) * (0.45 + snapFlick * 0.3);
    } else if (leadEvent.mode === 'deep') {
      radiusKick = leadPunch * leadEvent.zoomAmp;
      phiKick = -leadPunch * 0.003;
    }
    thetaKick += sign * leadPunch * (leadEvent.thetaAmp || 0.0012) * (0.7 + (leadEvent.mass || 0) * 0.65);
    if (leadEvent.mode === 'snap' || combo === 'accent') {
      rollKick += sign * leadPunch * (leadEvent.rollAmp || 0.003) * (0.52 + snapFlick * 0.34);
    }
  }

  beatCam.punch += (punch - beatCam.punch) * (punch > beatCam.punch ? 0.72 : 0.38);
  beatCam.thetaKick +=
    (thetaKick - beatCam.thetaKick) *
    (Math.abs(thetaKick) > Math.abs(beatCam.thetaKick) ? 0.7 : 0.36);
  beatCam.phiKick +=
    (phiKick - beatCam.phiKick) * (Math.abs(phiKick) > Math.abs(beatCam.phiKick) ? 0.7 : 0.36);
  beatCam.radiusKick += (radiusKick - beatCam.radiusKick) * (radiusKick > beatCam.radiusKick ? 0.72 : 0.34);
  beatCam.rollKick +=
    (rollKick - beatCam.rollKick) *
    (Math.abs(rollKick) > Math.abs(beatCam.rollKick) ? 0.72 : 0.38);

  return {
    punch: beatCam.punch,
    thetaKick: beatCam.thetaKick,
    phiKick: beatCam.phiKick,
    radiusKick: beatCam.radiusKick,
    rollKick: beatCam.rollKick,
  };
}

/** 读取当前鼓点镜头 kick（由 GalaxyCameraRig 每帧 tick） */
export function getGalaxyBeatCameraKick(): BeatCameraKick {
  return {
    punch: beatCam.punch,
    thetaKick: beatCam.thetaKick,
    phiKick: beatCam.phiKick,
    radiusKick: beatCam.radiusKick,
    rollKick: beatCam.rollKick,
  };
}

/** 空闲呼吸 + 鼓点 kick 合成镜头偏移 */
export function applyGalaxyCinemaOffset(
  base: { radius: number; phi: number; theta: number },
  cinemaT: number,
  kick: BeatCameraKick,
  cinemaShake: number,
): { radius: number; phi: number; theta: number; roll: number; fovPunch: number } {
  const shake = clampRange(cinemaShake, 0, 1.8);
  const beatDamp = shake;
  const idleDamp = shake;

  const cineTheta = Math.sin(cinemaT * 0.08) * 0.012 * idleDamp + kick.thetaKick * beatDamp;
  const cinePhi = Math.sin(cinemaT * 0.06 + 1) * 0.01 * idleDamp + kick.phiKick * beatDamp;
  const cineRadius = Math.sin(cinemaT * 0.04 + 2) * 0.08 * idleDamp - kick.radiusKick * beatDamp * 1.18;

  const fovPunch = Math.max(0, kick.punch * 0.54 + kick.radiusKick * 0.16) * shake;

  return {
    radius: base.radius + cineRadius,
    phi: base.phi + cinePhi,
    theta: base.theta + cineTheta,
    roll: kick.rollKick * shake,
    fovPunch,
  };
}
