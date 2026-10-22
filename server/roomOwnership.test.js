import assert from 'node:assert/strict';
import test from 'node:test';
import { canRecoverCreatorByDevice } from './roomManager.js';

test('已绑定账户的房间不能仅凭原设备改写房主身份', () => {
  assert.equal(canRecoverCreatorByDevice({
    creatorId: 'account_user_a',
    creatorDeviceId: 'device_1234',
    ownerAccountId: 'account_a',
  }, 'account_user_b', 'device_1234'), false);
});

test('未绑定账户的旧房间仍可由原设备恢复到当前身份', () => {
  assert.equal(canRecoverCreatorByDevice({
    creatorId: 'guest_1234',
    creatorDeviceId: 'device_1234',
    ownerAccountId: null,
  }, 'account_user_a', 'device_1234'), true);
});
