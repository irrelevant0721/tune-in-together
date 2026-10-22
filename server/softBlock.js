/**
 * 软拦截对外统一文案 + 可追溯错误码。
 * 不向用户暴露封禁/限流细节，但管理员可根据用户反馈的错误码定位原因。
 */

export const SOFT_BLOCK_CODES = Object.freeze({
  /** 全站封禁（IP / 设备，含自动建房封禁） */
  SITE_BAN: 'OM-SBAN',
  /** 会话 bootstrap 限流（已有会话刷新） */
  SESSION_BOOTSTRAP_LIMIT: 'OM-SRL1',
  /** 新会话限流（首次建立 / 清 Cookie） */
  SESSION_NEW_LIMIT: 'OM-SRL2',
  /** 建房冷却（设备 / 用户） */
  ROOM_CREATE_COOLDOWN: 'OM-RCD1',
  /** 建房 IP 宽松冷却（无设备标识时） */
  ROOM_CREATE_COOLDOWN_IP: 'OM-RCD2',
});

/** 管理后台对照说明 */
export const SOFT_BLOCK_CODE_HELP = Object.freeze([
  { code: SOFT_BLOCK_CODES.SITE_BAN, label: '全站封禁', hint: '封禁列表中的 IP/设备（仅手动）' },
  { code: SOFT_BLOCK_CODES.SESSION_BOOTSTRAP_LIMIT, label: '会话限流', hint: '同一 IP 会话刷新过于频繁' },
  { code: SOFT_BLOCK_CODES.SESSION_NEW_LIMIT, label: '新会话限流', hint: '同一 IP 新建会话过多（共享出口易误伤）' },
  { code: SOFT_BLOCK_CODES.ROOM_CREATE_COOLDOWN, label: '建房冷却', hint: '同一设备/用户建房冷却中' },
  { code: SOFT_BLOCK_CODES.ROOM_CREATE_COOLDOWN_IP, label: '建房 IP 冷却', hint: '无设备标识时按 IP 宽松冷却' },
]);

export const SOFT_BLOCK_HEADER = 'X-OpenMusic-Block-Code';

export function softBlockMessage(code) {
  const c = String(code || '').trim() || 'OM-????';
  return `系统开小差了，请稍后再试。如有疑问请联系管理员（错误码 ${c}）`;
}

export function softBlockPayload(code, extra = {}) {
  const normalized = String(code || '').trim();
  return {
    error: softBlockMessage(normalized),
    code: normalized,
    ...extra,
  };
}

export function setSoftBlockHeaders(res, code) {
  if (!res || typeof res.setHeader !== 'function') return;
  const normalized = String(code || '').trim();
  if (!normalized) return;
  res.setHeader(SOFT_BLOCK_HEADER, normalized);
}
