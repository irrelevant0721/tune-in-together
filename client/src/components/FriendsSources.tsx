import { useEffect, useRef, useState } from 'react';
import { friendsRequest } from '../api/friends';
import { normalizeQrImage } from '../lib/musicAccountQr';

type SourceAccount = { platform: string; nickname: string; isValid: boolean };
export default function FriendsSources() {
  const [admin, setAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accounts, setAccounts] = useState<SourceAccount[]>([]);
  const [session, setSession] = useState<{ sessionId: string; qrImage?: string; qrimg?: string; platform: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const generation = useRef(0);
  async function refresh() {
    const response = await friendsRequest<{ data: SourceAccount[] }>('/api/admin/friends-sources');
    setAccounts(response.data || []);
  }
  useEffect(() => { void friendsRequest('/api/admin/session').then(() => { setAdmin(true); return refresh(); }).catch(() => {}); return () => { generation.current++; }; }, []);
  useEffect(() => {
    if (!session) return;
    const current = ++generation.current;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await friendsRequest<{ data: { status: string; message?: string } }>('/api/admin/friends-sources/qr/check', 'POST', { sessionId: session.sessionId });
        if (generation.current !== current) return;
        if (result.data.status === 'confirmed') {
          await friendsRequest('/api/admin/friends-sources/bind', 'POST', { sessionId: session.sessionId });
          if (generation.current !== current) return;
          setSession(null); setStatus('已登录，所有房间使用该音源'); await refresh(); return;
        }
        if (['expired', 'error'].includes(result.data.status)) { setSession(null); setError('二维码已失效，请重新扫码'); return; }
        setStatus(result.data.message || '请用音乐平台 App 扫码并确认登录');
        timer = setTimeout(() => void poll(), 3000);
      } catch (err) { if (generation.current === current) { setSession(null); setError(err instanceof Error ? err.message : '扫码失败'); } }
    };
    timer = setTimeout(() => void poll(), 3000);
    return () => { generation.current++; clearTimeout(timer); };
  }, [session]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : '操作失败'); } finally { setBusy(false); }
  }
  return <section className="friends-card"><h2>全站音源账号</h2><p className="friends-muted">网易云和 QQ 音乐账号统一用于所有房间。由站主管理。</p>
    {error && <p className="friends-error" role="alert">{error}</p>}
    {!admin ? <form onSubmit={(e) => { e.preventDefault(); void run(async () => { await friendsRequest('/api/admin/login', 'POST', { username, password }); setPassword(''); setAdmin(true); await refresh(); }); }}><label>管理员用户名<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></label><label>管理员密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label><button disabled={busy}>登录管理音源</button></form> : <>
      <div className="friends-source-grid">{['netease', 'tencent'].map((platform) => { const account = accounts.find((item) => item.platform === platform); return <div key={platform}><h3>{platform === 'netease' ? '网易云音乐' : 'QQ 音乐'}</h3><p>{account ? `${account.nickname || '已登录'}${account.isValid ? '' : ' · 登录已失效'}` : '尚未登录'}</p><button disabled={busy || Boolean(session)} onClick={() => void run(async () => { const data = await friendsRequest<{ data: NonNullable<typeof session> }>('/api/admin/friends-sources/qr/create', 'POST', { platform }); setSession(data.data); setStatus('请扫码登录'); })}>{account ? '更换账号' : '扫码登录'}</button></div>; })}</div>
      {session && <div className="friends-qr"><img alt="音源登录二维码" src={normalizeQrImage(session.qrImage || session.qrimg || '')} /><p>{status}</p><button onClick={() => setSession(null)}>取消扫码</button></div>}
      {!session && status && <p role="status">{status}</p>}
      <button onClick={() => void run(async () => { await friendsRequest('/api/admin/logout', 'POST'); setAdmin(false); setSession(null); setAccounts([]); })}>退出音源管理</button>
    </>}
  </section>;
}
