import { sanitizeChatSongCard } from './chatSongCard.js';

const MAX_CATEGORY_LENGTH = 30;

export function sanitizeFavoriteSongInput(raw) {
  const song = sanitizeChatSongCard(raw);
  if (!song) return null;
  const rawCategory = String(raw?.category || '').trim();
  const category = rawCategory.length <= MAX_CATEGORY_LENGTH ? rawCategory : '';
  return {
    ...song,
    ...(category ? { category } : {}),
  };
}
