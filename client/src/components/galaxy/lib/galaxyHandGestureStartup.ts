/** 手势开启进度（轻量模块，不依赖 MediaPipe，可供设置面板订阅） */

export type GestureStartupPhase =
  | 'idle'
  | 'loading-model'
  | 'requesting-camera'
  | 'starting'
  | 'ready';

export const galaxyHandGestureStartup = {
  phase: 'idle' as GestureStartupPhase,
  progress: 0,
  label: '',
};

const listeners = new Set<() => void>();

export function subscribeGalaxyHandGestureStartup(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isGalaxyHandGestureStarting(): boolean {
  const phase = galaxyHandGestureStartup.phase;
  return phase === 'loading-model' || phase === 'requesting-camera' || phase === 'starting';
}

export function setGalaxyHandGestureStartup(
  phase: GestureStartupPhase,
  progress: number,
  label = '',
): void {
  galaxyHandGestureStartup.phase = phase;
  galaxyHandGestureStartup.progress = Math.min(1, Math.max(0, progress));
  galaxyHandGestureStartup.label = label;
  listeners.forEach((listener) => listener());
}

export function clearGalaxyHandGestureStartup(): void {
  setGalaxyHandGestureStartup('idle', 0, '');
}
