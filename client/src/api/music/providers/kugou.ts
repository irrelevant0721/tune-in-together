import type { MusicProvider, SearchResult } from '../types';
import { fetchWithTimeout } from '../../http';

interface KugouListItem {
  id: string;
  SongName?: string;
  SingerName?: string;
  AlbumName?: string;
  Duration?: number;
  Image?: string;
}

interface KugouDetail {
  id: string;
  name: string;
  artist: string;
  url: string;
  pic: string;
  duration?: number;
  lrc: string;
}

const detailCache = new Map<string, KugouDetail | null>();
const detailInflight = new Map<string, Promise<KugouDetail | null>>();

function normalizeKugou(raw: KugouListItem): SearchResult {
  return {
    id: String(raw.id),
    source: 'kugou',
    name: raw.SongName || '未知歌曲',
    artist: raw.SingerName || '未知歌手',
    album: raw.AlbumName || undefined,
    pic: raw.Image || undefined,
    duration: raw.Duration ? raw.Duration * 1000 : undefined,
  };
}

function isPlayableUrl(url: string | undefined): boolean {
  return Boolean(url?.trim().startsWith('http'));
}

/** 同一首歌 url/lrc 共用一次详情请求，避免 getSongUrl + getLyrics 各打一遍 */
async function fetchKugouDetail(id: string): Promise<KugouDetail | null> {
  const key = id.trim();
  if (!key) return null;

  if (detailCache.has(key)) {
    return detailCache.get(key) ?? null;
  }

  const inflight = detailInflight.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const res = await fetchWithTimeout(`/api/music/kugou/song?id=${encodeURIComponent(key)}`);
      if (!res.ok) {
        detailCache.set(key, null);
        return null;
      }
      const detail = await res.json() as KugouDetail;
      detailCache.set(key, detail);
      return detail;
    } catch {
      detailCache.set(key, null);
      return null;
    } finally {
      detailInflight.delete(key);
    }
  })();

  detailInflight.set(key, promise);
  return promise;
}

export const kugouProvider: MusicProvider = {
  id: 'kugou',
  name: '酷狗',
  shortName: '酷狗',
  color: '#2688ee',
  supportsSearch: false,
  supportsIdLookup: false,
  description: '需在管理后台配置酷狗自定义接口',
  async search(keyword) {
    if (!keyword.trim()) return [];
    const params = new URLSearchParams({ q: keyword.trim(), num: '30' });
    const res = await fetchWithTimeout(`/api/music/kugou/search?${params}`);
    if (!res.ok) return [];
    const data = await res.json() as KugouListItem[];
    if (!Array.isArray(data)) return [];
    return data.map(normalizeKugou).filter((s) => s.id);
  },

  async getSongById(id) {
    if (!id.trim()) return null;
    const detail = await fetchKugouDetail(id.trim());
    if (!detail) return null;
    return {
      id: detail.id,
      source: 'kugou',
      name: detail.name,
      artist: detail.artist,
      pic: detail.pic,
      duration: detail.duration,
      url: isPlayableUrl(detail.url) ? detail.url : undefined,
      lrc: detail.lrc,
    };
  },

  async getSongUrl(song, _quality?: string) {
    if (isPlayableUrl(song.url)) return { url: song.url! };
    const detail = await fetchKugouDetail(song.id);
    if (!isPlayableUrl(detail?.url)) throw new Error('无法获取播放链接');
    return { url: detail!.url };
  },

  async getLyrics(song) {
    if (song.lrc?.trim().startsWith('[')) return song.lrc;
    const detail = await fetchKugouDetail(song.id);
    return detail?.lrc || '';
  },

  getCoverUrl(song) {
    return song.pic || '';
  },
};
