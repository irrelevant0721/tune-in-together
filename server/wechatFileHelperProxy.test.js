import test from 'node:test';
import assert from 'node:assert/strict';
import {
  claimWechatLoginProof,
  createWechatLoginProof,
  verifyWechatLoginProof,
  WECHAT_LOGIN_PROOF_TTL_SEC,
} from './wechatFileHelperProxy.js';

test('微信扫码证明只能由服务端签发并包含短期身份信息', () => {
  const issuedAt = Date.now();
  const token = createWechatLoginProof('001234567890', {
    now: () => issuedAt,
    nonce: () => 'fixed-test-nonce',
  });
  const proof = verifyWechatLoginProof(token);
  assert.equal(proof.uin, '001234567890');
  assert.equal(proof.nonce, 'fixed-test-nonce');
  assert.equal(proof.exp, Math.floor(issuedAt / 1000) + WECHAT_LOGIN_PROOF_TTL_SEC);
  assert.equal(verifyWechatLoginProof(`${token}tampered`), null);
});

test('微信登录证明只能成功消费一次，并以证明中的 UIN 为准', async () => {
  const proof = verifyWechatLoginProof(createWechatLoginProof('001234567890', {
    nonce: () => 'single-use-test-nonce',
  }));
  const claimedKeys = new Set();
  const store = {
    async set(key, value, options) {
      assert.equal(value, '1');
      assert.equal(options.NX, true);
      assert.equal(options.EX, WECHAT_LOGIN_PROOF_TTL_SEC);
      if (claimedKeys.has(key)) return null;
      claimedKeys.add(key);
      return 'OK';
    },
  };

  const first = await claimWechatLoginProof(proof, store);
  assert.equal(first.uin, '001234567890');
  assert.equal(await claimWechatLoginProof(proof, store), null);
});
