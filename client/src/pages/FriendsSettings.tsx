import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { friendsRequest, loadLibrary, type FriendsLibrary } from '../api/friends';
import { useRoomStore } from '../stores/roomStore';
import FriendsSources from '../components/FriendsSources';
import FriendsSelect from '../components/FriendsSelect';
import FriendsThemeToggle from '../components/FriendsThemeToggle';
import FriendsListeningSummary from '../components/FriendsListeningSummary';
import '../friends.css';

export default function FriendsSettings({ onClose, onSaved }: { onClose?: () => void; onSaved?: (library: FriendsLibrary) => Promise<void> } = {}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [library, setLibrary] = useState<FriendsLibrary | null>(null);
  const [nickname, setNickname] = useState(useRoomStore.getState().nickname);
  const [platform, setPlatform] = useState('netease');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { void loadLibrary().then((data) => { setLibrary(data); if (data.nickname) setNickname(data.nickname); }).catch((err: Error) => setError(err.message)); }, []);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : '操作失败'); } finally { setBusy(false); }
  }
  async function saveProfile() {
    await friendsRequest('/api/friends/profile', 'PUT', { nickname: nickname.trim(), ready: true });
    const data = await loadLibrary();
    await onSaved?.(data);
    useRoomStore.getState().setNickname(nickname.trim());
    setLibrary(data);
    setNotice('昵称已自动保存');
  }
  async function save() {
    await saveProfile();
    const next = params.get('next');
    navigate(next && /^\/room\/[A-Za-z0-9_-]+$/.test(next) ? next : '/');
  }
  async function close() {
    if (library?.ready && nickname.trim() !== library.nickname) await saveProfile();
    if (onClose) onClose(); else navigate('/');
  }
  return <main className="friends-app friends-settings">
    <header className="friends-header friends-settings-header"><div className="friends-header-actions"><FriendsThemeToggle />{(onClose || library?.ready) && <button disabled={busy} onClick={() => void run(close)}>{onClose ? '返回房间' : '返回首页'}</button>}</div></header>
    <h1>{library?.ready ? '设置' : '开始一起听'}</h1>
    {error && <p className="friends-error" role="alert">{error}</p>}{notice && <p className="friends-notice" role="status">{notice}</p>}
    {!library && !error && <p>正在读取账号…</p>}
    {library && <>
      <section className="friends-card"><h2>我的账号</h2><label>名字<input maxLength={24} value={nickname} onChange={(e) => setNickname(e.target.value)} onBlur={() => { if (library.ready && nickname.trim() !== library.nickname) void run(saveProfile); }} placeholder="朋友怎么称呼你" /></label><p className="friends-muted">这台浏览器会记住你的账号；昵称修改后自动保存，歌单和听歌记录保存在服务器。</p></section>
      {library.ready && <FriendsListeningSummary />}
      <section className="friends-card"><h2>我的歌单</h2>
        <form className="friends-controls" onSubmit={(e) => { e.preventDefault(); void run(async () => { await friendsRequest('/api/friends/playlists', 'POST', { platform, input }); setLibrary(await loadLibrary()); setInput(''); setNotice('歌单已保存'); }); }}>
          <FriendsSelect label="歌单平台" value={platform} onChange={setPlatform} options={[{ value: 'netease', label: '网易云音乐' }, { value: 'qq', label: 'QQ 音乐' }]} /><input aria-label="歌单链接" value={input} onChange={(e) => setInput(e.target.value)} placeholder="公开歌单分享链接或 ID" required /><button disabled={busy}>导入歌单</button>
        </form>{busy && <p role="status">正在保存，请稍候…</p>}
        <ol className="friends-song-list">{library.playlists.map((list) => <li key={list.id}><div><strong>{list.name}</strong><small>{list.platform === 'qq' ? 'QQ 音乐' : '网易云'} · {list.songs.length} 首</small></div><button disabled={busy} onClick={() => void run(async () => { await friendsRequest(`/api/friends/playlists/${list.id}`, 'DELETE'); setLibrary(await loadLibrary()); })}>删除</button></li>)}</ol>
        {!library.playlists.length && <p className="friends-muted">可以先导入歌单，也可以稍后在设置中添加。</p>}
      </section>
      {!library.ready && <button className="friends-primary" disabled={busy || !nickname.trim()} onClick={() => void run(save)}>完成，进入一起听</button>}
      {library.ready && <FriendsSources />}
    </>}
  </main>;
}
