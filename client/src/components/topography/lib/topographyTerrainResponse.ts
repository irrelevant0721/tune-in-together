import { DEFAULT_GROUND_EQ_VALUE, readGroundEqBandValue, type GroundEqBandId } from './topographyGroundEq';

const MAX_KICK_DEFORM = 0.75;
const KICK_IMPULSE_GAIN = 0.35;
const KICK_TARGET_DECAY_RATE = 10;
const KICK_CURRENT_RESPONSE_RATE = 18;
const MAX_SHADER_SUB_BASS = 1.2;
const MAX_SHADER_BASS = 1.15;
const KICK_SUB_BASS_GAIN = 1.28;
const KICK_BASS_GAIN = 1.15;
const BASE_SUB_BASS_GAIN = 0.22;
const BASE_BASS_GAIN = 0.2;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function applyLowBandValue(value: number, bands: number[], band: GroundEqBandId, max: number) {
  const eq = readGroundEqBandValue(bands, band);
  const delta = (eq - DEFAULT_GROUND_EQ_VALUE) / DEFAULT_GROUND_EQ_VALUE;

  if (delta >= 0) {
    return clamp(value * (1 + delta * 1.8), 0, max);
  }

  const dullness = Math.abs(delta);
  return clamp(Math.max(0, value - dullness * 0.35) * (1 - dullness * 0.35), 0, max);
}

export function clampAnimationBlend(value: number) {
  return clamp(Number.isFinite(value) ? value : 0, 0, 1);
}

export function applyKickImpulse(currentTarget: number, strength: number) {
  const safeTarget = Number.isFinite(currentTarget) ? currentTarget : 0;
  const safeStrength = Number.isFinite(strength) ? Math.max(0, strength) : 0;
  return clamp(safeTarget + safeStrength * KICK_IMPULSE_GAIN, 0, MAX_KICK_DEFORM);
}

export function stepKickDeform({
  current,
  target,
  delta,
}: {
  current: number;
  target: number;
  delta: number;
}) {
  const safeDelta = Math.max(0, Number.isFinite(delta) ? delta : 0);
  const targetBlend = clampAnimationBlend(KICK_TARGET_DECAY_RATE * safeDelta);
  const currentBlend = clampAnimationBlend(KICK_CURRENT_RESPONSE_RATE * safeDelta);
  const nextTarget = clamp(target + (0 - target) * targetBlend, 0, MAX_KICK_DEFORM);
  const nextCurrent = clamp(current + (nextTarget - current) * currentBlend, 0, MAX_KICK_DEFORM);

  return { current: nextCurrent, target: nextTarget };
}

export function mixKickIntoLowBands({
  subBass,
  bass,
  kickDeform,
}: {
  subBass: number;
  bass: number;
  kickDeform: number;
}) {
  const safeKick = clamp(Number.isFinite(kickDeform) ? kickDeform : 0, 0, MAX_KICK_DEFORM);

  return {
    subBass: clamp(subBass + safeKick * 0.55, 0, MAX_SHADER_SUB_BASS),
    bass: clamp(bass + safeKick * 0.35, 0, MAX_SHADER_BASS),
  };
}

export function deriveKickFollowLowBands({
  kickEnvelope,
  subBassEnergy,
  bassEnergy,
  bands,
  enabledBands,
}: {
  kickEnvelope: number;
  subBassEnergy: number;
  bassEnergy: number;
  bands: number[];
  enabledBands: boolean[];
}) {
  const safeKick = clamp(Number.isFinite(kickEnvelope) ? kickEnvelope : 0, 0, MAX_KICK_DEFORM);
  const normalizedKick = safeKick / MAX_KICK_DEFORM;
  const safeSubBassEnergy = clamp(Number.isFinite(subBassEnergy) ? subBassEnergy : 0, 0, 1);
  const safeBassEnergy = clamp(Number.isFinite(bassEnergy) ? bassEnergy : 0, 0, 1);
  const subBassInput = safeSubBassEnergy * BASE_SUB_BASS_GAIN + normalizedKick * KICK_SUB_BASS_GAIN;
  const bassInput = safeBassEnergy * BASE_BASS_GAIN + normalizedKick * KICK_BASS_GAIN;

  const subBass = enabledBands[0]
    ? applyLowBandValue(subBassInput, bands, 'subBass', MAX_SHADER_SUB_BASS)
    : 0;
  const bass = enabledBands[1]
    ? applyLowBandValue(bassInput, bands, 'bass', MAX_SHADER_BASS)
    : 0;

  return {
    subBass: clamp(subBass, 0, MAX_SHADER_SUB_BASS),
    bass: clamp(bass, 0, MAX_SHADER_BASS),
  };
}
