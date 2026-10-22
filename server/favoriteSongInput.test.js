import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeFavoriteSongInput } from './favoriteSongInput.js';

const validSong = {
  id: '1901371647',
  source: 'netease',
  name: '测试歌曲',
  artist: '测试歌手',
};

test('收藏同步拒绝未知音源与非法歌曲 ID', () => {
  assert.equal(sanitizeFavoriteSongInput({ ...validSong, source: 'unknown' }), null);
  assert.equal(sanitizeFavoriteSongInput({ ...validSong, id: '../../etc/passwd' }), null);
});

test('收藏同步不持久化客户端播放地址并保留合法分类', () => {
  const result = sanitizeFavoriteSongInput({
    ...validSong,
    url: 'http://169.254.169.254/latest/meta-data',
    lrc: 'untrusted',
    category: '我的收藏',
  });

  assert.deepEqual(result, { ...validSong, category: '我的收藏' });
});
