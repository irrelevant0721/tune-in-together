const CLIENT_ID_KEY = 'openmusic_client_id';

function createClientId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const random = Math.random().toString(36).slice(2, 14);
  return `${Date.now().toString(36)}-${random}`;
}

function isValidClientId(value: string | null | undefined): value is string {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(String(value || '').trim());
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage may be unavailable.
  }
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage may be unavailable.
  }
}

let cachedClientId: string | null = null;

function persistClientId(clientId: string): void {
  cachedClientId = clientId;
  writeStorage(CLIENT_ID_KEY, clientId);
}

/** 本地缓存的用户 ID（公开标识）；身份令牌仅存 HttpOnly Cookie，JS 不可读 */
export function getClientId(): string {
  if (cachedClientId) return cachedClientId;

  const existing = readStorage(CLIENT_ID_KEY);
  if (isValidClientId(existing)) {
    persistClientId(existing);
    return existing;
  }

  const next = createClientId();
  persistClientId(next);
  return next;
}

export function rememberClientId(clientId: string): void {
  if (!isValidClientId(clientId)) return;
  persistClientId(clientId);
}

export function rememberClientIdentity(clientId?: string): void {
  if (clientId) rememberClientId(clientId);
}
