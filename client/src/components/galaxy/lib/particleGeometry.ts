import * as THREE from 'three';
import { normalizeCoverResolution } from '../../../lib/roomVisualPreset';
import type { RoomVisualFxSettings } from '../../../lib/roomVisualPreset';

export const PLANE_SIZE = 4.8;

/** Mineradio coverParticleGridForResolution */
export function coverParticleGridForResolution(value: number): number {
  let grid = Math.round(118 * normalizeCoverResolution(value));
  grid = Math.max(88, Math.min(183, grid));
  return grid % 2 ? grid : grid + 1;
}

export type GalaxyPerformanceQuality = RoomVisualFxSettings['performanceQuality'];

/** 主封面网格按画质封顶,与 topography 的 QUALITY_GRID_CAP 治理思路一致 */
export const GALAXY_GRID_CAP: Record<GalaxyPerformanceQuality, number> = {
  eco: 183,
  balanced: 183,
  high: 183,
  ultra: 183,
};

/** 浮层 / 背景粒子的 drawRange 缩放系数,默认(均衡)即偏轻 */
export const GALAXY_LAYER_COUNT_SCALE: Record<GalaxyPerformanceQuality, number> = {
  eco: 0.5,
  balanced: 0.76,
  high: 1,
  ultra: 1.16,
};

/** 分辨率派生网格后再按画质封顶,结果保持奇数(与 buildGalaxyParticleGeometry 约定一致) */
export function galaxyParticleGridForQuality(
  value: number,
  quality: GalaxyPerformanceQuality = 'balanced',
): number {
  const base = coverParticleGridForResolution(value);
  const cap = GALAXY_GRID_CAP[quality] ?? GALAXY_GRID_CAP.balanced;
  let grid = Math.min(base, cap);
  if (grid % 2 === 0) grid -= 1;
  return Math.max(87, grid);
}

export function buildGalaxyParticleGeometry(
  grid = coverParticleGridForResolution(1.55),
): THREE.BufferGeometry {
  const count = grid * grid;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const rand = new Float32Array(count);
  const texelStep = 1 / grid;

  for (let i = 0; i < count; i++) {
    const gx = i % grid;
    const gy = Math.floor(i / grid);
    const u = (gx + 0.5) * texelStep;
    const v = (gy + 0.5) * texelStep;
    const px = gx / (grid - 1);
    const py = gy / (grid - 1);
    positions[i * 3] = (px - 0.5) * PLANE_SIZE;
    positions[i * 3 + 1] = (py - 0.5) * PLANE_SIZE;
    positions[i * 3 + 2] = 0;
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
    rand[i] = Math.random();
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aUv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  geo.userData.grid = grid;
  return geo;
}
