import { useEffect, useState } from 'react';
import { buildApiSignHeaders, canonicalApiQuery, isMediaApiPath, needsApiSign } from './apiSign';
import { ensureSessionBootstrap } from './sessionBootstrap';

const SIGN_QUERY_KEYS = ['om_ts', 'om_nonce', 'om_sign'] as const;
/** 低于服务端媒体签名窗口（默认 20 分钟），刷新后同图可继续命中浏览器缓存 */
const MEDIA_SIGN_REUSE_SEC = 15 * 60;
const MEDIA_SIGN_STORAGE_KEY = 'om_media_sign_v1';
const MAX_MEDIA_SIGN_CACHE = 200;

type MediaSignEntry = { signed: string; expiresAt: number };

const mediaSignMemory = new Map<string, MediaSignEntry>();
const mediaSignInflight = new Map<string, Promise<string>>();

/**
 * 去掉已有签名参数。
 * - 同源 /api 相对路径：返回 pathname+search
 * - 外链（网易 CDN 等）：原样返回，绝不能裁掉 origin
 */
export function stripApiSignParams(url: string): string {
  if (!url) return url;
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(url, origin);
    const hadSign = SIGN_QUERY_KEYS.some((key) => parsed.searchParams.has(key));
    for (const key of SIGN_QUERY_KEYS) parsed.searchParams.delete(key);

    // 外链或非 /api：保留完整绝对地址（或原样）
    if (parsed.origin !== origin || !parsed.pathname.startsWith('/api/')) {
      if (!hadSign && /^https?:\/\//i.test(url)) return url;
      return parsed.href;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

function readMediaSignStorage(): Record<string, MediaSignEntry> {
  if (typeof sessionStorage === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(MEDIA_SIGN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MediaSignEntry>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMediaSignStorage(entries: Record<string, MediaSignEntry>) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(MEDIA_SIGN_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // quota / private mode：忽略即可，内存缓存仍有效
  }
}

function getCachedMediaSign(cacheKey: string): string | null {
  const now = Date.now();
  const mem = mediaSignMemory.get(cacheKey);
  if (mem && mem.expiresAt > now) return mem.signed;

  const stored = readMediaSignStorage()[cacheKey];
  if (stored && stored.expiresAt > now && typeof stored.signed === 'string') {
    mediaSignMemory.set(cacheKey, stored);
    return stored.signed;
  }
  return null;
}

function setCachedMediaSign(cacheKey: string, signed: string) {
  const entry: MediaSignEntry = {
    signed,
    expiresAt: Date.now() + MEDIA_SIGN_REUSE_SEC * 1000,
  };
  mediaSignMemory.delete(cacheKey);
  mediaSignMemory.set(cacheKey, entry);
  while (mediaSignMemory.size > MAX_MEDIA_SIGN_CACHE) {
    const oldest = mediaSignMemory.keys().next().value;
    if (!oldest) break;
    mediaSignMemory.delete(oldest);
  }

  const stored = readMediaSignStorage();
  stored[cacheKey] = entry;
  const keys = Object.keys(stored);
  if (keys.length > MAX_MEDIA_SIGN_CACHE) {
    keys
      .sort((a, b) => (stored[a]?.expiresAt || 0) - (stored[b]?.expiresAt || 0))
      .slice(0, keys.length - MAX_MEDIA_SIGN_CACHE)
      .forEach((key) => {
        delete stored[key];
      });
  }
  writeMediaSignStorage(stored);
}

/**
 * 为同源 /api URL 附加 query 签名。
 * 媒体路径（封面/代理）在窗口内复用签名，避免刷新换签打穿浏览器缓存；
 * 音频等强制换发时传 force: true。
 */
export async function signApiUrl(relativeUrl: string, options?: { force?: boolean }): Promise<string> {
  if (!needsApiSign(relativeUrl)) return relativeUrl;

  const cacheKey = stripApiSignParams(relativeUrl);
  const reuseMedia = isMediaApiPath(cacheKey) && !options?.force;
  if (reuseMedia) {
    const cached = getCachedMediaSign(cacheKey);
    if (cached) return cached;
    const pending = mediaSignInflight.get(cacheKey);
    if (pending) return pending;
  }

  const request = (async () => {
    await ensureSessionBootstrap();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(cacheKey, origin);
    const query = canonicalApiQuery(parsed.searchParams);
    const headers = await buildApiSignHeaders('GET', parsed.pathname, query, '');
    if (!headers['X-OM-Sign']) return cacheKey;

    parsed.searchParams.set('om_ts', headers['X-OM-Ts']);
    parsed.searchParams.set('om_nonce', headers['X-OM-Nonce']);
    parsed.searchParams.set('om_sign', headers['X-OM-Sign']);
    const signed = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (isMediaApiPath(cacheKey)) {
      setCachedMediaSign(cacheKey, signed);
    }

    return signed;
  })();

  if (reuseMedia) {
    mediaSignInflight.set(cacheKey, request);
    void request.then(() => {
      if (mediaSignInflight.get(cacheKey) === request) mediaSignInflight.delete(cacheKey);
    }, () => {
      if (mediaSignInflight.get(cacheKey) === request) mediaSignInflight.delete(cacheKey);
    });
  }
  return request;
}

/** 强制换发新签名；非 /api 直链原样返回 */
export async function refreshSignedApiUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (!needsApiSign(url)) return url;
  return signApiUrl(url, { force: true });
}

export async function resolveSignedApiUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (!needsApiSign(url)) return url;
  return signApiUrl(url);
}

/** 为 `<img>` / `<audio>` 等同源媒体地址异步附加 query 签名 */
export function useSignedApiUrl(url: string | null | undefined): string | null {
  const target = url ?? null;
  const canonical = target ? stripApiSignParams(target) : null;
  const [state, setState] = useState<{ url: string | null; signed: string | null }>(() => ({
    url: canonical,
    signed: canonical && !needsApiSign(canonical)
      ? canonical
      : (canonical && isMediaApiPath(canonical) ? getCachedMediaSign(canonical) : null),
  }));

  useEffect(() => {
    if (!canonical) {
      setState({ url: null, signed: null });
      return;
    }
    if (!needsApiSign(canonical)) {
      setState({ url: canonical, signed: canonical });
      return;
    }

    let cancelled = false;
    void signApiUrl(canonical).then((next) => {
      if (!cancelled) setState({ url: canonical, signed: next });
    });
    return () => {
      cancelled = true;
    };
  }, [canonical]);

  // 签名是跟着具体地址走的：切歌后新签名没算出来之前交出旧签名，
  // 拿到的会是上一首的图，调用方还可能把它缓存到新歌的 key 上。
  return state.url === canonical ? state.signed : null;
}
