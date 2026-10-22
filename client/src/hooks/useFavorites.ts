import { useCallback, useEffect, useRef, useState } from 'react';
import { songKey } from '../api/music';
import { useSocket } from './useSocket';
import type { FavoriteSong, Song } from '../types';
import { fetchAccountSession } from '../lib/accountAuth';
import {
  markFavoritesSyncAttempt,
  markFavoritesSyncFailed,
  markFavoritesSyncPending,
  markFavoritesSyncResult,
  migrateFavoriteCache,
  migrateFavoriteCategories,
  readFavoritesSyncState,
  syncAccountFavorites,
  type FavoritesSyncState,
} from '../lib/favoritesSync';

let sharedFavoriteIds = new Set<string>();
let sharedFavoriteSongs: FavoriteSong[] = [];
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();
let sharedSyncState = readFavoritesSyncState();
const syncListeners = new Set<() => void>();

const GUEST_CACHE_KEY = 'openmusic:favorites-cache:v1:guest';
const ACCOUNT_CACHE_PREFIX = 'openmusic:favorites-cache:v1:account:';
const GUEST_CATEGORIES_KEY = 'openmusic:favorite-categories:v1:guest';
const ACCOUNT_CATEGORIES_PREFIX = 'openmusic:favorite-categories:v1:account:';

function readCache(key: string): FavoriteSong[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is FavoriteSong => Boolean(
      item && typeof item === 'object' && String(item.id || '').trim() && String(item.name || '').trim(),
    ));
  } catch {
    return [];
  }
}

function removeCache(key: string): void {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
}

function accountCacheKey(accountId: string): string {
  return `${ACCOUNT_CACHE_PREFIX}${accountId}`;
}

function categoriesCacheKey(accountId?: string): string {
  return accountId ? `${ACCOUNT_CATEGORIES_PREFIX}${accountId}` : GUEST_CATEGORIES_KEY;
}

