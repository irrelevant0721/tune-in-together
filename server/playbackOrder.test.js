import assert from 'node:assert/strict';
import test from 'node:test';
import { selectNextUserRoundRobinSong } from './playbackOrder.js';

const queue = [
  { queueId: 'a-1', requestedById: 'alice' },
  { queueId: 'b-1', requestedById: 'bob' },
  { queueId: 'a-2', requestedById: 'alice' },
  { queueId: 'c-1', requestedById: 'carol' },
];

test('用户轮播默认将离房点歌人置后', () => {
  const next = selectNextUserRoundRobinSong(queue, {
    requesterOrder: ['alice', 'bob', 'carol'],
    lastRequesterId: 'carol',
    onlineUserIds: new Set(['bob', 'carol']),
  });

  assert.equal(next?.queueId, 'b-1');
});

test('关闭离房置后后按原始点歌人轮次继续播放', () => {
  const next = selectNextUserRoundRobinSong(queue, {
    requesterOrder: ['alice', 'bob', 'carol'],
    lastRequesterId: 'carol',
    onlineUserIds: new Set(['bob', 'carol']),
    deferOfflineRequesters: false,
  });

  assert.equal(next?.queueId, 'a-1');
});
