const MAX_FAVORITES = 5000;

export function favoriteSongKey(song) {
  const source = String(song?.source || 'netease').trim();
  const id = String(song?.id || '').trim();
  return source && id ? `${source}:${id}` : '';
}

export function filterFavoriteCategories(songs, categories) {
  const allowed = new Set(
    (Array.isArray(categories) ? categories : [])
      .map((category) => String(category || '').trim().toLowerCase())
      .filter(Boolean),
  );
  return (Array.isArray(songs) ? songs : []).map((song) => {
    if (!song || typeof song !== 'object') return song;
    const category = String(song?.category || '').trim();
    if (!category || allowed.has(category.toLowerCase())) return song;
    const { category: _category, ...withoutCategory } = song;
    return withoutCategory;
  });
}

export function mergeFavoriteSnapshots(accountFavorites, guestFavorites) {
  const result = [];
  const seen = new Set();
  for (const song of [...(Array.isArray(accountFavorites) ? accountFavorites : []), ...(Array.isArray(guestFavorites) ? guestFavorites : [])]) {
    const key = favoriteSongKey(song);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(song);
    if (result.length >= MAX_FAVORITES) break;
  }
  return result;
}

export function getFavoritesSyncStatus({ sourceUserId, targetUserId } = {}) {
  const source = String(sourceUserId || '').trim();
  const target = String(targetUserId || '').trim();
  if (source && target && source === target) return 'identity_same';
  return 'merged';
}

export function buildFavoritesSyncResult({ sourceUserId, targetUserId, accountFavorites = [], guestFavorites = [] } = {}) {
  const favorites = mergeFavoriteSnapshots(accountFavorites, guestFavorites);
  const accountKeys = new Set((Array.isArray(accountFavorites) ? accountFavorites : []).map(favoriteSongKey));
  const imported = favorites.filter((song) => !accountKeys.has(favoriteSongKey(song))).length;
  return {
    status: getFavoritesSyncStatus({ sourceUserId, targetUserId }),
    imported,
    favorites,
  };
}

export function analyzeFavoritesMigration({
  accountFavorites,
  guestFavorites,
  maxFavorites = MAX_FAVORITES,
  accountCategories,
  guestCategories,
  maxCategories = 50,
} = {}) {
  const result = {};
  if (Array.isArray(accountFavorites) || Array.isArray(guestFavorites)) {
    const seen = new Set((Array.isArray(accountFavorites) ? accountFavorites : []).map(favoriteSongKey).filter(Boolean));
    let missingFavorites = 0;
    for (const song of Array.isArray(guestFavorites) ? guestFavorites : []) {
      const key = favoriteSongKey(song);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      missingFavorites += 1;
    }
    const available = Math.max(0, Number(maxFavorites) - (Array.isArray(accountFavorites) ? accountFavorites.length : 0));
    result.missingFavorites = missingFavorites;
    result.droppedFavorites = Math.max(0, missingFavorites - available);
  }
  if (Array.isArray(accountCategories) || Array.isArray(guestCategories)) {
    const seen = new Set((Array.isArray(accountCategories) ? accountCategories : []).map((item) => String(item || '').trim().toLowerCase()).filter(Boolean));
    let missingCategories = 0;
    for (const category of Array.isArray(guestCategories) ? guestCategories : []) {
      const key = String(category || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      missingCategories += 1;
    }
    const available = Math.max(0, Number(maxCategories) - (Array.isArray(accountCategories) ? accountCategories.length : 0));
    result.missingCategories = missingCategories;
    result.droppedCategories = Math.max(0, missingCategories - available);
  }
  return result;
}

export function appendMissingFavoriteSongs(currentFavorites, incomingFavorites, maxFavorites = MAX_FAVORITES) {
  const current = (Array.isArray(currentFavorites) ? currentFavorites : []).slice(0, maxFavorites);
  const seen = new Set(current.map(favoriteSongKey).filter(Boolean));
  const accepted = [];
  let dropped = 0;
  for (const song of Array.isArray(incomingFavorites) ? incomingFavorites : []) {
    const key = favoriteSongKey(song);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (current.length + accepted.length < maxFavorites) accepted.push(song);
    else dropped += 1;
  }
  return {
    items: [...current, ...accepted],
    imported: accepted.length,
    dropped,
  };
}
