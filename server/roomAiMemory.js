/**
 * AI 辅助模块内存与并发护栏（基础设施上限，非业务行为写死）。
 */

/** @typedef {{ value: unknown, expiresAt: number, lastAccess: number }} CacheSlot */

export class BoundedTTLMap {
  /**
   * @param {{ maxEntries?: number, ttlMs?: number, name?: string }} [options]
   */
  constructor(options = {}) {
    this.maxEntries = Math.max(16, Number(options.maxEntries) || 512);
    this.ttlMs = Math.max(60_000, Number(options.ttlMs) || 45 * 60 * 1000);
    this.name = String(options.name || 'cache');
    /** @type {Map<string, CacheSlot>} */
    this.map = new Map();
  }

  prune(now = Date.now()) {
    for (const [key, slot] of this.map) {
      if (slot.expiresAt <= now) this.map.delete(key);
    }
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  get(key) {
    const slot = this.map.get(key);
    if (!slot) return undefined;
    const now = Date.now();
    if (slot.expiresAt <= now) {
      this.map.delete(key);
      return undefined;
    }
    slot.lastAccess = now;
    return slot.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    const now = Date.now();
    this.map.set(key, {
      value,
      expiresAt: now + Math.max(30_000, ttlMs),
      lastAccess: now,
    });
    this.prune(now);
  }

  delete(key) {
    this.map.delete(key);
  }

  get size() {
    return this.map.size;
  }
}

/**
 * 限制并行 AI 轻量调用，避免高峰堆爆内存/API。
 * @param {{ maxConcurrent?: number, maxQueued?: number, name?: string }} [options]
 */
export function createAiTaskQueue(options = {}) {
  const maxConcurrent = Math.max(1, Number(options.maxConcurrent) || 4);
  const maxQueued = Math.max(8, Number(options.maxQueued) || 48);
  const name = String(options.name || 'ai-queue');
  let active = 0;
  /** @type {Array<{ run: () => Promise<unknown>, resolve: (v: unknown) => void, reject: (e: unknown) => void }>} */
  const queue = [];

  function pump() {
    while (active < maxConcurrent && queue.length > 0) {
      const job = queue.shift();
      if (!job) break;
      active += 1;
      Promise.resolve()
        .then(() => job.run())
        .then(job.resolve, job.reject)
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  }

  /**
   * @template T
   * @param {() => Promise<T>} run
   * @returns {Promise<T|null>} 队列满时丢弃并返回 null
   */
  function enqueue(run) {
    if (typeof run !== 'function') return Promise.resolve(null);
    if (queue.length >= maxQueued) {
      console.warn(`[room-ai] ${name} queue full (${maxQueued}), drop task`);
      return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
      queue.push({ run, resolve, reject });
      pump();
    });
  }

  return {
    enqueue,
    stats: () => ({ active, queued: queue.length, name }),
  };
}

/** 房间活跃度 / 用户状态等 Map 的最大条目（超出删最旧） */
export function trimMapByUpdatedAt(map, maxEntries, getUpdatedAt = (v) => v?.updatedAt || 0) {
  if (!map || map.size <= maxEntries) return;
  const entries = [...map.entries()].sort((a, b) => (getUpdatedAt(a[1]) || 0) - (getUpdatedAt(b[1]) || 0));
  const drop = entries.length - maxEntries;
  for (let i = 0; i < drop; i += 1) {
    map.delete(entries[i][0]);
  }
}
