/**
 * 房间后台保活：降低页签被节流 / 冻结后「源异常不切歌、状态卡住」的概率。
 *
 * 分层：
 * 1. Web Lock —— 降低 Chrome Energy Saver 整页 freeze
 * 2. Screen Wake Lock —— 有限缓解息屏（失败忽略）
 * 3. 业务定时 —— 由 workerTimer 负责（见 createWorkerInterval）
 *
 * 无法真正关闭浏览器节流；在房开启，离房关闭。
 */

import { isWorkerTimerAlive } from './workerTimer';

const LOCK_NAME = 'openmusic-room-keepalive';

let desiredActive = false;
let lockAbort: AbortController | null = null;
let lockHeld = false;
let wakeLock: WakeLockSentinel | null = null;
let wakeLockListenersInstalled = false;

async function acquireWebLock(): Promise<void> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks?.request) return;

  releaseWebLock();
  const ac = new AbortController();
  lockAbort = ac;

  try {
    await locks.request(LOCK_NAME, { signal: ac.signal }, async () => {
      lockHeld = true;
      await new Promise<void>((resolve) => {
        const onAbort = () => {
          lockHeld = false;
          resolve();
        };
        if (ac.signal.aborted) {
          onAbort();
          return;
        }
        ac.signal.addEventListener('abort', onAbort, { once: true });
      });
    });
  } catch {
    lockHeld = false;
  } finally {
    if (lockAbort === ac) {
      lockHeld = false;
    }
  }
}

function releaseWebLock(): void {
  const ac = lockAbort;
  lockAbort = null;
  lockHeld = false;
  try {
    ac?.abort();
  } catch {
    // ignore
  }
}

async function acquireWakeLock(): Promise<void> {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      if (wakeLock) wakeLock = null;
    });
  } catch {
    wakeLock = null;
  }
}

async function releaseWakeLock(): Promise<void> {
  const lock = wakeLock;
  wakeLock = null;
  if (!lock) return;
  try {
    await lock.release();
  } catch {
    // ignore
  }
}

function installWakeLockVisibilityListener(): void {
  if (wakeLockListenersInstalled || typeof document === 'undefined') return;
  wakeLockListenersInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (!desiredActive || document.hidden) return;
    void acquireWakeLock();
  });
}

/** 在房时开启；离开房间关闭 */
export function setBackgroundKeepaliveActive(active: boolean): void {
  desiredActive = active;
  installWakeLockVisibilityListener();

  if (active) {
    void acquireWebLock();
    void acquireWakeLock();
    return;
  }

  releaseWebLock();
  void releaseWakeLock();
}

export function getBackgroundKeepaliveDebug(): {
  active: boolean;
  webLockHeld: boolean;
  workerAlive: boolean;
  wakeLockHeld: boolean;
} {
  return {
    active: desiredActive,
    webLockHeld: lockHeld,
    workerAlive: isWorkerTimerAlive(),
    wakeLockHeld: Boolean(wakeLock && !wakeLock.released),
  };
}
