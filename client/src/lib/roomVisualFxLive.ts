import {
  readRoomVisualFx,
  writeRoomVisualFx,
  type RoomVisualFxSettings,
} from './roomVisualPreset';
import {
  bindStageLyricFxSource,
  recomputeStageLyricPalette,
} from './stageLyricPaletteLive';
import { applyRoomVisualAppearance } from './roomVisualAppearance';

// 动态 import：这个模块被 16+ 个文件（星河/声波地形/普通房间 UI 都在内）共享引用，
// 不能静态依赖 galaxyHandGesture.ts —— 它牵着 @mediapipe/tasks-vision（手势识别）和
// three.js，静态引入会把这坨体积打进所有引用方共享的 chunk，包括压根不用星河模式、
// 不用摄像头手势的用户。cameraInteraction 切换本来就是低频操作，按需加载即可。
function syncGalaxyHandGestureMode(mode: 'off' | 'gesture'): Promise<void> {
  return import('../components/galaxy/lib/galaxyHandGesture').then((mod) => mod.syncGalaxyHandGestureMode(mode));
}

const fxListeners = new Set<() => void>();

/** 供 R3F useFrame 同步读取，绕过 Canvas 外 React 更新延迟 */
export const roomVisualFxLive: { current: RoomVisualFxSettings } = {
  current: readRoomVisualFx(),
};

bindStageLyricFxSource(() => roomVisualFxLive.current);
recomputeStageLyricPalette();
applyRoomVisualAppearance(roomVisualFxLive.current);

export function subscribeRoomVisualFx(listener: () => void): () => void {
  fxListeners.add(listener);
  return () => {
    fxListeners.delete(listener);
  };
}

function notifyFxListeners(): void {
  fxListeners.forEach((listener) => listener());
}

function afterFxCommit(next: RoomVisualFxSettings, prev: RoomVisualFxSettings): void {
  applyRoomVisualAppearance(next);
  if (next.cameraInteraction !== prev.cameraInteraction) {
    void syncGalaxyHandGestureMode(next.cameraInteraction);
  }
}

export function commitRoomVisualFx(next: RoomVisualFxSettings): RoomVisualFxSettings {
  const prev = roomVisualFxLive.current;
  roomVisualFxLive.current = next;
  writeRoomVisualFx(next);
  recomputeStageLyricPalette();
  afterFxCommit(next, prev);
  notifyFxListeners();
  return next;
}

export function patchRoomVisualFx(patch: Partial<RoomVisualFxSettings>): RoomVisualFxSettings {
  return commitRoomVisualFx({ ...roomVisualFxLive.current, ...patch });
}
