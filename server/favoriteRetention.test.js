import assert from 'node:assert/strict';
import test from 'node:test';
import { MIGRATED_FAVORITE_RETENTION_SEC, expireMigratedFavoriteSource } from './favoriteRetention.js';

test('成功迁移后为旧游客歌曲和分类设置恢复窗口', async () => {
  const expirations = new Map();
  const redis = {
    expire: async (key, ttlSec) => {
      expirations.set(key, ttlSec);
      return 1;
    },
  };

  await expireMigratedFavoriteSource(redis, [
    'openmusic:favorites:guest_123',
    'openmusic:favorite-categories:guest_123',
  ]);

  assert.deepEqual([...expirations.entries()], [
    ['openmusic:favorites:guest_123', MIGRATED_FAVORITE_RETENTION_SEC],
    ['openmusic:favorite-categories:guest_123', MIGRATED_FAVORITE_RETENTION_SEC],
  ]);
});
