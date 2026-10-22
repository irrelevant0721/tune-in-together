import { fetchWithTimeout } from './http';
import type { Song } from '../types';
export interface SavedPlaylist { id: string; name: string; platform: 'netease' | 'qq'; songs: Song[] }
export interface FriendsLibrary { nickname: string; ready: boolean; playlists: SavedPlaylist[] }
export async function friendsRequest<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await fetchWithTimeout(path, { method, ...(data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }) }, 120000);
  const result = await response.json();
  if (!response.ok || result.success === false) throw new Error(result.error || '操作失败，请重试');
  return result as T;
}
export const loadLibrary = () => friendsRequest<FriendsLibrary>('/api/friends/library');
export interface ListeningRecord {
  id: string; roomName: string; startedAt: number; endedAt: number | null; ongoing: boolean;
  listeningMs: number; songCount: number; companions: string[];
  topSongs: (Song & { likes: number })[];
}
export interface ListeningSummary { listeningMs: number; songCount: number; history: ListeningRecord[]; hasMore: boolean }
export interface CurrentLike { songKey: string; liked: boolean; likes: number }
