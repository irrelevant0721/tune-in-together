import type { ChatSongCard } from '../types';

/**
 * 聊天音乐卡片的收藏 / 点歌动作与状态。
 *
 * 卡片可能出现在历史里的多条消息中，如果每张卡片各自调用 useSocket / useFavorites
 * 会产生成百上千个 hook 与订阅。这里由 ChatPanel 统一维护一份，按引用传给消息行。
 */
export interface ChatCardActions {
  favoriteKeys: Set<string>;
  queueKeys: Set<string>;
  /** 正在请求中的卡片键：`fav:<key>` / `add:<key>` */
  pendingKeys: Set<string>;
  onToggleFavorite: (song: ChatSongCard) => void;
  onAddToQueue: (song: ChatSongCard) => void;
}
