import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRoomAvatarUrl } from './avatarImage';

const localAvatar = 'data:image/png;base64,local';
const roomAvatar = 'data:image/png;base64,room';

test('本机头像缺失时回退到房间内保存的头像', () => {
  assert.equal(resolveRoomAvatarUrl('', roomAvatar), roomAvatar);
});

test('本机头像有效时优先使用本机头像', () => {
  assert.equal(resolveRoomAvatarUrl(localAvatar, roomAvatar), localAvatar);
});
