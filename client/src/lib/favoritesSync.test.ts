import assert from 'node:assert/strict';
import test from 'node:test';
import type { FavoriteSong } from '../types';
import { buildFavoriteMigrationPlan, migrateFavoriteCache, migrateFavoriteCategories, syncFavoriteBatches, type FavoriteSyncBatchResponse } from './favoritesSync';

const song = (id: number): FavoriteSong => ({ id: String(id), source: 'netease', name: `歌曲 ${id}`, artist: '测试' });

test('超过单次上限的游客收藏会分批完整同步', async () => {
  const batches: number[] = [];
  const result = await syncFavoriteBatches(
    Array.from({ length: 1001 }, (_, index) => song(index + 1)),
    async (songs): Promise<FavoriteSyncBatchResponse> => {
      batches.push(songs.length);
      return { success: true, favorites: songs, imported: songs.length, dropped: 0 };
    },
  );

  assert.deepEqual(batches, [1000, 1]);
  assert.equal(result.success, true);
  assert.equal(result.complete, true);
  assert.equal(result.imported, 1001);
});

test('容量拒绝时保留未完成状态，调用方不可删除游客缓存', async () => {
  const result = await syncFavoriteBatches(
    [song(1), song(2)],
    async (songs): Promise<FavoriteSyncBatchResponse> => ({
      success: true,
      favorites: songs,
      imported: 1,
      dropped: 1,
    }),
  );

  assert.equal(result.success, true);
  assert.equal(result.complete, false);
  assert.equal(result.dropped, 1);
});

test('迁移时保留服务端顺序并补入本地缺失收藏', () => {
  const result = buildFavoriteMigrationPlan([song(2)], [song(1), song(2)]);

  assert.deepEqual(result.favorites, [song(2), song(1)]);
  assert.deepEqual(result.missingLocalFavorites, [song(1)]);
});

test('本地收藏已全部存在于服务端时无需补写', () => {
  const result = buildFavoriteMigrationPlan([song(1), song(2)], [song(2), song(1)]);

  assert.deepEqual(result.favorites, [song(1), song(2)]);
  assert.deepEqual(result.missingLocalFavorites, []);
});

test('服务端已有收藏时仍会补传旧游客缓存中的缺失歌曲', async () => {
  const uploads: FavoriteSong[][] = [];
  const result = await migrateFavoriteCache([song(2)], [song(1), song(2)], async (batch) => {
    uploads.push(batch);
    return { success: true, favorites: [song(1), song(2)], imported: 1, dropped: 0 };
  });

  assert.deepEqual(uploads, [[song(1)]]);
  assert.equal(result.migrated, true);
  assert.deepEqual(result.favorites, [song(1), song(2)]);
});

test('旧游客分类逐项补到服务端后才算迁移完成', async () => {
  const created: string[] = [];
  const result = await migrateFavoriteCategories(
    ['已有', '本地分类'],
    async () => ({ success: true, categories: ['已有'] }),
    async (name) => {
      created.push(name);
      return { success: true, categories: ['已有', name] };
    },
  );

  assert.deepEqual(created, ['本地分类']);
  assert.deepEqual(result, { categories: ['已有', '本地分类'], migrated: true });
});
