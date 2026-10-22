type IdleWindow = Window & {
  requestIdleCallback?: (cb: IdleRequestCallback, opts?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Mineradio scheduleVisualApply：把切歌时的重活（边缘深度图、取色、染色）
 * 推到空闲帧再跑，避免和纹理换绑挤在同一帧里拉出一个长帧。
 * 返回取消函数。
 */
export function scheduleVisualApply(
  fn: () => void,
  delayMs = 0,
  timeoutMs = 360,
): () => void {
  let cancelled = false;
  let idleId = 0;
  let rafId = 0;

  const win = window as IdleWindow;
  const timer = window.setTimeout(() => {
    if (cancelled) return;
    // 页面不可见时 rAF 不会触发，直接跑掉，否则任务会一直挂着
    if (document.hidden) {
      fn();
      return;
    }
    const run = () => {
      rafId = requestAnimationFrame(() => {
        if (!cancelled) fn();
      });
    };
    if (typeof win.requestIdleCallback === 'function') {
      idleId = win.requestIdleCallback(run, { timeout: timeoutMs });
    } else {
      run();
    }
  }, Math.max(0, delayMs));

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    if (idleId && typeof win.cancelIdleCallback === 'function') win.cancelIdleCallback(idleId);
    if (rafId) cancelAnimationFrame(rafId);
  };
}
