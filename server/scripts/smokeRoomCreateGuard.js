import assert from 'node:assert/strict';
import {
  checkRoomCreateCooldown,
  recordRoomCreate,
  _resetRoomCreateGuardForTests,
} from '../roomCreateGuard.js';

async function main() {
  _resetRoomCreateGuardForTests();

  const ip = '203.0.113.10';
  const deviceId = 'testdevice12345678';

  // 冷却期内只能建一次
  assert.equal(checkRoomCreateCooldown({ ip, deviceId }).allowed, true);
  recordRoomCreate({ ip, deviceId });
  const blocked = checkRoomCreateCooldown({ ip, deviceId });
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec > 0);

  // 不同设备不受影响
  assert.equal(checkRoomCreateCooldown({ ip: '203.0.113.11', deviceId: 'otherdevice123456' }).allowed, true);

  console.log('roomCreateGuard smoke ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
