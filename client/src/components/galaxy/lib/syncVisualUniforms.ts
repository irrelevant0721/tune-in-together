import type { RoomVisualFxSettings } from '../../../lib/roomVisualPreset';
import { normalizeCoverResolution } from '../../../lib/roomVisualPreset';
import * as THREE from 'three';

type UniformBag = Record<string, { value: unknown }>;

export function effectiveBloomStrength(fx: RoomVisualFxSettings): number {
  if (fx.bloomStrength <= 0.01) return 0;
  if (!fx.bloom) return 0;
  return fx.bloomStrength;
}

export function syncGalaxyFxUniforms(uniforms: UniformBag, fx: RoomVisualFxSettings): void {
  uniforms.uIntensity.value = fx.intensity;
  uniforms.uDepth.value = fx.depth;
  uniforms.uPointScale.value = fx.point;
  uniforms.uSpeed.value = fx.speed;
  uniforms.uTwist.value = fx.twist;
  uniforms.uColorBoost.value = fx.colorBoost;
  uniforms.uScatter.value = fx.scatter;
  uniforms.uCoverRes.value = normalizeCoverResolution(fx.coverResolution);
  uniforms.uBgFade.value = fx.bgFade;
  uniforms.uBloomStrength.value = effectiveBloomStrength(fx);
  uniforms.uEdgeEnabled.value = fx.edge ? 1 : 0;
  if (fx.visualTintMode === 'custom') {
    (uniforms.uTintColor.value as THREE.Color).set(fx.visualTintColor);
    uniforms.uTintStrength.value = 0.42;
  } else {
    uniforms.uTintStrength.value = 0;
  }
}
