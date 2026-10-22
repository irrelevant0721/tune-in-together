import assert from 'node:assert/strict';
import test from 'node:test';
import { planAccountSocketRefresh } from './socketSessionRefresh';

test('账户切换时即使仍在房间也必须先重建 Socket 握手', () => {
  assert.deepEqual(
    planAccountSocketRefresh({ socketActive: true, maintainRoomSession: true }),
    { reconnectSocket: true, rejoinRoom: true },
  );
});

test('未建立 Socket 时只刷新 bootstrap，不额外重连', () => {
  assert.deepEqual(
    planAccountSocketRefresh({ socketActive: false, maintainRoomSession: false }),
    { reconnectSocket: false, rejoinRoom: false },
  );
});
