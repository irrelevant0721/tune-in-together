export type ClientNetworkInfo = {
  ip?: string;
  location?: string;
};

const CACHE_KEY = 'openmusic:client-network-info';
/** myip 也占用同一 IP 的 uapis 月配额，跨标签缓存一天以减少消耗 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LOOKUP_TIMEOUT_MS = 2500;
const LOOKUP_URL = 'https://uapis.cn/api/v1/network/myip';

type CachedNetworkInfo = ClientNetworkInfo & {
  updatedAt: number;
};

let lookupPromise: Promise<ClientNetworkInfo> | null = null;

function cleanText(value: unknown, maxLength: number): string {
  return String(value || '').trim().slice(0, maxLength);
}

/** 「中国 广东 深圳」→「广东」或「广东 深圳」 */
function normalizeRegion(value: unknown): string {
  const parts = cleanText(value, 64)
    .replace(/^(中国|中华人民共和国)\s*/u, '')
    .split(/[\s/|]+/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part !== '中国' && part !== '中华人民共和国');

  if (parts.length === 0) return '';

  const normalizedParts = parts
    .slice(0, 2)
    .map((part) => part
      .replace(/(省|市|特别行政区|壮族自治区|回族自治区|维吾尔自治区)$/u, '')
      .trim())
    .filter(Boolean);

  const deduped = dedupeLocationParts(normalizedParts);
  const compact = deduped.join(' ');

  return compact.slice(0, 12);
}

/** 去掉相邻或完全重复的归属地片段，如「北京 北京」→「北京」 */
function dedupeLocationParts(parts: string[]): string[] {
  const deduped: string[] = [];
  for (const part of parts) {
    if (deduped.length > 0 && deduped[deduped.length - 1] === part) continue;
    deduped.push(part);
  }
  if (deduped.length > 1 && deduped.every((part) => part === deduped[0])) {
    return [deduped[0]!];
  }
  return deduped;
}

/** 展示用：兼容历史缓存里的重复归属地 */
export function formatDisplayLocation(location?: string | null): string {
  const text = cleanText(location, 64);
  if (!text) return '未知';
  const parts = text.split(/[\s/|]+/u).map((part) => part.trim()).filter(Boolean);
  const deduped = dedupeLocationParts(parts);
  return deduped.join(' ') || '未知';
}

function parseLookupResponse(data: Record<string, unknown>): ClientNetworkInfo {
  const ip = cleanText(data.ip, 64);
  const location = normalizeRegion(data.region);
  return {
    ip: ip || undefined,
    location: location || undefined,
  };
}

function readCache(): ClientNetworkInfo | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY) || sessionStorage.getItem(CACHE_KEY) || 'null';
    const cached = JSON.parse(raw) as CachedNetworkInfo | null;
    if (!cached || Date.now() - Number(cached.updatedAt || 0) >= CACHE_TTL_MS) return null;
    if (!cached.ip && !cached.location) return null;
    return { ip: cached.ip, location: cached.location };
  } catch {
    return null;
  }
}

function writeCache(info: ClientNetworkInfo): void {
  if (!info.ip && !info.location) return;
  const value = JSON.stringify({ ...info, updatedAt: Date.now() });
  try {
    localStorage.setItem(CACHE_KEY, value);
  } catch {
    try {
      sessionStorage.setItem(CACHE_KEY, value);
    } catch {
      // 隐私模式下存储可能不可用。
    }
  }
}

/**
 * 由浏览器直接查询其出口 IP 和地区（uapis），服务端不再代替客户端访问 IP 定位服务。
 * @see https://uapis.cn/api/v1/network/myip
 */
export function getClientNetworkInfo(): Promise<ClientNetworkInfo> {
  const cached = readCache();
  if (cached) return Promise.resolve(cached);
  if (lookupPromise) return lookupPromise;

  lookupPromise = (async () => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
    try {
      const response = await fetch(LOOKUP_URL, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) return {};
      const data = await response.json() as Record<string, unknown>;
      const info = parseLookupResponse(data);
      if (info.ip || info.location) {
        writeCache(info);
        return info;
      }
      return {};
    } catch {
      return {};
    } finally {
      window.clearTimeout(timer);
    }
  })().finally(() => {
    lookupPromise = null;
  });

  return lookupPromise;
}

