import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlaybackSystemMessage } from './roomManager.js';

test('手动暂停播放生成带操作者昵称的系统提示', () => {
  assert.deepEqual(
    buildPlaybackSystemMessage({ nickname: '小明' }, 'pause'),
    '小明 暂停了播放',
  );
});

test('手动切歌生成带操作者和歌曲名的系统提示', () => {
  assert.deepEqual(
    buildPlaybackSystemMessage({ nickname: '小明' }, 'skip', { name: '晴天' }),
    '小明 切了 《晴天》',
  );
});
