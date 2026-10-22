import type { PlaylistPlatform } from '../api/music/playlist';

const HISTORY_KEY = 'openmusic:playlist-import-history';
const MAX_HISTORY = 10;

export type PlaylistImportHistoryItem = {
  id: string;
  platform: PlaylistPlatform;
  playlistId: string;
  name: string;
  updatedAt: number;
};

function normalizeHistoryItem(item: unknown): PlaylistImportHistoryItem | null {
  if (!item || typeof item !== 'object') return null;
  const raw = item as Partial<PlaylistImportHistoryItem>;
  if (raw.platform !== 'netease' && raw.platform !== 'qq') return null;
  const playlistId = String(raw.playlistId || '').trim();
  const name = String(raw.name || '').trim();
  if (!playlistId || !name) return null;
  return {
    id: `${raw.platform}:${playlistId}`,
    platform: raw.platform,
    playlistId,
    name,
    updatedAt: Number(raw.updatedAt) || Date.now(),
  };
}

export function readPlaylistImportHistory(): PlaylistImportHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items)
      ? items.map(normalizeHistoryItem).filter(Boolean).slice(0, MAX_HISTORY) as PlaylistImportHistoryItem[]
      : [];
  } catch {
    return [];
  }
}

function writeHistory(items: PlaylistImportHistoryItem[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage may be unavailable.
  }
}

export function rememberPlaylistImportHistory(item: {
  platform: PlaylistPlatform;
  playlistId: string;
  name: string;
}): PlaylistImportHistoryItem[] {
  const playlistId = item.playlistId.trim();
  const name = item.name.trim() || '未命名歌单';
  if (!playlistId) return readPlaylistImportHistory();

  const id = `${item.platform}:${playlistId}`;
  const next = [
    { id, platform: item.platform, playlistId, name, updatedAt: Date.now() },
    ...readPlaylistImportHistory().filter((historyItem) => historyItem.id !== id),
  ];
  writeHistory(next);
  return next.slice(0, MAX_HISTORY);
}

export function clearPlaylistImportHistory(): void {
  writeHistory([]);
}

export function removePlaylistImportHistoryItem(id: string): PlaylistImportHistoryItem[] {
  const next = readPlaylistImportHistory().filter((item) => item.id !== id);
  writeHistory(next);
  return next;
}
