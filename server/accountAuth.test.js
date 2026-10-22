import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountAuthService } from './accountAuth.js';

function createReadStore(entries = []) {
  const values = new Map(entries);
  return { get: async (key) => values.get(key) ?? null };
}

test('按房间身份反查账户所有者，不能把会话过期的账户身份当游客', async () => {
  const ownerId = 'acct_aaaaaaaaaaaaaaaa';
  const service = createAccountAuthService({
    getStore: () => createReadStore([
      ['openmusic:account:room-identity:account_room_123', ownerId],
    ]),
    isStoreReady: () => true,
  });

  assert.equal(await service.getRoomIdentityOwnerAccountId('account_room_123'), ownerId);
  assert.equal(await service.getRoomIdentityOwnerAccountId('guest_room_123'), null);
});
