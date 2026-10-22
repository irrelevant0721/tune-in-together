import { decryptRoomSecrets, encryptRoomSecrets } from './roomCredentialCrypto.js';
import { getRuntimeConfig } from './runtimeConfig.js';
import { randomBytes } from 'node:crypto';
import { createLogger, incrementMetric } from './logger.js';
import { appendMissingFavoriteSongs } from './favoritesSync.js';
import { expireMigratedFavoriteSource } from './favoriteRetention.js';

const ROOM_IDS_KEY = 'openmusic:room_ids';
const roomKey = (id) => `openmusic:room:${id}`;
const accountRoomsKey = (accountId) => `openmusic:account:rooms:${accountId}`;
const log = createLogger('room-storage');

let redisClient = null;
let enabled = false;
const pendingRoomWrites = new Map();
let roomWriteFlushScheduled = false;
const roomStorageOperations = new Map();

function parseRedisDb(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function getRedisConnectionOptions(env = process.env) {
  const url = String(env.REDIS_URL || '').trim();
  const host = String(env.REDIS_HOST || '').trim();

  if (!url && !host) return null;

  const username = String(env.REDIS_USERNAME || '').trim();
  const password = String(env.REDIS_PASSWORD || '').trim();
  const database = parseRedisDb(env.REDIS_DB);

  if (url) {
    const options = { url };
    if (username) options.username = username;
    if (password) options.password = password;
    if (database !== undefined) options.database = database;
    return options;
  }

  const port = parseInt(env.REDIS_PORT || '6379', 10) || 6379;
  const options = {
    socket: { host, port },
  };
  if (username) options.username = username;
  if (password) options.password = password;
  if (database !== undefined) options.database = database;
  return options;
}

function describeRedisTarget(options) {
  if (options.url) {
    try {
      const parsed = new URL(options.url);
      const db = options.database ?? (parsed.pathname?.replace(/^\//, '') || '0');
      return `${parsed.hostname}:${parsed.port || 6379} db=${db}`;
    } catch {
      return 'REDIS_URL';
    }
  }
  const host = options.socket?.host || 'localhost';
  const port = options.socket?.port || 6379;
  const db = options.database ?? 0;
  return `${host}:${port} db=${db}`;
}

export function isRedisEnabled() {
  return enabled;
}

export function getRedisClient() {
  return enabled ? redisClient : null;
}

/** .env 中是否配置了 Redis 连接（未配置视为首次部署，进入安装向导） */
export function hasRedisEnvConfig() {
  return Boolean(
    (process.env.REDIS_URL || '').trim()
    || (process.env.REDIS_HOST || '').trim(),
  );
}

export async function initRoomStorage() {
  if (redisClient?.isOpen) return enabled;
  if (redisClient) {
    redisClient = null;
    enabled = false;
  }

  const options = getRedisConnectionOptions();
  if (!options) {
    log.info('redis_not_configured');
    return false;
  }

  try {
    const { createClient } = await import('redis');
    redisClient = createClient(options);
    redisClient.on('error', (err) => {
      incrementMetric('redis_error_total', { phase: 'runtime' });
      log.error('redis_runtime_error', { error: err });
    });
    await redisClient.connect();
    enabled = true;
    log.info('redis_connected', { target: describeRedisTarget(options) });
    return true;
  } catch (err) {
    incrementMetric('redis_error_total', { phase: 'connect' });
    log.error('redis_connect_failed', { error: err });
    redisClient = null;
    enabled = false;
    return false;
  }
}

export async function loadAllRoomsFromStorage() {
  if (!enabled || !redisClient) return [];

  const ids = await redisClient.sMembers(ROOM_IDS_KEY);
  const rooms = [];

  for (const id of ids) {
    try {
      const raw = await redisClient.get(roomKey(id));
      if (!raw) continue;
      const room = JSON.parse(raw);
      room.musicAccountSecrets = decryptRoomSecrets(room.musicAccountSecrets, room.id);
      rooms.push(room);
    } catch (err) {
      incrementMetric('redis_error_total', { phase: 'load_room' });
      log.warn('redis_room_payload_invalid', { roomId: id, error: err });
    }
  }

  return rooms;
}

async function saveRoomToStorageNow(roomSnapshot) {
  if (!enabled || !redisClient) return;

  try {
    const persisted = {
      ...roomSnapshot,
      musicAccountSecrets: encryptRoomSecrets(roomSnapshot.musicAccountSecrets, roomSnapshot.id),
    };
    const payload = JSON.stringify(persisted);
    await redisClient.set(roomKey(roomSnapshot.id), payload);
    await redisClient.sAdd(ROOM_IDS_KEY, roomSnapshot.id);
    if (roomSnapshot.ownerAccountId) {
      await redisClient.sAdd(accountRoomsKey(roomSnapshot.ownerAccountId), String(roomSnapshot.id).trim().toUpperCase());
    }
  } catch (err) {
    incrementMetric('redis_error_total', { phase: 'save_room' });
    log.error('redis_save_room_failed', { roomId: roomSnapshot.id, error: err });
  }
}

function enqueueRoomStorageOperation(roomId, operation) {
  const id = String(roomId || '').trim().toUpperCase();
  const previous = roomStorageOperations.get(id) || Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(operation)
    .finally(() => {
      if (roomStorageOperations.get(id) === next) roomStorageOperations.delete(id);
    });
  roomStorageOperations.set(id, next);
  return next;
}

export function saveRoomToStorage(roomSnapshot) {
  if (!enabled || !redisClient) return Promise.resolve();
  return enqueueRoomStorageOperation(roomSnapshot?.id, () => saveRoomToStorageNow(roomSnapshot));
}

/** 异步持久化，避免 JSON 序列化阻塞 HTTP / Socket 热路径 */
export function queueSaveRoomToStorage(roomSnapshot) {
  if (!enabled || !redisClient) return;

  const id = String(roomSnapshot?.id || '').trim().toUpperCase();
  if (!id) return;
  // 同一事件循环内只保留每个房间最新快照，避免播放/队列事件叠加 Redis 写入。
  pendingRoomWrites.set(id, { ...roomSnapshot, id });
  if (roomWriteFlushScheduled) return;
  scheduleRoomWriteFlush();
}

export function cancelQueuedRoomSave(roomId) {
  const id = String(roomId || '').trim().toUpperCase();
  if (!id) return;
  pendingRoomWrites.delete(id);
}

function scheduleRoomWriteFlush() {
  roomWriteFlushScheduled = true;
  setImmediate(() => {
    roomWriteFlushScheduled = false;
    const snapshots = [...pendingRoomWrites.values()];
    pendingRoomWrites.clear();
    for (const snapshot of snapshots) void saveRoomToStorage(snapshot);
    if (pendingRoomWrites.size > 0) scheduleRoomWriteFlush();
  });
}

export async function deleteRoomFromStorage(roomId, accountId = '') {
  if (!enabled || !redisClient) return;

  return enqueueRoomStorageOperation(roomId, async () => {
    try {
      await redisClient.del(roomKey(roomId));
      await redisClient.sRem(ROOM_IDS_KEY, roomId);
      if (accountId) await redisClient.sRem(accountRoomsKey(accountId), String(roomId || '').trim().toUpperCase());
    } catch (err) {
      incrementMetric('redis_error_total', { phase: 'delete_room' });
      log.error('redis_delete_room_failed', { roomId, error: err });
    }
  });
}

export async function addRoomToAccountIndex(accountId, roomId) {
  const aid = String(accountId || '').trim();
  const rid = String(roomId || '').trim().toUpperCase();
  if (!enabled || !redisClient || !aid || !rid) return false;
  return enqueueRoomStorageOperation(rid, async () => {
    try {
      await redisClient.sAdd(accountRoomsKey(aid), rid);
      return true;
    } catch (err) {
      incrementMetric('redis_error_total', { phase: 'account_room_index_add' });
      log.error('redis_account_room_index_add_failed', { accountId: aid, roomId: rid, error: err });
      return false;
    }
  });
}

export async function removeRoomFromAccountIndex(accountId, roomId) {
  const aid = String(accountId || '').trim();
  const rid = String(roomId || '').trim().toUpperCase();
  if (!enabled || !redisClient || !aid || !rid) return false;
  return enqueueRoomStorageOperation(rid, async () => {
    try {
      await redisClient.sRem(accountRoomsKey(aid), rid);
      return true;
    } catch (err) {
      incrementMetric('redis_error_total', { phase: 'account_room_index_remove' });
      log.error('redis_account_room_index_remove_failed', { accountId: aid, roomId: rid, error: err });
      return false;
    }
  });
}

export async function listRoomIdsForAccount(accountId) {
  const aid = String(accountId || '').trim();
  if (!enabled || !redisClient || !aid) return [];
  try {
    return await redisClient.sMembers(accountRoomsKey(aid));
  } catch (err) {
    incrementMetric('redis_error_total', { phase: 'account_room_index_list' });
    log.error('redis_account_room_index_list_failed', { accountId: aid, error: err });
    return null;
  }
}

const FAVORITES_PREFIX = 'openmusic:favorites:';
const FAVORITE_CATEGORIES_PREFIX = 'openmusic:favorite-categories:';
const MAX_FAVORITES = 5000;
const MAX_FAVORITE_CATEGORIES = 50;
const MAX_FAVORITE_CATEGORY_NAME_LENGTH = 30;
const FAVORITES_CAS_RETRIES = 8;
const FAVORITE_SHARE_PREFIX = 'openmusic:favorite-share:';
const FAVORITE_SHARE_OWNER_PREFIX = 'openmusic:favorite-share-owner:';
const FAVORITE_SHARE_TOKEN_BYTES = 6;
const FAVORITE_SHARE_TOKEN_LENGTH = 8;
const FAVORITE_SHARE_VERSION = 3;
const FAVORITES_CAS_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if ARGV[1] == '0' then
  if current then return 0 end
elseif not current or current ~= ARGV[2] then
  return 0
end
redis.call('SET', KEYS[1], ARGV[3])
return 1
`;

function favoriteKey(userId) {
  return `${FAVORITES_PREFIX}${userId}`;
}

function favoriteCategoriesKey(userId) {
  return `${FAVORITE_CATEGORIES_PREFIX}${userId}`;
}

function songFavoriteId(song) {
  return `${song?.source || 'netease'}:${song?.id || ''}`;
}

function normalizeFavoriteCategoryName(value) {
  return String(value || '').trim().slice(0, MAX_FAVORITE_CATEGORY_NAME_LENGTH);
}

export function applyFavoriteCategory(items, favorite, category) {
  const targetId = songFavoriteId(favorite);
  const nextCategory = normalizeFavoriteCategoryName(category);
  return items.map((item) => {
    if (songFavoriteId(item) !== targetId) return item;
    if (nextCategory) return { ...item, category: nextCategory };
    const { category: _category, ...withoutCategory } = item;
    return withoutCategory;
  });
}

function normalizeFavoriteSong(song) {
  if (!song || typeof song !== 'object') return null;
  const id = String(song.id || '').trim();
  const source = String(song.source || 'netease').trim();
  const name = String(song.name || '').trim();
  const artist = String(song.artist || '').trim();
  if (!id || !source || !name) return null;
  return {
    id,
    source,
    name,
    artist,
    album: String(song.album || '').trim(),
    pic: String(song.pic || '').trim(),
    duration: Number.isFinite(Number(song.duration)) ? Number(song.duration) : undefined,
    url: song.url ? String(song.url) : undefined,
    lrc: song.lrc ? String(song.lrc) : undefined,
    ...(normalizeFavoriteCategoryName(song.category) ? { category: normalizeFavoriteCategoryName(song.category) } : {}),
    favoritedAt: Date.now(),
  };
}

function parseFavorites(raw) {
  if (!raw) return [];
  try {
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

async function readFavoritesSnapshot(userId) {
  if (!enabled || !redisClient) return [];
  const raw = await redisClient.get(favoriteKey(userId));
  return { raw, items: parseFavorites(raw) };
}

async function readFavorites(userId) {
  const snapshot = await readFavoritesSnapshot(userId);
  return Array.isArray(snapshot) ? snapshot : snapshot.items;
}

function capFavorites(items) {
  return items.slice(0, MAX_FAVORITES);
}

async function compareAndSwapFavorites(userId, expectedRaw, items) {
  if (!enabled || !redisClient) throw new Error('Redis 不可用，收藏无法保存');
  const result = await redisClient.eval(FAVORITES_CAS_SCRIPT, {
    keys: [favoriteKey(userId)],
    arguments: [
      expectedRaw === null ? '0' : '1',
      expectedRaw || '',
      JSON.stringify(capFavorites(items)),
    ],
  });
  return Number(result) === 1;
}

async function mutateFavoritesAtomically(userId, update) {
  if (!enabled || !redisClient) throw new Error('Redis 不可用，收藏无法保存');
  for (let attempt = 0; attempt < FAVORITES_CAS_RETRIES; attempt += 1) {
    const snapshot = await readFavoritesSnapshot(userId);
    const mutation = update(snapshot.items);
    const items = capFavorites(mutation.items);
    if (await compareAndSwapFavorites(userId, snapshot.raw, items)) {
      return { ...mutation, items };
    }
  }
  const error = new Error('收藏状态已被并发修改，请重试');
  error.code = 'FAVORITES_CONFLICT';
  throw error;
}

export async function listFavoriteSongs(userId) {
  const id = String(userId || '').trim();
  if (!id) return [];
  return readFavorites(id);
}

export async function retainMigratedFavoriteSource(userId) {
  const id = String(userId || '').trim();
  if (!id || !enabled || !redisClient) return false;
  try {
    return await expireMigratedFavoriteSource(redisClient, [
      favoriteKey(id),
      favoriteCategoriesKey(id),
    ]);
  } catch (error) {
    incrementMetric('redis_error_total', { phase: 'favorite_migration_source_retention' });
    log.error('favorite_migration_source_retention_failed', { userId: id, error });
    return false;
  }
}

export async function listFavoriteCategories(userId) {
  const id = String(userId || '').trim();
  if (!id || !enabled || !redisClient) return [];
  try {
    const raw = await redisClient.get(favoriteCategoriesKey(id));
    const categories = JSON.parse(raw || '[]');
    return Array.isArray(categories)
      ? categories.filter((category) => typeof category === 'string').slice(0, MAX_FAVORITE_CATEGORIES)
      : [];
  } catch {
    return [];
  }
}

export async function importFavoriteCategories(userId, categories) {
  const id = String(userId || '').trim();
  if (!id || !Array.isArray(categories)) return { error: '收藏分类数据格式无效' };
  if (!enabled || !redisClient) return { error: 'Redis 不可用，分类无法保存' };
  const current = await listFavoriteCategories(id);
  const next = [...current];
  for (const value of categories) {
    const name = normalizeFavoriteCategoryName(value);
    if (!name || next.some((item) => item.toLowerCase() === name.toLowerCase())) continue;
    if (next.length >= MAX_FAVORITE_CATEGORIES) break;
    next.push(name);
  }
  try {
    await redisClient.set(favoriteCategoriesKey(id), JSON.stringify(next));
    return { categories: next };
  } catch (error) {
    return { error: error.message || '收藏分类保存失败' };
  }
}

export async function createFavoriteCategory(userId, name) {
  const id = String(userId || '').trim();
  const rawCategoryName = String(name || '').trim();
  const categoryName = normalizeFavoriteCategoryName(rawCategoryName);
  if (!id) return { error: '用户身份无效' };
  if (!categoryName || categoryName.length !== rawCategoryName.length) {
    return { error: `分类名称需为 1-${MAX_FAVORITE_CATEGORY_NAME_LENGTH} 个字符` };
  }
  if (categoryName === '未分类') return { error: '“未分类”是系统分类，不能重复创建' };
  if (!enabled || !redisClient) return { error: 'Redis 不可用，分类无法保存' };

  try {
    const categories = await listFavoriteCategories(id);
    if (categories.some((category) => category.toLowerCase() === categoryName.toLowerCase())) {
      return { error: '该分类已存在' };
    }
    if (categories.length >= MAX_FAVORITE_CATEGORIES) return { error: '自定义分类已达到上限' };
    const nextCategories = [...categories, categoryName];
    await redisClient.set(favoriteCategoriesKey(id), JSON.stringify(nextCategories));
    return { categories: nextCategories, category: categoryName };
  } catch (error) {
    return { error: error.message || '分类保存失败' };
  }
}

export async function setFavoriteCategory(userId, favorite, category) {
  const id = String(userId || '').trim();
  const favoriteId = songFavoriteId(favorite);
  const rawCategory = String(category || '').trim();
  const categoryName = normalizeFavoriteCategoryName(rawCategory);
  if (!id || !favoriteId || favoriteId.endsWith(':')) return { error: '收藏歌曲无效' };
  if (rawCategory && (!categoryName || categoryName.length !== rawCategory.length)) {
    return { error: `分类名称需为 1-${MAX_FAVORITE_CATEGORY_NAME_LENGTH} 个字符` };
  }

  try {
    let resolvedCategory = '';
    if (categoryName) {
      const categories = await listFavoriteCategories(id);
      resolvedCategory = categories.find((item) => item.toLowerCase() === categoryName.toLowerCase()) || '';
      if (!resolvedCategory) return { error: '请选择已创建的收藏分类' };
    }
    const mutation = await mutateFavoritesAtomically(id, (items) => {
      const exists = items.some((item) => songFavoriteId(item) === favoriteId);
      return {
        items: exists ? applyFavoriteCategory(items, favorite, resolvedCategory) : items,
        updated: exists,
      };
    });
    if (!mutation.updated) return { error: '收藏歌曲不存在' };
    return { favorites: mutation.items, category: resolvedCategory || null };
  } catch (err) {
    return { error: err.message || '收藏分类保存失败' };
  }
}

export async function setFavoriteSong(userId, song, favorite) {
  const id = String(userId || '').trim();
  const clean = normalizeFavoriteSong(song);
  if (!id || !clean) return { error: '收藏歌曲无效' };

  try {
    const mutation = await mutateFavoritesAtomically(id, (items) => {
      const favId = songFavoriteId(clean);
      const exists = items.some((item) => songFavoriteId(item) === favId);
      let next = items;
      if (favorite && !exists) {
        next = [clean, ...items];
      } else if (!favorite && exists) {
        next = items.filter((item) => songFavoriteId(item) !== favId);
      }
      return { items: next };
    });
    return { favorites: mutation.items, favorite: Boolean(favorite) };
  } catch (err) {
    return { error: err.message || '收藏保存失败' };
  }
}

function favoriteShareKey(code) {
  return `${FAVORITE_SHARE_PREFIX}${code}`;
}

function favoriteShareOwnerKey(userId) {
  return `${FAVORITE_SHARE_OWNER_PREFIX}${userId}`;
}

function normalizeFavoriteShareCode(code) {
  return String(code || '').trim();
}

function createFavoriteShareCode() {
  return randomBytes(FAVORITE_SHARE_TOKEN_BYTES).toString('base64url');
}

export function isFavoriteShareCode(code) {
  return new RegExp(`^[A-Za-z0-9_-]{${FAVORITE_SHARE_TOKEN_LENGTH}}$`).test(code);
}

/**
 * 分享固定创建时的收藏快照，令牌到期后不可再读取；不再引用分享者的实时收藏。
 */
export function parseFavoriteShareReference(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    const expiresAt = Number(value?.expiresAt) || 0;
    const songs = Array.isArray(value?.songs) ? value.songs : null;
    if (value?.version !== FAVORITE_SHARE_VERSION || !songs || !expiresAt) return null;
    return { version: FAVORITE_SHARE_VERSION, songs, expiresAt };
  } catch {
    return null;
  }
}

async function invalidateFavoriteShareOwner(userId, code = '') {
  const ownerKey = favoriteShareOwnerKey(userId);
  const current = normalizeFavoriteShareCode(await redisClient.get(ownerKey));
  if (!code || current === code) await redisClient.del(ownerKey);
}

async function getExistingFavoriteShareCode(userId) {
  const ownerKey = favoriteShareOwnerKey(userId);
  const code = normalizeFavoriteShareCode(await redisClient.get(ownerKey));
  if (!isFavoriteShareCode(code)) {
    if (code) await redisClient.del(ownerKey);
    return null;
  }
  const reference = parseFavoriteShareReference(await redisClient.get(favoriteShareKey(code)));
  if (reference && reference.expiresAt > Date.now()) return code;
  await redisClient.del(favoriteShareKey(code));
  await invalidateFavoriteShareOwner(userId, code);
  return null;
}

export async function createFavoriteShare(userId) {
  const id = String(userId || '').trim();
  if (!id) return { error: '用户身份无效' };
  if (!enabled || !redisClient) return { error: 'Redis 不可用，分享码无法创建' };

  const existing = await getExistingFavoriteShareCode(id);
  if (existing) {
    const reference = parseFavoriteShareReference(await redisClient.get(favoriteShareKey(existing)));
    return { code: existing, count: reference?.songs.length || 0, expiresAt: reference?.expiresAt || 0 };
  }

  const songs = await listFavoriteSongs(id);
  const favoriteShareTtlMs = getRuntimeConfig().favoriteShareTtlMs;
  const expiresAt = Date.now() + favoriteShareTtlMs;
  const reference = JSON.stringify({
    version: FAVORITE_SHARE_VERSION,
    songs,
    createdAt: Date.now(),
    expiresAt,
  });
  const ttl = Math.max(1, Math.ceil(favoriteShareTtlMs / 1000));

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = createFavoriteShareCode();
    const created = await redisClient.set(favoriteShareKey(code), reference, { NX: true, EX: ttl });
    if (created !== 'OK') continue;

    const ownerSet = await redisClient.set(favoriteShareOwnerKey(id), code, { NX: true, EX: ttl });
    if (ownerSet === 'OK') return { code, count: songs.length, expiresAt };

    // 另一个并发请求先完成了该用户的创建；删除本次未被引用的随机码。
    await redisClient.del(favoriteShareKey(code));
    const winner = await getExistingFavoriteShareCode(id);
    if (winner) {
      const winnerReference = parseFavoriteShareReference(await redisClient.get(favoriteShareKey(winner)));
      return { code: winner, count: winnerReference?.songs.length || 0, expiresAt: winnerReference?.expiresAt || 0 };
    }
  }
  return { error: '分享码创建失败，请重试' };
}

export async function revokeFavoriteShare(userId) {
  const id = String(userId || '').trim();
  if (!id) return { error: '用户身份无效' };
  if (!enabled || !redisClient) return { error: 'Redis 不可用，分享码无法撤销' };
  const code = normalizeFavoriteShareCode(await redisClient.get(favoriteShareOwnerKey(id)));
  if (!code) return { revoked: false };
  await redisClient.del(favoriteShareOwnerKey(id));
  if (isFavoriteShareCode(code)) await redisClient.del(favoriteShareKey(code));
  return { revoked: true };
}

export async function previewFavoriteShare(code) {
  const normalized = normalizeFavoriteShareCode(code);
  if (!isFavoriteShareCode(normalized) || !enabled || !redisClient) return { error: '分享码无效' };
  const reference = parseFavoriteShareReference(await redisClient.get(favoriteShareKey(normalized)));
  if (!reference) return { error: '分享码无效或已过期' };
  if (reference.expiresAt <= Date.now()) {
    await redisClient.del(favoriteShareKey(normalized));
    return { error: '分享码已过期' };
  }
  return { code: normalized, songs: reference.songs, expiresAt: reference.expiresAt };
}

export async function importFavoriteShare(userId, code, selectedIds) {
  const preview = await previewFavoriteShare(code);
  if (preview.error) return preview;
  if (!Array.isArray(selectedIds) || selectedIds.length === 0 || selectedIds.length > 1000) return { error: '请选择要导入的歌曲' };
  const selected = new Set(selectedIds.map((id) => String(id || '').trim()).filter(Boolean));
  const songs = preview.songs.filter((song) => selected.has(songFavoriteId(song)) || selected.has(`${song.source || 'netease'}-${song.id}`));
  if (!songs.length) return { error: '没有可导入的歌曲' };
  return importFavoriteSongs(userId, songs);
}

export async function importFavoriteSongs(userId, songs, options = {}) {
  const id = String(userId || '').trim();
  if (!id) return { error: '用户身份无效' };
  if (!Array.isArray(songs)) return { error: '收藏数据格式无效' };

  const imported = songs.map(normalizeFavoriteSong).filter(Boolean);
  if (imported.length === 0) return { error: '没有可导入的歌曲' };

  try {
    const mutation = await mutateFavoritesAtomically(id, (items) => {
      // 已有收藏优先保留：导入只填补剩余容量，不能静默挤掉用户旧收藏。
      const current = capFavorites(items);
      if (options.preserveExistingOrder) {
        return appendMissingFavoriteSongs(current, imported, MAX_FAVORITES);
      }
      const seen = new Set(current.map(songFavoriteId));
      const candidates = [];

      for (const song of imported) {
        const favId = songFavoriteId(song);
        if (seen.has(favId)) continue;
        seen.add(favId);
        candidates.push(song);
      }

      const accepted = candidates.slice(0, Math.max(0, MAX_FAVORITES - current.length));
      return {
        items: [...accepted, ...current],
        imported: accepted.length,
        dropped: candidates.length - accepted.length,
      };
    });
    return {
      favorites: mutation.items,
      imported: mutation.imported,
      dropped: mutation.dropped,
      maxFavorites: MAX_FAVORITES,
    };
  } catch (err) {
    return { error: err.message || '收藏保存失败' };
  }
}
