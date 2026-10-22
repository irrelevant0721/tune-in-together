const MAX_MEMBER_BADGE_LENGTH = 8;
const MEMBER_BORDER_STYLE_ID = 'solid';

const MEMBER_WELCOME_TEMPLATE_IDS = new Set([
  'none',
  'royal',
  'sparkle',
  'vip-lounge',
  'spotlight',
  'wave',
  'custom',
]);

const MEMBER_COLOR_PRESETS = [
  '#f6d365',
  '#fde68a',
  '#d4a574',
  '#b45309',
  '#ff8a4c',
  '#ff7a59',
  '#fb7185',
  '#e11d48',
  '#f4a5c0',
  '#e879f9',
  '#c084fc',
  '#c4b5fd',
  '#818cf8',
  '#67e8f9',
  '#2dd4bf',
  '#99f6e4',
  '#6ee7b7',
  '#86efac',
  '#a3e635',
  '#e2e8f0',
  '#94a3b8',
  // 兼容旧数据 / 角色色（客户端选择时会过滤）
  '#fbbf24',
  '#38bdf8',
];

const MEMBER_WELCOME_TEMPLATES = {
  none: '',
  royal: '👑 欢迎尊贵 {badge} {nickname} 驾临本房，请享受专属视听盛宴 👑',
  sparkle: '✨ {badge} {nickname} 闪耀登场，音乐殿堂因你而亮 ✨',
  'vip-lounge': '🥂 贵宾 {badge} {nickname} 已就位，专属 lounge 体验开启 🥂',
  spotlight: '💫 聚光灯亮起 —— 欢迎 {badge} {nickname} 加入同步听歌 💫',
  wave: '🎵 {badge} {nickname} 来了！队列已为你预留排面，一起嗨 🎵',
  custom: '{badge} {nickname} 欢迎回来',
};

export const DEFAULT_MEMBER_SETTINGS = {
  welcomeEnabled: true,
  welcomeTemplateId: 'royal',
  welcomeCustomText: '',
  confettiEnabled: true,
  /** 同一贵宾重复迎宾间隔（秒），0 = 每次进房都欢迎；默认 5 分钟 */
  welcomeCooldownSec: 5 * 60,
};

const MAX_WELCOME_COOLDOWN_SEC = 24 * 60 * 60;

export function createDefaultMemberTier() {
  return {
    badgeLabel: '贵宾',
    badgeColor: MEMBER_COLOR_PRESETS[0],
    borderStyleId: MEMBER_BORDER_STYLE_ID,
    borderColor: MEMBER_COLOR_PRESETS[0],
  };
}

function normalizeMemberColor(color) {
  const raw = String(color || '').trim();
  if (MEMBER_COLOR_PRESETS.includes(raw)) return raw;
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  return MEMBER_COLOR_PRESETS[0];
}

function normalizeBorderStyleId(_styleId) {
  return MEMBER_BORDER_STYLE_ID;
}

function normalizeWelcomeTemplateId(templateId) {
  const raw = String(templateId || '').trim();
  return MEMBER_WELCOME_TEMPLATE_IDS.has(raw) ? raw : 'royal';
}

export function normalizeWelcomeCooldownSec(value) {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_MEMBER_SETTINGS.welcomeCooldownSec;
  }
  const sec = Math.floor(Number(value));
  if (!Number.isFinite(sec) || sec < 0) return DEFAULT_MEMBER_SETTINGS.welcomeCooldownSec;
  return Math.min(sec, MAX_WELCOME_COOLDOWN_SEC);
}

export function normalizeMemberSettings(input) {
  return {
    welcomeEnabled: input?.welcomeEnabled !== false,
    welcomeTemplateId: normalizeWelcomeTemplateId(input?.welcomeTemplateId),
    welcomeCustomText: String(input?.welcomeCustomText || '').slice(0, 200),
    confettiEnabled: input?.confettiEnabled !== false,
    welcomeCooldownSec: normalizeWelcomeCooldownSec(input?.welcomeCooldownSec),
  };
}

export function serializeMemberTier(userId, tier) {
  if (!tier) return null;
  const welcomeTemplateId = normalizeWelcomeTemplateId(tier.welcomeTemplateId);
  const welcomeEnabled = welcomeTemplateId !== 'none' && tier.welcomeEnabled !== false;
  return {
    userId,
    badgeLabel: String(tier.badgeLabel || '贵宾').trim().slice(0, MAX_MEMBER_BADGE_LENGTH) || '贵宾',
    badgeColor: normalizeMemberColor(tier.badgeColor),
    borderStyleId: normalizeBorderStyleId(tier.borderStyleId),
    borderColor: normalizeMemberColor(tier.borderColor),
    assignedAt: tier.assignedAt || Date.now(),
    welcomeEnabled,
    welcomeTemplateId,
    welcomeCustomText: String(tier.welcomeCustomText || '').slice(0, 200),
    confettiEnabled: tier.confettiEnabled != null ? Boolean(tier.confettiEnabled) : welcomeEnabled,
    welcomeCooldownSec: normalizeWelcomeCooldownSec(tier.welcomeCooldownSec),
  };
}

