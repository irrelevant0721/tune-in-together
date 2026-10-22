import { createHash } from 'node:crypto';
import { getRedisClient } from './roomStorage.js';
import { sanitizeFavoriteSongInput } from './favoriteSongInput.js';

// Additive schema: one Redis hash per verified browser identity; each playlist is
// written independently so imports from two tabs cannot overwrite each other.
export function mountFriendsLibrary(app, { requireIdentity, consumeLimit, importPlaylist }) {
  const handle = (action) => async (req, res) => {
    const identity = requireIdentity(req, res);
    if (!identity) return;
    if (!consumeLimit(req)) return res.status(429).json({ error: '操作过于频繁', code: 'LIBRARY_RATE_LIMITED' });
    const redis = getRedisClient();
    if (!redis) return res.status(503).json({ error: '歌单存储暂时不可用', code: 'LIBRARY_UNAVAILABLE' });
    res.set('Cache-Control', 'no-store');
    try { await action(req, res, redis, `openmusic:friends-library:v1:${identity.userId}`); }
    catch { res.status(503).json({ error: '歌单操作失败，请重试', code: 'LIBRARY_FAILED' }); }
  };
  app.get('/api/friends/library', handle(async (_req, res, redis, key) => {
    const data = await redis.hGetAll(key);
    res.json({ nickname: data.nickname || '', ready: data.ready === '1', playlists: Object.entries(data).filter(([field]) => field.startsWith('playlist:')).map(([, value]) => JSON.parse(value)) });
  }));
  app.put('/api/friends/profile', handle(async (req, res, redis, key) => {
    const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';
    if (!nickname || nickname.length > 24) return res.status(400).json({ error: '昵称需为 1–24 个字', code: 'INVALID_NICKNAME' });
    await redis.hSet(key, { nickname, ...(req.body?.ready === true ? { ready: '1' } : {}) });
    res.json({ success: true });
  }));
  app.post('/api/friends/playlists', handle(async (req, res, redis, key) => {
    const { platform, input } = req.body || {};
    if (!['netease', 'qq'].includes(platform) || typeof input !== 'string' || !input.trim() || input.length > 1000) return res.status(400).json({ error: '请输入 QQ 或网易云歌单链接或 ID', code: 'INVALID_PLAYLIST' });
    let result;
    try { result = await importPlaylist(platform, input.trim()); }
    catch { return res.status(400).json({ error: '导入失败，请检查歌单是否公开及链接是否正确', code: 'PLAYLIST_IMPORT_FAILED' }); }
    const id = createHash('sha256').update(`${platform}:${result.playlistId || input.trim()}`).digest('hex').slice(0, 24);
    const songs = result.songs.slice(0, 1000).map(sanitizeFavoriteSongInput).filter(Boolean);
    if (!songs.length) return res.status(400).json({ error: '歌单没有可导入的歌曲', code: 'EMPTY_PLAYLIST' });
    const playlist = { id, platform, name: String(result.name || '歌单').slice(0, 160), songs, updatedAt: Date.now() };
    const saved = await redis.eval(`if redis.call('HEXISTS', KEYS[1], ARGV[1]) == 0 and redis.call('HLEN', KEYS[1]) >= 52 then return 0 end redis.call('HSET', KEYS[1], ARGV[1], ARGV[2]) return 1`, { keys: [key], arguments: [`playlist:${id}`, JSON.stringify(playlist)] });
    if (!saved) return res.status(409).json({ error: '最多保存 50 个歌单', code: 'LIBRARY_FULL' });
    res.json({ playlist });
  }));
  app.delete('/api/friends/playlists/:id', handle(async (req, res, redis, key) => {
    if (!/^[a-f0-9]{24}$/.test(req.params.id)) return res.status(400).json({ error: '歌单 ID 无效', code: 'INVALID_PLAYLIST_ID' });
    await redis.hDel(key, `playlist:${req.params.id}`);
    res.json({ success: true });
  }));
}
