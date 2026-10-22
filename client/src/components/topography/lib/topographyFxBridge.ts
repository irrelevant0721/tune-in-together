import type { RoomVisualFxSettings } from '../../../lib/roomVisualPreset';
import {
  DEFAULT_FLOATING_BLOCK_COUNT,
  DEFAULT_FLOATING_BLOCK_INTENSITY,
  DEFAULT_FLOATING_BLOCK_MAX_SIZE,
  DEFAULT_FLOATING_BLOCK_MIN_SIZE,
  DEFAULT_FLOATING_BLOCK_SPEED,
  DEFAULT_GROUND_AMPLITUDE,
  DEFAULT_TERRAIN_DENSITY,
  defaultGroundEqBands,
  normalizeGroundEqSettings,
  type StoredGroundEqSettings,
} from './topographyGroundEq';

function clamp100(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Mineradio 控制台 → sonic 地面 EQ */
export function groundEqFromMineradioFx(fx: RoomVisualFxSettings): StoredGroundEqSettings {
  return normalizeGroundEqSettings({
    bands: defaultGroundEqBands,
    motionSpeed: clamp100(fx.speed * 50),
    amplitude: clamp100(fx.intensity * (DEFAULT_GROUND_AMPLITUDE / 0.85)),
    terrainDensity: clamp100(((fx.depth - 0.2) / 1.6) * 100) || DEFAULT_TERRAIN_DENSITY,
    floatingBlocksEnabled: fx.floatLayer !== false,
    floatingBlockIntensity: DEFAULT_FLOATING_BLOCK_INTENSITY,
    floatingBlockMinSize: DEFAULT_FLOATING_BLOCK_MIN_SIZE,
    floatingBlockMaxSize: DEFAULT_FLOATING_BLOCK_MAX_SIZE,
    floatingBlockSpeed: DEFAULT_FLOATING_BLOCK_SPEED,
    floatingBlockCount: DEFAULT_FLOATING_BLOCK_COUNT,
    enabledBands: new Array(8).fill(true),
  });
}

export function topographyRotationSpeed(fx: RoomVisualFxSettings): number {
  return 0.15 * fx.speed;
}

export function topographyCameraDistanceScale(fx: RoomVisualFxSettings): number {
  return fx.cameraDistance;
}
