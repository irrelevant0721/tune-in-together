import type { ChatMessage, ChatSongCard } from '../types';
import { isAllowedCoverHostname } from './mediaProxyUrl';

export const AI_BOT_USER_ID = '__openmusic_ai__';

const MUSIC_SOURCES = new Set<ChatSongCard['source']>(['netease', 'tencent', 'kugou', 'qishui']);
/** 单条消息展示的卡片上限，与服务端一致 */
const MAX_CHAT_SONG_CARDS = 5;

/** 卡片封面：只沿用服务端白名单直链，前端再做一次协议与平台域名校验 */
function sanitizeCardPic(value: unknown): string | undefined {
  const url = String(value || '').trim();
  if (!url || url.length > 1000) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return undefined;
    if (!isAllowedCoverHostname(parsed.hostname)) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/** 卡片只允许展示/试听所需字段；其余字段（如其它外部 URL）一律丢弃 */
export function sanitizeIncomingChatSongCard(value: unknown): ChatSongCard | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ChatSongCard>;
  const source = String(raw.source || '').toLowerCase() as ChatSongCard['source'];
  if (!MUSIC_SOURCES.has(source)) return null;
  const id = String(raw.id || '').trim();
  const name = String(raw.name || '').trim();
  if (!id || !name) return null;
  const duration = Number(raw.duration);
  const pic = sanitizeCardPic(raw.pic);
  return {
    id,
    source,
    name,
    artist: String(raw.artist || '').trim() || '未知歌手',
    ...(raw.album ? { album: String(raw.album) } : {}),
    ...(pic ? { pic } : {}),
    ...(Number.isFinite(duration) && duration > 0 ? { duration } : {}),
  };
}

/** 归一化消息上的卡片列表：校验、去重并截断到上限 */
function resolveChatSongCards(message: Pick<ChatMessage, 'songs'>): ChatSongCard[] {
  const seen = new Set<string>();
  const cards: ChatSongCard[] = [];
  for (const item of message.songs || []) {
    const card = sanitizeIncomingChatSongCard(item);
    if (!card) continue;
    const key = `${card.source}:${card.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(card);
    if (cards.length >= MAX_CHAT_SONG_CARDS) break;
  }
  return cards;
}

/** 客户端侧：仅认服务端签名的 bot 消息，防止伪造 userId */
export function isVerifiedAiBotMessage(message: ChatMessage): boolean {
  return message.userId === AI_BOT_USER_ID
    && message.kind === 'ai_bot'
    && Boolean(String(message.aiBotSig || '').trim());
}

/** 降级冒充 bot 的消息为普通聊天 */
export function sanitizeIncomingChatMessage(message: ChatMessage): ChatMessage {
  if (message.userId !== AI_BOT_USER_ID) return message;
  const songs = resolveChatSongCards(message);
  const sameSongs = message.songs?.length === songs.length
    && songs.every((card, index) => card === message.songs?.[index]);
  if (isVerifiedAiBotMessage(message)) {
    return sameSongs ? message : { ...message, songs };
  }
  return {
    ...message,
    kind: 'chat',
    aiBotSig: undefined,
    songs,
  };
}
