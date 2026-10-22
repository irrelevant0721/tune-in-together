/**
 * 聊天音乐卡片：只保留播放与展示需要的最小字段。
 * 播放地址由客户端按 source + id 走既有 Meting 取链，绝不进入聊天协议；
 * 封面只接受已知音乐平台封面 CDN 的 https 直链（由服务端校验），避免聊天变成任意 URL 的载体。
 */

const ALLOWED_SOURCES = new Set(['netease', 'tencent', 'kugou', 'qishui']);
/**
 * 封面白名单：必须精确匹配或带点的子域名匹配。
 * 不能用 includes('douyin') 之类的子串判断，否则 attacker-douyin.com / douyin.com.evil 也能通过。
 * 汽水封面实际落在 *.douyinpic.com。
 */
const COVER_HOST_DOMAINS = [
  '163.com', '126.net', 'netease.com',
  'qq.com', 'gtimg.com', 'gtimg.cn', 'tencentmusic.com',
  'kugou.com', 'kugou.net', 'kgimg.com', 'kgcdn.com', 'kgimg.net',
  'douyinpic.com',
];

function hostMatchesDomain(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

function isAllowedCoverHostname(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (!host) return false;
  return COVER_HOST_DOMAINS.some((domain) => hostMatchesDomain(host, domain));
}

const MAX_ID_LENGTH = 64;
const MAX_TEXT_FIELD_LENGTH = 100;
const MAX_PIC_LENGTH = 1000;
/** 与前端 normalizeSongDurationMs 一致：毫秒 */
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;
/** 单条消息最多展示几张卡片（AI 候选挑选场景） */
export const MAX_CHAT_SONG_CARDS = 5;

/** 封面仅允许音乐平台 CDN 的 https 直链；http 会被浏览器的混合内容策略拦截 */
function sanitizeCardPic(raw) {
  const url = String(raw || '').trim().slice(0, MAX_PIC_LENGTH);
  if (!url) return '';
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'https:') return '';
  if (!isAllowedCoverHostname(parsed.hostname)) return '';
  return parsed.toString();
}

export function sanitizeChatSongCard(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const source = String(raw.source || '').trim().toLowerCase();
  if (!ALLOWED_SOURCES.has(source)) return null;

  const id = String(raw.id || '').trim().slice(0, MAX_ID_LENGTH);
  if (!id || !/^[0-9A-Za-z_-]+$/.test(id)) return null;

  const name = String(raw.name || '').trim().slice(0, MAX_TEXT_FIELD_LENGTH);
  if (!name) return null;

  const artist = String(raw.artist || '').trim().slice(0, MAX_TEXT_FIELD_LENGTH);
  const album = String(raw.album || '').trim().slice(0, MAX_TEXT_FIELD_LENGTH);
  const pic = sanitizeCardPic(raw.pic);
  const duration = Number(raw.duration);
  const normalizedDuration = Number.isFinite(duration) && duration > 0
    ? Math.round(Math.min(duration, MAX_DURATION_MS))
    : 0;

  return {
    id,
    source,
    name,
    artist: artist || '未知歌手',
    ...(album ? { album } : {}),
    ...(pic ? { pic } : {}),
    ...(normalizedDuration > 0 ? { duration: normalizedDuration } : {}),
  };
}

/**
 * 归一化卡片列表：支持单个对象（兼容旧消息）或数组，按音源+ID 去重并截断。
 */
/**
 * 只接受数组：一条消息可带多张卡片。非数组视为无卡片，避免隐式包装。
 */
export function sanitizeChatSongCards(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const cards = [];
  for (const item of raw) {
    const card = sanitizeChatSongCard(item);
    if (!card) continue;
    const key = `${card.source}:${card.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(card);
    if (cards.length >= MAX_CHAT_SONG_CARDS) break;
  }
  return cards;
}