import assert from 'node:assert/strict';
import test from 'node:test';
import { ACCOUNT_SESSION_REVISION_KEY, isAccountSessionRevisionEvent } from './accountSessionSignal';

test('只响应其他标签页写入的账户会话版本事件', () => {
  assert.equal(isAccountSessionRevisionEvent({ key: ACCOUNT_SESSION_REVISION_KEY, newValue: '123' }), true);
  assert.equal(isAccountSessionRevisionEvent({ key: ACCOUNT_SESSION_REVISION_KEY, newValue: null }), false);
  assert.equal(isAccountSessionRevisionEvent({ key: 'other', newValue: '123' }), false);
});
