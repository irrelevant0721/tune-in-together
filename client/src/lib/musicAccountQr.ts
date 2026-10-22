export type MusicAccountPlatform = 'netease' | 'tencent' | 'kugou' | 'qishui';

export interface MusicAccountQrSession {
  platform: MusicAccountPlatform;
  sessionId?: string;
  qrimg?: string;
  message?: string;
}

export function textValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return '';
}

export function unwrapQrPayload(data: unknown): Record<string, unknown> {
  let current = data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
  for (let i = 0; i < 2; i += 1) {
    const nested = current.data || current.result;
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) break;
    current = nested as Record<string, unknown>;
  }
  return current;
}

export function normalizeQrStatus(value: unknown): string {
  const raw = textValue(value).toLowerCase();
  if (raw === '0' || raw === 'waiting' || raw === 'wait' || raw === 'pending') return 'waiting';
  if (raw === '1' || raw === 'scanned' || raw === 'scan' || raw === '已扫码') return 'scanned';
  if (raw === '2' || raw === 'confirmed' || raw === 'confirm' || raw === 'success' || raw === 'authorized') return 'confirmed';
  if (raw === '3' || raw === 'expired' || raw === 'expire' || raw === 'timeout') return 'expired';
  if (raw === 'error' || raw === 'failed' || raw === 'fail') return 'error';
  return raw;
}

export function normalizeQrImage(value: unknown): string {
  const raw = textValue(value);
  if (!raw) return '';
  if (raw.startsWith('data:image/')) return raw;
  if (/^[a-z\d+/]+=*$/i.test(raw) && raw.length > 100) return `data:image/png;base64,${raw}`;
  return raw;
}
