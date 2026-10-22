import { randomUUID } from 'node:crypto';
import { getRedisClient } from './roomStorage.js';
import { sanitizeFavoriteSongInput } from './favoriteSongInput.js';

const PREFIX = 'openmusic:friends-listening:v1:';
const ACTIVE = `${PREFIX}active`;
const recordKey = (id) => `${PREFIX}session:${id}`;
const totalsKey = (id) => `${PREFIX}totals:${id}`;
const historyKey = (id) => `${PREFIX}history:${id}`;
const songKey = (song) => song ? `${song.source}:${song.id}` : '';

// Redis is authoritative. Serialize sampling and likes so a simultaneous update
// cannot overwrite votes or count the same listening interval twice.
export function createFriendsListening({ readRoom, listRoomIds, redisClient = getRedisClient, now = Date.now }) {
  let pending = Promise.resolve();
  const enqueue = (action) => {
    const result = pending.then(action);
    pending = result.catch(() => {});
    return result;
  };
  function snapshot(roomId) {
    const room = readRoom(roomId);
    return {
      roomId, roomName: String(room?.name || roomId).slice(0, 80),
      users: room ? [...room.users.values()].filter((user) => !user.readOnly || user.companion).map((user) => ({ id: user.id, nickname: String(user.nickname || '朋友').slice(0, 24), ...(user.companion ? { companion: true } : {}) })) : [],
      song: sanitizeFavoriteSongInput(room?.current), playing: Boolean(room?.isPlaying && room?.current),
    };
  }
  async function sample(redis, next, at) {
    const raw = await redis.hGet(ACTIVE, next.roomId);
    let state = raw ? JSON.parse(raw) : null;
    const tx = redis.multi();
    if (state) {
      // A stopped process or unavailable Redis must never manufacture hours of listening.
      const elapsed = Math.max(0, Math.min(at - state.lastAt, 15000));
      const previous = state.previous;
      if (previous.playing && previous.song && elapsed > 0) {
        const key = songKey(previous.song);
        state.songs[key] ||= { song: previous.song, voters: [] };
        for (const user of previous.users) {
          if (user.companion) continue;
          const member = state.members[user.id];
          if (!member) continue;
          member.listeningMs += elapsed;
          tx.hIncrBy(totalsKey(user.id), 'listeningMs', elapsed);
          if (!member.songs.includes(key)) {
            if (!member.songs.length) tx.zAdd(historyKey(user.id), { score: state.startedAt, value: state.id });
            member.songs.push(key);
            tx.hIncrBy(totalsKey(user.id), 'songCount', 1);
          }
          for (const companion of previous.users) {
            if (companion.id !== user.id) member.companions[companion.id] = companion.nickname;
          }
        }
      }
      state.lastAt = at;
      if (!next.users.length) {
        state.endedAt = at;
        if (Object.values(state.members).some((member) => member.songs.length)) tx.set(recordKey(state.id), JSON.stringify(state));
        tx.hDel(ACTIVE, next.roomId);
        await tx.exec();
        return;
      }
    } else {
      if (!next.users.length) return;
      state = { id: randomUUID(), roomId: next.roomId, roomName: next.roomName, startedAt: at, endedAt: null, lastAt: at, members: {}, songs: {} };
    }
    for (const user of next.users) {
      if (!state.members[user.id]) {
        state.members[user.id] = { nickname: user.nickname, listeningMs: 0, songs: [], companions: {} };
      }
      state.members[user.id].nickname = user.nickname;
    }
    state.previous = next;
    if (Object.values(state.members).some((member) => member.songs.length)) tx.set(recordKey(state.id), JSON.stringify(state));
    tx.hSet(ACTIVE, next.roomId, JSON.stringify(state));
    await tx.exec();
  }
  function capture(roomId) {
    const next = snapshot(roomId);
    const at = now();
    return enqueue(async () => {
      const redis = redisClient();
      if (!redis) throw new Error('Listening storage unavailable');
      await sample(redis, next, at);
    });
  }
  async function sampleAll() {
    const redis = redisClient();
    if (!redis) throw new Error('Listening storage unavailable');
    const activeIds = await redis.hKeys(ACTIVE);
    await Promise.all([...new Set([...listRoomIds(), ...activeIds])].map(capture));
  }
  function view(state, userId) {
    const member = state.members[userId];
    if (!member || (member.listeningMs <= 0 && !member.songs.length)) return null;
    return {
      id: state.id, roomName: state.roomName, startedAt: state.startedAt, endedAt: state.endedAt,
      ongoing: !state.endedAt && state.previous.users.some((user) => user.id === userId),
      listeningMs: member.listeningMs, songCount: member.songs.length,
      companions: Object.values(member.companions),
      topSongs: member.songs.map((key) => state.songs[key]).filter((entry) => entry?.voters.length > 0)
        .sort((a, b) => b.voters.length - a.voters.length || a.song.name.localeCompare(b.song.name))
        .slice(0, 3).map((entry) => ({ ...entry.song, likes: entry.voters.length })),
    };
  }
  const summary = (userId, offset = 0) => enqueue(async () => {
    const redis = redisClient();
    if (!redis) throw new Error('Listening storage unavailable');
    const totals = await redis.hGetAll(totalsKey(userId));
    const history = [];
    let cursor = 0;
    let skipped = 0;
    // Filter legacy empty sessions before pagination, so they cannot create
    // blank pages or hide valid listening sessions farther down the index.
    while (history.length < 21) {
      const ids = await redis.zRange(historyKey(userId), cursor, cursor + 99, { REV: true });
      if (!ids.length) break;
      const records = await redis.mGet(ids.map(recordKey));
      for (const raw of records) {
        const record = raw ? view(JSON.parse(raw), userId) : null;
        if (!record) continue;
        if (skipped < offset) { skipped += 1; continue; }
        history.push(record);
        if (history.length === 21) break;
      }
      cursor += ids.length;
      if (ids.length < 100) break;
    }
    return {
      listeningMs: Number(totals.listeningMs) || 0, songCount: Number(totals.songCount) || 0,
      history: history.slice(0, 20),
      hasMore: history.length > 20,
    };
  });
  function currentLike(roomId, userId, desired, expectedSong) {
    const next = snapshot(roomId);
    const at = now();
    return enqueue(async () => {
      const redis = redisClient();
      if (!redis) throw new Error('Listening storage unavailable');
      if (!next.users.some((user) => user.id === userId)) return { status: 403, error: '只有房间成员可以查看或点赞' };
      if (!next.song) return { liked: false, likes: 0, songKey: '' };
      const key = songKey(next.song);
      if (desired !== undefined && key !== expectedSong) return { status: 409, error: '歌曲已切换，请为当前歌曲点赞' };
      await sample(redis, next, at);
      const state = JSON.parse(await redis.hGet(ACTIVE, roomId));
      const entry = state.songs[key] || { song: next.song, voters: [] };
      if (desired !== undefined) {
        entry.voters = entry.voters.filter((id) => id !== userId);
        if (desired) entry.voters.push(userId);
        state.songs[key] = entry;
        const tx = redis.multi().hSet(ACTIVE, roomId, JSON.stringify(state));
        if (Object.values(state.members).some((member) => member.songs.length)) tx.set(recordKey(state.id), JSON.stringify(state));
        await tx.exec();
      }
      return { liked: entry.voters.includes(userId), likes: entry.voters.length, songKey: key };
    });
  }
  return { capture, sampleAll, summary, currentLike };
}

