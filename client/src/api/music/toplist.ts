import type { HotSongItem, SearchResult } from '../../types';
import { fetchWithTimeout } from '../http';

export type HotRankSource = 'netease' | 'platform';

export interface NeteaseToplistResult {
  id: string;
  name: string;
  songs: SearchResult[];
}

const PLATFORM_HOT_CACHE_TTL_MS = 30_000;
const platformHotCache = new Map<number, { data: HotSongItem[]; expires: number }>();
const platformHotInflight = new Map<number, Promise<HotSongItem[]>>();

export async function getPlatformHotSongs(limit = 30): Promise<HotSongItem[]> {
  const now = Date.now();
  const cached = platformHotCache.get(limit);
  if (cached && cached.expires > now) return cached.data;

  const inflight = platformHotInflight.get(limit);
  if (inflight) return inflight;

  const promise = (async () => {
    const res = await fetchWithTimeout(`/api/music/hot?limit=${limit}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || '获取热榜失败');
    }
    const data: HotSongItem[] = await res.json();
    platformHotCache.set(limit, { data, expires: Date.now() + PLATFORM_HOT_CACHE_TTL_MS });
    return data;
  })().finally(() => {
    platformHotInflight.delete(limit);
  });

  platformHotInflight.set(limit, promise);
  return promise;
}

const STORAGE_KEY = 'openmusic:netease-hot-toplist:v1';
/** 与服务端一致：东八区自然日换桶，一天最多拉一次 */
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type CacheEntry = {
  bucket: string;
  limit: number;
  data: NeteaseToplistResult;
};

let memoryCache: CacheEntry | null = null;
let inflight: Promise<NeteaseToplistResult> | null = null;

function chinaDayBucket(now = Date.now()): string {
  return String(Math.floor((now + TZ_OFFSET_MS) / DAY_MS));
}

function readPersistedCache(limit: number): CacheEntry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.data?.songs || !Array.isArray(parsed.data.songs)) return null;
    if (parsed.bucket !== chinaDayBucket()) return null;
    if (Number(parsed.limit) < limit) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedCache(entry: CacheEntry) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // quota / private mode
  }
}

function getFreshCache(limit: number): CacheEntry | null {
  const bucket = chinaDayBucket();
  if (memoryCache?.bucket === bucket && memoryCache.limit >= limit) {
    return memoryCache;
  }
  const persisted = readPersistedCache(limit);
  if (persisted) {
    memoryCache = persisted;
    return persisted;
  }
  return null;
}

// 模块加载时先把 localStorage 灌进内存，进房首帧即可命中
getFreshCache(200);

async function fetchNeteaseHotToplist(limit: number): Promise<NeteaseToplistResult> {
  const res = await fetchWithTimeout(`/api/music/toplist/netease?limit=${limit}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || '获取热榜失败');
  }
  return res.json();
}

/** 同步读取当日缓存（有则立刻渲染，避免进房再转圈） */
export function peekNeteaseHotToplist(limit = 200): NeteaseToplistResult | null {
  return getFreshCache(limit)?.data ?? null;
}

export async function getNeteaseHotToplist(limit = 200): Promise<NeteaseToplistResult> {
  const cached = getFreshCache(limit);
  if (cached) {
    return limit < cached.data.songs.length
      ? { ...cached.data, songs: cached.data.songs.slice(0, limit) }
      : cached.data;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const data = await fetchNeteaseHotToplist(limit);
      const entry: CacheEntry = {
        bucket: chinaDayBucket(),
        limit,
        data,
      };
      memoryCache = entry;
      writePersistedCache(entry);
      return data;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
