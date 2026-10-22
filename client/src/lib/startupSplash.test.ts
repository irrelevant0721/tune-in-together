import assert from 'node:assert/strict';
import test from 'node:test';
import { isStartupSplashDismissKey } from './startupSplash';

test('启动页仅接受 Enter 和 Space 键进入应用', () => {
  assert.equal(isStartupSplashDismissKey('Enter'), true);
  assert.equal(isStartupSplashDismissKey(' '), true);
  assert.equal(isStartupSplashDismissKey('Spacebar'), true);
  assert.equal(isStartupSplashDismissKey('Escape'), false);
});

test('启动页降级抽样保留完整音符，仅减少唱片粒子', async () => {
  const particleField = await import('./startupParticleField');
  const shouldRenderParticle = Reflect.get(particleField, 'shouldRenderStartupParticle');

  assert.equal(typeof shouldRenderParticle, 'function');
  if (typeof shouldRenderParticle !== 'function') return;

  assert.equal(shouldRenderParticle(0, false, 2), true);
  assert.equal(shouldRenderParticle(1, false, 2), false);
  assert.equal(shouldRenderParticle(0, true, 2), true);
  assert.equal(shouldRenderParticle(1, true, 2), true);
});
