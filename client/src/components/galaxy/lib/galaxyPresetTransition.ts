import type { RoomVisualPresetId } from '../../../lib/roomVisualPreset';
import type { RoomVisualFxSettings } from '../../../lib/roomVisualPreset';

export interface PresetTransitionState {
  active: boolean;
  start: number;
  duration: number;
  from: RoomVisualPresetId;
  to: RoomVisualPresetId;
}

export function createPresetTransitionState(): PresetTransitionState {
  return { active: false, start: 0, duration: 0.24, from: 0, to: 0 };
}

/** Mineradio triggerPresetParticleTransition */
export function startPresetParticleTransition(
  state: PresetTransitionState,
  fromPreset: RoomVisualPresetId,
  toPreset: RoomVisualPresetId,
  time: number,
  uniforms: {
    uScatter: { value: number };
    uBurstAmt: { value: number };
  },
  fx: RoomVisualFxSettings,
): number {
  state.active = true;
  state.start = time;
  state.duration = toPreset === 5 ? 0.3 : 0.24;
  state.from = fromPreset;
  state.to = toPreset;

  const newVisual = toPreset >= 4;
  const wallpaperFlow = toPreset === 5;
  uniforms.uScatter.value = Math.max(
    uniforms.uScatter.value,
    fx.scatter + (newVisual ? (wallpaperFlow ? 0.008 : 0.024) : 0.12),
  );
  const burst = wallpaperFlow ? 0.05 : 0.15;
  uniforms.uBurstAmt.value = Math.max(uniforms.uBurstAmt.value, burst);
  return burst;
}

/** Mineradio tickPresetTransition */
export function tickPresetParticleTransition(
  state: PresetTransitionState,
  time: number,
  uniforms: {
    uScatter: { value: number };
    uBurstAmt: { value: number };
    uPointScale: { value: number };
  },
  fx: RoomVisualFxSettings,
): void {
  if (!state.active) return;

  const raw = (time - state.start) / state.duration;
  const t = Math.max(0, Math.min(1, raw));
  const wave = Math.sin(t * Math.PI);
  const newVisual = state.to >= 4;
  const wallpaperFlow = state.to === 5;

  uniforms.uScatter.value = Math.max(
    uniforms.uScatter.value,
    fx.scatter + wave * (newVisual ? (wallpaperFlow ? 0.008 : 0.026) : 0.16),
  );
  uniforms.uBurstAmt.value = Math.max(
    uniforms.uBurstAmt.value,
    wave * (wallpaperFlow ? 0.045 : newVisual ? 0.12 : 0.15),
  );
  uniforms.uPointScale.value = fx.point * (1 + wave * (wallpaperFlow ? 0.016 : 0.048));

  if (raw >= 1) {
    state.active = false;
    uniforms.uPointScale.value = fx.point;
  }
}
