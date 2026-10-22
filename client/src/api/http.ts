import { buildApiSignHeaders, canonicalApiQuery, needsApiSign } from '../lib/apiSign';
import { ensureSessionBootstrap } from '../lib/sessionBootstrap';
import { detectSiteAccessBlockResponse, isSiteAccessBlocked, markSiteAccessBlocked, getSiteAccessBlockCode } from '../lib/siteAccessGate';
import { readSoftBlockCodeFromResponse, softBlockMessage, SOFT_BLOCK_CODES } from '../lib/softBlock';

const DEFAULT_TIMEOUT_MS = 10000;

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function isSameOriginApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    if (!parsed.pathname.startsWith('/api/')) return false;
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

function mergeHeaders(
  base: Record<string, string>,
  extra?: HeadersInit,
): HeadersInit {
  if (!extra) return base;
  const merged = new Headers(extra);
  for (const [key, value] of Object.entries(base)) {
    merged.set(key, value);
  }
  return merged;
}

function blockedSyntheticResponse(): Response {
  const code = getSiteAccessBlockCode() || SOFT_BLOCK_CODES.SITE_BAN;
  // 本地短路：不发网络请求。DevTools 里看起来像接口返回，实为前端冻结后的假响应。
  return new Response(
    JSON.stringify({
      error: softBlockMessage(code),
      code,
      local: true,
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-OpenMusic-Site-Blocked': '1',
        'X-OpenMusic-Block-Code': code,
        'X-OpenMusic-Block-Local': '1',
      },
    },
  );
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  if (isSiteAccessBlocked()) {
    return blockedSyntheticResponse();
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = init.signal;
  const abortFromCaller = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  else externalSignal?.addEventListener('abort', abortFromCaller, { once: true });

  const url = resolveRequestUrl(input);
  const sameOriginApi = isSameOriginApiUrl(url);

  // 仅同源 /api 默认带 Cookie；外链（如七牛上传）绝不能 credentials:include，否则 CORS 直接 Failed to fetch
  const initFinal: RequestInit = { ...init };
  if (sameOriginApi && initFinal.credentials === undefined) {
    initFinal.credentials = 'include';
  }

  const method = (init.method || 'GET').toUpperCase();
  if (needsApiSign(url, method) && sameOriginApi) {
    await ensureSessionBootstrap();
    if (isSiteAccessBlocked()) {
      window.clearTimeout(timer);
      externalSignal?.removeEventListener('abort', abortFromCaller);
      return blockedSyntheticResponse();
    }
    const parsed = new URL(url, window.location.origin);
    const body = typeof init.body === 'string' ? init.body : '';
    const signHeaders = await buildApiSignHeaders(
      method,
      parsed.pathname,
      canonicalApiQuery(parsed.searchParams),
      body,
    );
    initFinal.headers = mergeHeaders(signHeaders, init.headers);
  }

  try {
    const res = await fetch(input, { ...initFinal, signal: controller.signal });
    if (sameOriginApi && detectSiteAccessBlockResponse(res)) {
      markSiteAccessBlocked(readSoftBlockCodeFromResponse(res) || SOFT_BLOCK_CODES.SITE_BAN);
    }
    return res;
  } finally {
    window.clearTimeout(timer);
    externalSignal?.removeEventListener('abort', abortFromCaller);
  }
}