export function serializeMemberSettings(settings) {
  return normalizeMemberSettings(settings || DEFAULT_MEMBER_SETTINGS);
}

export function serializeMemberTiersMap(memberTiers) {
  if (!memberTiers) return {};
  const output = {};
  for (const [userId, tier] of memberTiers.entries()) {
    const serialized = serializeMemberTier(userId, tier);
    if (serialized) output[userId] = serialized;
  }
  return output;
}

/** 解析某贵宾的迎宾配置：优先用户级字段，缺省回退房间默认 */
export function resolveMemberWelcomeSettings(tier, roomSettings) {
  const room = normalizeMemberSettings(roomSettings);
  const hasTierWelcome = tier && (
    tier.welcomeTemplateId != null
    || tier.welcomeCustomText != null
    || tier.welcomeEnabled != null
    || tier.confettiEnabled != null
    || tier.welcomeCooldownSec != null
  );
  if (!hasTierWelcome) return room;
  const welcomeTemplateId = normalizeWelcomeTemplateId(tier.welcomeTemplateId || room.welcomeTemplateId);
  const welcomeEnabled = welcomeTemplateId !== 'none' && tier.welcomeEnabled !== false;
  return {
    welcomeEnabled,
    welcomeTemplateId,
    welcomeCustomText: String(
      tier.welcomeCustomText != null ? tier.welcomeCustomText : room.welcomeCustomText || '',
    ).slice(0, 200),
    confettiEnabled: tier.confettiEnabled != null ? Boolean(tier.confettiEnabled) : welcomeEnabled,
    welcomeCooldownSec: normalizeWelcomeCooldownSec(
      tier.welcomeCooldownSec != null ? tier.welcomeCooldownSec : room.welcomeCooldownSec,
    ),
  };
}

export function buildWelcomeText(settings, tier, nickname) {
  const templateId = normalizeWelcomeTemplateId(settings?.welcomeTemplateId);
  if (templateId === 'none') return '';
  const template = templateId === 'custom'
    ? (String(settings?.welcomeCustomText || '').trim() || MEMBER_WELCOME_TEMPLATES.custom)
    : (MEMBER_WELCOME_TEMPLATES[templateId] || MEMBER_WELCOME_TEMPLATES.royal);
  const badge = String(tier?.badgeLabel || '贵宾').trim() || '贵宾';
  const name = String(nickname || '贵宾').trim() || '贵宾';
  return template
    .replaceAll('{badge}', `「${badge}」`)
    .replaceAll('{nickname}', name)
    .slice(0, 500);
}

export function normalizeIncomingMemberTier(payload = {}) {
  const defaults = createDefaultMemberTier();
  const welcomeTemplateId = normalizeWelcomeTemplateId(
    payload.welcomeTemplateId != null ? payload.welcomeTemplateId : 'none',
  );
  const welcomeEnabled = welcomeTemplateId !== 'none' && payload.welcomeEnabled !== false;
  return {
    badgeLabel: String(payload.badgeLabel || defaults.badgeLabel).trim().slice(0, MAX_MEMBER_BADGE_LENGTH) || '贵宾',
    badgeColor: normalizeMemberColor(payload.badgeColor || defaults.badgeColor),
    borderStyleId: normalizeBorderStyleId(payload.borderStyleId || defaults.borderStyleId),
    borderColor: normalizeMemberColor(payload.borderColor || defaults.borderColor),
    welcomeEnabled,
    welcomeTemplateId,
    welcomeCustomText: String(payload.welcomeCustomText || '').slice(0, 200),
    confettiEnabled: payload.confettiEnabled != null ? Boolean(payload.confettiEnabled) : false,
    welcomeCooldownSec: normalizeWelcomeCooldownSec(
      payload.welcomeCooldownSec != null ? payload.welcomeCooldownSec : DEFAULT_MEMBER_SETTINGS.welcomeCooldownSec,
    ),
  };
}

export function restoreMemberTiersFromStorage(raw) {
  const map = new Map();
  if (!raw || typeof raw !== 'object') return map;
  for (const [userId, tier] of Object.entries(raw)) {
    const serialized = serializeMemberTier(userId, tier);
    if (serialized) map.set(userId, serialized);
  }
  return map;
}