export function mountFriendsListening(app, { requireIdentity, consumeLimit, readRoom, listRoomIds }) {
  const tracker = createFriendsListening({ readRoom, listRoomIds });
  const handle = (action) => async (req, res) => {
    const identity = requireIdentity(req, res);
    if (!identity) return;
    if (!consumeLimit(req)) return res.status(429).json({ error: '操作过于频繁', code: 'LISTENING_RATE_LIMITED' });
    res.set('Cache-Control', 'no-store');
    try { await action(req, res, identity.userId); }
    catch { res.status(503).json({ error: '听歌记录暂时不可用，请稍后重试', code: 'LISTENING_UNAVAILABLE' }); }
  };
  app.get('/api/friends/listening', handle(async (req, res, userId) => {
    const offset = Number(req.query.offset || 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 100000) return res.status(400).json({ error: '页码无效' });
    await tracker.sampleAll();
    res.json(await tracker.summary(userId, offset));
  }));
  const like = (write) => handle(async (req, res, userId) => {
    const roomId = String(req.params.roomId || '').toUpperCase();
    if (!/^[A-Z0-9_-]{1,64}$/.test(roomId) || (write && (typeof req.body?.liked !== 'boolean' || typeof req.body?.songKey !== 'string' || req.body.songKey.length > 100))) return res.status(400).json({ error: '点赞参数无效' });
    const result = await tracker.currentLike(roomId, userId, write ? req.body.liked : undefined, req.body?.songKey);
    if (result.status) return res.status(result.status).json({ error: result.error });
    res.json(result);
  });
  app.get('/api/friends/rooms/:roomId/like', like(false));
  app.put('/api/friends/rooms/:roomId/like', like(true));
  const timer = setInterval(() => { void tracker.sampleAll().catch(() => console.warn('[friends-listening] sampling unavailable')); }, 5000);
  timer.unref();
  return tracker;
}
