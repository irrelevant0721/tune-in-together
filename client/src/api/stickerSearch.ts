import { fetchWithTimeout } from './http';

export interface StickerSearchResult {
  images: string[];
  page: number;
  maxPage: number;
  count: number;
}

export async function fetchStickerSearchEnabled(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout('/api/chat/sticker-search-config');
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.enabled);
  } catch {
    return false;
  }
}

export async function searchStickers(
  words: string,
  page = 1,
): Promise<StickerSearchResult> {
  const params = new URLSearchParams({
    words: words.trim(),
    page: String(page),
    limit: '15',
  });

  const res = await fetchWithTimeout(`/api/chat/sticker-search?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || '搜索失败');
  }

  return {
    images: Array.isArray(data.images) ? data.images : [],
    page: Number(data.page) || page,
    maxPage: Math.max(1, Number(data.maxPage) || 1),
    count: Number(data.count) || 0,
  };
}
