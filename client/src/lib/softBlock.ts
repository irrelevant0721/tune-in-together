/** 与 server/softBlock.js 保持一致的错误码（用户反馈时对照） */

export const SOFT_BLOCK_CODES = {
  SITE_BAN: 'OM-SBAN',
  SESSION_BOOTSTRAP_LIMIT: 'OM-SRL1',
  SESSION_NEW_LIMIT: 'OM-SRL2',
  ROOM_CREATE_COOLDOWN: 'OM-RCD1',
  ROOM_CREATE_COOLDOWN_IP: 'OM-RCD2',
} as const;

export type SoftBlockCode = (typeof SOFT_BLOCK_CODES)[keyof typeof SOFT_BLOCK_CODES];

export const SOFT_BLOCK_CODE_HELP: Array<{ code: SoftBlockCode; label: string; hint: string }> = [
  { code: SOFT_BLOCK_CODES.SITE_BAN, label: '全站封禁', hint: '封禁列表中的 IP/设备（仅手动）' },
  { code: SOFT_BLOCK_CODES.SESSION_BOOTSTRAP_LIMIT, label: '会话限流', hint: '同一 IP 会话刷新过于频繁' },
  { code: SOFT_BLOCK_CODES.SESSION_NEW_LIMIT, label: '新会话限流', hint: '同一 IP 新建会话过多（共享出口易误伤）' },
  { code: SOFT_BLOCK_CODES.ROOM_CREATE_COOLDOWN, label: '建房冷却', hint: '同一设备/用户建房冷却中' },
  { code: SOFT_BLOCK_CODES.ROOM_CREATE_COOLDOWN_IP, label: '建房 IP 冷却', hint: '无设备标识时按 IP 宽松冷却' },
];

export const SOFT_BLOCK_HEADER = 'x-openmusic-block-code';

export function softBlockMessage(code: string): string {
  const c = String(code || '').trim() || 'OM-????';
  return `系统开小差了，请稍后再试。如有疑问请联系管理员（错误码 ${c}）`;
}

export function extractSoftBlockCode(input: unknown): string {
  if (!input) return '';
  if (typeof input === 'string') {
    const fromText = input.match(/错误码\s*([A-Z0-9-]+)/i);
    if (fromText?.[1]) return fromText[1].toUpperCase();
    if (/^OM-[A-Z0-9]+$/i.test(input.trim())) return input.trim().toUpperCase();
    return '';
  }
  if (typeof input === 'object' && input !== null && 'code' in input) {
    const code = String((input as { code?: unknown }).code || '').trim();
    if (code) return code.toUpperCase();
  }
  return '';
}

export function readSoftBlockCodeFromResponse(res: Response | null | undefined): string {
  if (!res) return '';
  return String(res.headers.get(SOFT_BLOCK_HEADER) || '').trim().toUpperCase();
}