function readCategories(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeCategories(key: string, categories: string[]): void {
  try { localStorage.setItem(key, JSON.stringify(categories)); } catch { /* storage unavailable */ }
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function updateSharedFavorites(songs: FavoriteSong[]) {
  sharedFavoriteSongs = songs;
  sharedFavoriteIds = new Set(songs.map((item) => songKey(item)));
  notifyListeners();
}

function updateSharedSyncState(state: FavoritesSyncState) {
  sharedSyncState = state;
  syncListeners.forEach((listener) => listener());
}

export function useFavorites() {
  const { listFavorites, listFavoriteCategories, createFavoriteCategory, setFavorite, setFavoriteCategory, importFavorites: importFavoritesOnServer } = useSocket();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set(sharedFavoriteIds));
  const [syncState, setSyncState] = useState<FavoritesSyncState>(() => sharedSyncState);
  const [categories, setCategories] = useState<string[]>(() => readCategories(GUEST_CATEGORIES_KEY));
  const retryTimer = useRef<number | null>(null);

  useEffect(() => {
    const listener = () => setFavoriteIds(new Set(sharedFavoriteIds));
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  useEffect(() => {
    const listener = () => setSyncState(sharedSyncState);
    syncListeners.add(listener);
    return () => { syncListeners.delete(listener); };
  }, []);

  const ensureLoaded = useCallback(async () => {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      const guestCached = readCache(GUEST_CACHE_KEY);
      if (guestCached.length) updateSharedFavorites(guestCached);

      let account: Awaited<ReturnType<typeof fetchAccountSession>> = null;
      try { account = await fetchAccountSession(); } catch { /* use cache */ }

      const legacyGuestCategories = readCategories(GUEST_CATEGORIES_KEY);
      const categoryMigration = await migrateFavoriteCategories(
        legacyGuestCategories,
        listFavoriteCategories,
        (name) => createFavoriteCategory(name),
      );
      if (categoryMigration.migrated) {
        if (legacyGuestCategories.length) removeCache(GUEST_CATEGORIES_KEY);
        if (account) removeCache(categoriesCacheKey(account.id));
        setCategories(categoryMigration.categories);
      }

      if (!account) {
        const result = await listFavorites();
        if (!result.success) {
          if (!guestCached.length) updateSharedFavorites([]);
          return;
        }
        const migrated = await migrateFavoriteCache(
          result.favorites || [],
          guestCached,
          (batch) => importFavoritesOnServer(batch),
        );
        if (migrated.migrated && guestCached.length) removeCache(GUEST_CACHE_KEY);
        updateSharedFavorites(migrated.favorites);
        return;
      }

      const cacheKey = accountCacheKey(account.id);
      const accountCached = readCache(cacheKey);
      if (accountCached.length) updateSharedFavorites(accountCached);

      if (guestCached.length) {
        updateSharedSyncState(markFavoritesSyncPending());
        const attempt = markFavoritesSyncAttempt();
        updateSharedSyncState(attempt);
        try {
          const imported = await syncAccountFavorites(guestCached, readCategories(GUEST_CATEGORIES_KEY));
          if (!imported.success) throw new Error(imported.error || '收藏同步失败');
          const next = imported.favorites || [];
          if (imported.complete) {
            removeCache(GUEST_CACHE_KEY);
            try { localStorage.removeItem(GUEST_CATEGORIES_KEY); } catch { /* storage unavailable */ }
            if (imported.categories) {
              writeCategories(categoriesCacheKey(account.id), imported.categories);
              setCategories(imported.categories);
            }
            const syncResult = imported.identitySame ? 'identity_same' : 'merged';
            updateSharedSyncState(markFavoritesSyncResult(syncResult, attempt));
          } else {
            updateSharedSyncState(markFavoritesSyncFailed(
              `账户收藏容量不足，${imported.dropped || 0} 首歌曲仍保留在本机`,
              attempt,
            ));
          }
          updateSharedFavorites(next);
        } catch (error) {
          updateSharedSyncState(markFavoritesSyncFailed(error, attempt));
          throw error;
        }
        return;
      }

      const result = await listFavorites();
      if (!result.success) return;
      if (accountCached.length) removeCache(cacheKey);
      updateSharedFavorites(result.favorites || []);
    })().catch(() => undefined);
    return loadPromise;
  }, [createFavoriteCategory, importFavoritesOnServer, listFavoriteCategories, listFavorites]);

  useEffect(() => { void ensureLoaded(); }, [ensureLoaded]);

  useEffect(() => {
    const onAccountSessionChanged = () => {
      loadPromise = null;
      updateSharedFavorites(readCache(GUEST_CACHE_KEY));
      if (readCache(GUEST_CACHE_KEY).length) updateSharedSyncState(markFavoritesSyncPending());
      void ensureLoaded();
    };
    window.addEventListener('openmusic:account-session-changed', onAccountSessionChanged);
    return () => window.removeEventListener('openmusic:account-session-changed', onAccountSessionChanged);
  }, [ensureLoaded]);

  useEffect(() => {
    const retryWhenOnline = () => {
      if (!readCache(GUEST_CACHE_KEY).length) return;
      loadPromise = null;
      void ensureLoaded();
    };
    window.addEventListener('online', retryWhenOnline);
    return () => window.removeEventListener('online', retryWhenOnline);
  }, [ensureLoaded]);

  useEffect(() => {
    if (syncState.status !== 'failed' || retryTimer.current !== null) return undefined;
    const delay = Math.min(60_000, 2_000 * (2 ** Math.min(syncState.retryCount, 5)));
    retryTimer.current = window.setTimeout(() => {
      retryTimer.current = null;
      loadPromise = null;
      void ensureLoaded();
    }, delay);
    return () => {
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
      retryTimer.current = null;
    };
  }, [ensureLoaded, syncState.retryCount, syncState.status]);

  const isFavorite = useCallback(
    (song: Song | null) => (song ? favoriteIds.has(songKey(song)) : false),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(async (song: Song) => {
    const key = songKey(song);
    let account: Awaited<ReturnType<typeof fetchAccountSession>> = null;
    try {
      account = await fetchAccountSession();
    } catch {
      return { success: false as const, error: '账户状态暂时无法确认，请稍后重试' };
    }

    if (!account) {
      const result = await setFavorite(song, !favoriteIds.has(key));
      if (!result.success) return { success: false as const, error: result.error || '收藏失败' };
      if (result.favorites) updateSharedFavorites(result.favorites);
      return { success: true as const, favorites: result.favorites || sharedFavoriteSongs };
    }

    const result = await setFavorite(song, !favoriteIds.has(key));
    if (!result.success) return { success: false as const, error: result.error || '收藏失败' };
    if (result.favorites) updateSharedFavorites(result.favorites);
    return { success: true as const, favorites: result.favorites || sharedFavoriteSongs };
  }, [favoriteIds, setFavorite]);

  const applyFavorites = useCallback((favorites: FavoriteSong[]) => {
    updateSharedFavorites(favorites);
  }, []);

  const reloadFavorites = useCallback(async () => {
    loadPromise = null;
    await ensureLoaded();
  }, [ensureLoaded]);

  const retryFavoritesSync = useCallback(async () => {
    updateSharedSyncState(markFavoritesSyncPending());
    loadPromise = null;
    await ensureLoaded();
    return readFavoritesSyncState();
  }, [ensureLoaded]);

  const listCachedFavorites = useCallback(async () => {
    await ensureLoaded();
    return { success: true, favorites: sharedFavoriteSongs, error: undefined as string | undefined };
  }, [ensureLoaded]);

  const listCachedCategories = useCallback(async () => {
    const account = await fetchAccountSession().catch(() => null);
    const legacyCategories = readCategories(GUEST_CATEGORIES_KEY);
    const migrated = await migrateFavoriteCategories(
      legacyCategories,
      listFavoriteCategories,
      (name) => createFavoriteCategory(name),
    );
    if (migrated.migrated) {
      if (legacyCategories.length) removeCache(GUEST_CATEGORIES_KEY);
      if (account) removeCache(categoriesCacheKey(account.id));
      setCategories(migrated.categories);
      return { success: true, categories: migrated.categories };
    }
    return { success: false, categories: migrated.categories, error: '收藏分类读取失败' };
  }, [createFavoriteCategory, listFavoriteCategories]);

  const addFavoriteCategory = useCallback(async (name: string) => {
    const account = await fetchAccountSession().catch(() => null);
    const result = await createFavoriteCategory(name);
    if (result.success && result.categories) {
      if (account) removeCache(categoriesCacheKey(account.id));
      setCategories(result.categories);
    }
    return result;
  }, [createFavoriteCategory]);

  const setCachedFavoriteCategory = useCallback(async (song: FavoriteSong, category: string) => {
    const result = await setFavoriteCategory(song, category);
    if (result.success && result.favorites) updateSharedFavorites(result.favorites);
    return result;
  }, [setFavoriteCategory]);

  const setCachedFavorite = useCallback(async (song: Song, favorite: boolean) => {
    if (favoriteIds.has(songKey(song)) !== favorite) return toggleFavorite(song);
    return { success: true as const, favorites: sharedFavoriteSongs, favorite };
  }, [favoriteIds, toggleFavorite]);

  const importCachedFavorites = useCallback(async (songs: Song[]) => {
    let account: Awaited<ReturnType<typeof fetchAccountSession>> = null;
    try {
      account = await fetchAccountSession();
    } catch {
      return { success: false as const, error: '账户状态暂时无法确认，请稍后重试' };
    }
    if (!account) {
      const result = await importFavoritesOnServer(songs);
      if (result.success && result.favorites) updateSharedFavorites(result.favorites);
      return result;
    }
    const result = await importFavoritesOnServer(songs);
    if (result.success && result.favorites) updateSharedFavorites(result.favorites);
    return result;
  }, [importFavoritesOnServer]);

  return {
    favoriteIds,
    favorites: sharedFavoriteSongs,
    isFavorite,
    toggleFavorite,
    listFavorites: listCachedFavorites,
    setFavorite: setCachedFavorite,
    setFavoriteCategory: setCachedFavoriteCategory,
    importFavorites: importCachedFavorites,
    applyFavorites,
    reloadFavorites,
    syncState,
    retryFavoritesSync,
    categories,
    listCategories: listCachedCategories,
    addCategory: addFavoriteCategory,
  };
}
