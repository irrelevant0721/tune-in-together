import { createManagedMusicQrSession, checkManagedMusicQrSession, getManagedMusicQrCredential, releaseManagedMusicQrCredential, finalizeManagedMusicQrCredential } from './musicQrSessions.js';
import { listFriendsMusicAccounts, bindFriendsMusicAccount } from './metingAdmin.js';

export function mountFriendsSources(app, guards) {
  const requests = new Map();
  const handle = (action) => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const now = Date.now();
    for (const [key, bucket] of requests) if (bucket.until <= now) requests.delete(key);
    const key = String(req.ip || 'admin');
    const bucket = requests.get(key) || { count: 0, until: now + 60000 };
    bucket.count++;
    requests.set(key, bucket);
    if (bucket.count > 40) return res.status(429).json({ success: false, error: '操作过于频繁，请稍后重试', code: 'SOURCE_RATE_LIMITED' });
    try {
      const context = { ownerId: 'friends-site-admin', purpose: 'friends-global', sessionId: String(req.body?.sessionId || '').slice(0, 128) };
      const result = await action(req, context);
      res.status(result.ok ? 200 : result.status || 400).json({ success: Boolean(result.ok), data: result.data, error: result.ok ? undefined : result.error || '音源操作失败' });
    } catch { res.status(503).json({ success: false, error: '音源服务暂时不可用' }); }
  };
  app.get('/api/admin/friends-sources', ...guards, handle(() => listFriendsMusicAccounts()));
  app.post('/api/admin/friends-sources/qr/create', ...guards, handle((req, context) => {
    if (!['netease', 'tencent'].includes(req.body?.platform)) return { ok: false, error: '不支持的平台' };
    return createManagedMusicQrSession({ ...context, platform: req.body.platform });
  }));
  app.post('/api/admin/friends-sources/qr/check', ...guards, handle((_req, context) => checkManagedMusicQrSession(context)));
  app.post('/api/admin/friends-sources/bind', ...guards, handle(async (_req, context) => {
    const credential = await getManagedMusicQrCredential(context);
    if (!credential.ok) return credential;
    const result = await bindFriendsMusicAccount(credential.platform, credential.cookie);
    if (result.ok) await finalizeManagedMusicQrCredential(context);
    else await releaseManagedMusicQrCredential(context);
    return result;
  }));
}
