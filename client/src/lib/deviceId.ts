const DEVICE_ID_KEY = 'openmusic_device_id';

function createDeviceId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const random = Math.random().toString(36).slice(2, 14);
  return `d-${Date.now().toString(36)}-${random}`;
}

function isValidDeviceId(value: string | null | undefined): value is string {
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

let cachedDeviceId: string | null = null;

function persistDeviceId(deviceId: string): void {
  cachedDeviceId = deviceId;
  writeStorage(DEVICE_ID_KEY, deviceId);
}

/**
 * 本机辅助设备 ID（localStorage + sessionStorage）。
 * 账号恢复仅依赖服务端 HttpOnly `openmusic_did` Cookie；此处不可单独领回身份。
 * 已有合法会话时，bootstrap 仍可用 body 携带此 ID 做设备绑定对齐。
 */
export function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;

  const existing = readStorage(DEVICE_ID_KEY);
  if (isValidDeviceId(existing)) {
    persistDeviceId(existing);
    return existing;
  }

  const next = createDeviceId();
  persistDeviceId(next);
  return next;
}

export function rememberDeviceId(deviceId: string): void {
  if (!isValidDeviceId(deviceId)) return;
  persistDeviceId(deviceId);
}
