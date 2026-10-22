import { createHash, timingSafeEqual } from 'node:crypto';
import { getRuntimeConfig } from './runtimeConfig.js';
import { getRedisClient } from './roomStorage.js';
import { getRoomInternal, verifyRoomPassword, joinListeningCompanion, refreshListeningCompanion, leaveListeningCompanion } from './roomManager.js';
import { COMPANION_PREFIX } from './listeningCompanionQueue.js';

const keyFor = (roomId) => `openmusic:companion:v1:${roomId}`;
const digest = (value) => createHash('sha256').update(value).digest('hex');
const validSession = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

// A short Redis lease keeps a disconnected/stopped bridge from occupying a room.
export function mountListeningCompanion(app, { consumeLimit, changed, config = getRuntimeConfig, storage = getRedisClient }) {
  const active = new Map();
  let pending = Promise.resolve();
  const serial = (action) => {
    const next = pending.catch(() => {}).then(action);
    pending = next;
    return next;
  };
  const wrap = (action) => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!consumeLimit(req)) return res.status(429).json({ error: '请求过于频繁', code: 'COMPANION_RATE_LIMITED' });
    const cfg = config();
    const expected = String(cfg.companionBridgeToken || '');
    const actual = String(req.get('authorization') || '').replace(/^Bearer /, '');
    if (!cfg.companionBridgeEnabled || expected.length < 32
      || !timingSafeEqual(Buffer.from(digest(expected)), Buffer.from(digest(actual)))) {
      return res.status(401).json({ error: '陪听连接未启用或凭证无效', code: 'COMPANION_UNAUTHORIZED' });
    }
    const { roomId, sessionId } = req.body || {};
    if (typeof roomId !== 'string' || !/^[A-Z0-9_-]{1,64}$/.test(roomId) || !validSession(sessionId)) {
      return res.status(400).json({ error: '陪听参数无效', code: 'COMPANION_INVALID_INPUT' });
    }
    const redis = storage();
    if (!redis || redis.isReady === false) return res.status(503).json({ error: '陪听存储暂不可用', code: 'COMPANION_UNAVAILABLE' });
    try {
      await serial(() => action(req, res, { roomId, sessionId, userId: `${COMPANION_PREFIX}${sessionId.slice(0, 40)}`, redis }));
    } catch {
      console.warn('[companion] bridge operation failed');
      if (!res.headersSent) res.status(503).json({ error: '陪听服务暂不可用', code: 'COMPANION_UNAVAILABLE' });
    }
  };
  app.post('/api/companion/join', wrap(async (req, res, ctx) => {
    const { roomId, sessionId, userId, redis } = ctx;
    const nickname = req.body.nickname;
    if (typeof nickname !== 'string' || !nickname.trim() || nickname.length > 80) return res.status(400).json({ error: '陪听昵称无效', code: 'COMPANION_INVALID_INPUT' });
    const room = getRoomInternal(roomId);
    if (!room) return res.status(404).json({ error: '房间不存在', code: 'COMPANION_ROOM_NOT_FOUND' });
    const held = await redis.get(keyFor(roomId));
    if (held && held !== sessionId) return res.status(409).json({ error: '房间已经有另一场陪听', code: 'COMPANION_ROOM_BUSY' });
    // A bridge credential identifies the bot, never grants access to locked rooms.
    const auth = await verifyRoomPassword(roomId, '', { clientId: userId, readOnly: true });
    if (!auth.ok) return res.status(403).json({ error: '房间有密码或已上锁，请先使用公开房间邀请陪听', code: 'COMPANION_PASSWORD_REQUIRED' });
    if (held && !active.has(roomId) && !room.users.has(userId) && room.bannedUserIds?.has(userId)) {
      return res.status(403).json({ error: '陪听 bot 已被移出房间', code: 'COMPANION_REMOVED' });
    }
    await redis.set(keyFor(roomId), sessionId, { EX: 75 });
    const result = room.users.has(userId) ? refreshListeningCompanion(roomId, userId) : joinListeningCompanion(roomId, userId, nickname.trim());
    if (!result || result.error) {
      await redis.del(keyFor(roomId));
      return res.status(403).json({ error: result?.error || '陪听已结束', code: 'COMPANION_JOIN_DENIED' });
    }
    active.set(roomId, { sessionId, userId, expiresAt: Date.now() + 75000 });
    changed(roomId);
    console.info('[companion] join ok');
    res.json(result);
  }));
  app.post('/api/companion/heartbeat', wrap(async (_req, res, { roomId, sessionId, userId, redis }) => {
    if (await redis.get(keyFor(roomId)) !== sessionId) return res.status(410).json({ error: '陪听连接已过期，请重新邀请', code: 'COMPANION_EXPIRED' });
    const room = getRoomInternal(roomId);
    if (!active.has(roomId) && room && !room.users.has(userId) && !room.bannedUserIds?.has(userId)) {
      return res.status(409).json({ error: '音乐服务已重启，请恢复连接', code: 'COMPANION_RECONNECT' });
    }
    const result = refreshListeningCompanion(roomId, userId);
    if (!result) {
      await redis.del(keyFor(roomId));
      active.delete(roomId);
      leaveListeningCompanion(roomId, userId);
      changed(roomId);
      return res.status(410).json({ error: '陪听已结束或 bot 已被移出', code: 'COMPANION_ENDED' });
    }
    await redis.expire(keyFor(roomId), 75);
    active.set(roomId, { sessionId, userId, expiresAt: Date.now() + 75000 });
    res.json(result);
  }));
  app.post('/api/companion/leave', wrap(async (_req, res, { roomId, sessionId, userId, redis }) => {
    const held = await redis.get(keyFor(roomId));
    if (held && held !== sessionId) return res.status(403).json({ error: '不能结束其他会话的陪听', code: 'COMPANION_FORBIDDEN' });
    await redis.del(keyFor(roomId));
    active.delete(roomId);
    leaveListeningCompanion(roomId, userId);
    changed(roomId);
    res.json({ success: true });
  }));
  const timer = setInterval(() => {
    void serial(async () => {
      for (const [roomId, state] of active) {
        const room = getRoomInternal(roomId);
        if (state.expiresAt > Date.now() && config().companionBridgeEnabled
          && room?.users.get(state.userId)?.companion
          && [...room.users.values()].some((user) => !user.readOnly)) continue;
        leaveListeningCompanion(roomId, state.userId);
        active.delete(roomId);
        changed(roomId);
        const redis = storage();
        if (redis && redis.isReady !== false && await redis.get(keyFor(roomId)) === state.sessionId) await redis.del(keyFor(roomId));
      }
    }).catch(() => console.warn('[companion] lease cleanup unavailable'));
  }, 5000);
  timer.unref();
  return { close: () => clearInterval(timer) };
}
