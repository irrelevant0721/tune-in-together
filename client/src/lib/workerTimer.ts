/**
 * 共享 Worker 定时器。
 *
 * 设计取舍（参考文章思路，按房间场景自研）：
 * - 主线程 setInterval：页签后台会被浏览器节流，甚至丢拍
 * - rAF：hidden 直接停，不适合保活
 * - 方案：单一长驻 Worker，内部用递归 setTimeout 派发 tick；多路定时器共用一个 Worker
 *
 * 回调仍在主线程执行（可碰 store / DOM）；Worker 只负责「按时叫醒」。
 */

type TimerRecord = {
  fn: () => void;
};

type WorkerOutbound =
  | { message: 'tick'; id: number }
  | { message: 'started'; id: number }
  | { message: 'cleared'; id: number };

type WorkerInbound =
  | { command: 'start'; id: number; interval: number }
  | { command: 'clear'; id: number };

const WORKER_SOURCE = `
  const timers = Object.create(null);
  const clearOne = (id) => {
    const t = timers[id];
    if (!t) return;
    clearTimeout(t.handle);
    delete timers[id];
  };
  const schedule = (id, interval) => {
    clearOne(id);
    const tick = () => {
      if (!timers[id]) return;
      self.postMessage({ message: 'tick', id });
      timers[id].handle = setTimeout(tick, timers[id].interval);
    };
    timers[id] = { interval: Math.max(4, interval | 0), handle: 0 };
    timers[id].handle = setTimeout(tick, timers[id].interval);
    self.postMessage({ message: 'started', id });
  };
  self.onmessage = (e) => {
    const data = e.data || {};
    if (data.command === 'start') schedule(data.id, data.interval);
    else if (data.command === 'clear') {
      clearOne(data.id);
      self.postMessage({ message: 'cleared', id: data.id });
    }
  };
`;

let nextId = 1;
let worker: Worker | null = null;
let workerUrl: string | null = null;
const callbacks = new Map<number, TimerRecord>();
const fallbackTimers = new Map<number, number>();

function ensureWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (worker) return worker;

  workerUrl = URL.createObjectURL(
    new Blob([WORKER_SOURCE], { type: 'application/javascript' }),
  );
  worker = new Worker(workerUrl);
  worker.onmessage = (event: MessageEvent<WorkerOutbound>) => {
    const data = event.data;
    if (!data || data.message !== 'tick') return;
    const record = callbacks.get(data.id);
    if (!record) return;
    try {
      record.fn();
    } catch {
      // ignore callback errors
    }
  };
  return worker;
}

function stopFallback(id: number): void {
  const handle = fallbackTimers.get(id);
  if (handle == null) return;
  window.clearTimeout(handle);
  fallbackTimers.delete(id);
}

function startFallback(id: number, intervalMs: number): void {
  stopFallback(id);
  const delay = Math.max(4, intervalMs);
  const loop = () => {
    if (!callbacks.has(id)) return;
    try {
      callbacks.get(id)?.fn();
    } catch {
      // ignore
    }
    fallbackTimers.set(id, window.setTimeout(loop, delay));
  };
  fallbackTimers.set(id, window.setTimeout(loop, delay));
}

/**
 * 注册一个 Worker 驱动的间隔回调。
 * @returns 取消函数
 */
export function createWorkerInterval(callback: () => void, intervalMs: number): () => void {
  const id = nextId++;
  callbacks.set(id, { fn: callback });

  const w = ensureWorker();
  if (w) {
    const msg: WorkerInbound = {
      command: 'start',
      id,
      interval: Math.max(4, intervalMs),
    };
    w.postMessage(msg);
  } else {
    startFallback(id, intervalMs);
  }

  return () => {
    callbacks.delete(id);
    stopFallback(id);
    if (worker) {
      const msg: WorkerInbound = { command: 'clear', id };
      try {
        worker.postMessage(msg);
      } catch {
        // ignore
      }
    }
    // 无订阅时回收 Worker，避免离房后空转
    if (callbacks.size === 0) {
      teardownWorker();
    }
  };
}

function teardownWorker(): void {
  if (!worker) return;
  try {
    worker.terminate();
  } catch {
    // ignore
  }
  worker = null;
  if (workerUrl) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
}

export function isWorkerTimerAlive(): boolean {
  return Boolean(worker) || fallbackTimers.size > 0;
}
