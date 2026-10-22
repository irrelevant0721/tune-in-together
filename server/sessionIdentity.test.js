import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldIssueGuestHandoff, shouldMigrateFavorites } from './sessionIdentity.js';

test('同一稳定房间身份重新登录时仍需签发游客收藏迁移凭证', () => {
  assert.equal(shouldIssueGuestHandoff({ userId: 'guest_same' }, 'guest_same', true), true);
});

test('登录切换到新的房间身份时迁移旧身份的 Redis 收藏', () => {
  assert.equal(shouldMigrateFavorites({ userId: 'guest_old' }, 'account_new', false), true);
  assert.equal(shouldMigrateFavorites({ userId: 'same_user' }, 'same_user'), false);
  assert.equal(shouldMigrateFavorites(null, 'account_new'), false);
});

test('切换账户时不能把前一个账户的收藏迁入新账户', () => {
  assert.equal(shouldMigrateFavorites({ userId: 'account_old' }, 'account_new', true), false);
});

test('账户会话虽已过期，已绑定账户的房间身份仍不能作为游客迁移', () => {
  assert.equal(shouldMigrateFavorites({ userId: 'account_old' }, 'account_new', false, true), false);
});

test('已绑定其他账户的源身份不能获得游客本地补迁移凭证', () => {
  assert.equal(shouldIssueGuestHandoff({ userId: 'account_old' }, 'account_new', false, true), false);
  assert.equal(shouldIssueGuestHandoff({ userId: 'guest_same' }, 'guest_same', false, true), true);
});
