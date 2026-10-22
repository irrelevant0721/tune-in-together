import {
  buildApihzUrl,
  fetchApihz,
  getApihzId,
  getApihzKey,
  isApihzConfigured,
} from './apihz.js';

const STICKER_ENDPOINT = 'img/apihzbqbbaidu.php';
const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 20;
const SEARCH_TIMEOUT_MS = 10000;

export function isApihzStickerConfigured() {
  return isApihzConfigured();
}

export async function searchApihzStickers(words, page = 1, limit = DEFAULT_LIMIT) {
  if (!isApihzStickerConfigured()) {
    throw new Error('未配置表情包搜索');
  }

  const normalizedWords = String(words || '').trim();
  if (!normalizedWords) throw new Error('请输入搜索关键词');
  if (normalizedWords.length > 32) throw new Error('关键词过长');

  const safePage = Math.max(1, Math.min(200, Number(page) || 1));
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, Number(limit) || DEFAULT_LIMIT));

  const params = new URLSearchParams({
    id: getApihzId(),
    key: getApihzKey(),
    limit: String(safeLimit),
    page: String(safePage),
    words: normalizedWords,
  });

  const res = await fetchApihz(`${buildApihzUrl(STICKER_ENDPOINT)}?${params.toString()}`, {}, SEARCH_TIMEOUT_MS);
  if (!res.ok) throw new Error('搜索服务暂时不可用');

  const data = await res.json();
  if (Number(data?.code) !== 200) {
    throw new Error(data?.msg || data?.message || '搜索失败');
  }

  const images = Array.isArray(data.res)
    ? data.res.filter((item) => typeof item === 'string' && item.startsWith('https://'))
    : [];

  return {
    images,
    page: Number(data.page) || safePage,
    maxPage: Math.max(1, Number(data.maxpage) || 1),
    count: Number(data.count) || images.length,
  };
}
