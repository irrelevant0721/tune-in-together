import { create } from 'zustand';
import type { SongHistoryItem } from '../types';

const MAX_SONG_HISTORY = 150;

function songHistoryKey(item: Pick<SongHistoryItem, 'source' | 'id'>): string {
  return `${item.source || 'netease'}:${item.id}`;
}

interface SongHistoryStore {
  roomId: string | null;
  songs: SongHistoryItem[];
  loading: boolean;
  loaded: boolean;
  setSongs: (roomId: string, songs: SongHistoryItem[]) => void;
  appendSong: (roomId: string, song: SongHistoryItem) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useSongHistoryStore = create<SongHistoryStore>((set) => ({
  roomId: null,
  songs: [],
  loading: false,
  loaded: false,

  setSongs: (roomId, songs) => set({
    roomId,
    songs,
    loading: false,
    loaded: true,
  }),

  appendSong: (roomId, song) => set((state) => {
    if (state.roomId !== roomId) return state;
    const key = songHistoryKey(song);
    const filtered = state.songs.filter((item) => songHistoryKey(item) !== key);
    return {
      songs: [{ ...song, requestedAt: song.requestedAt || Date.now() }, ...filtered].slice(0, MAX_SONG_HISTORY),
      loaded: true,
    };
  }),

  setLoading: (loading) => set({ loading }),

  clear: () => set({
    roomId: null,
    songs: [],
    loading: false,
    loaded: false,
  }),
}));

export function getSongHistoryKeys(songs: SongHistoryItem[]): Set<string> {
  return new Set(songs.map((item) => `${item.source || 'netease'}:${item.id}`));
}
