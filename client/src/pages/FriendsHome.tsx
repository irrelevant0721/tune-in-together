import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../api/music';
import { useRoomStore } from '../stores/roomStore';
import { getStoredRoomPassword, rememberRoomPassword } from '../lib/roomPassword';
import { useSocket } from '../hooks/useSocket';
import { loadLibrary } from '../api/friends';
import FriendsThemeToggle from '../components/FriendsThemeToggle';
import FriendsOpenRooms from '../components/FriendsOpenRooms';
import homeCharacter from '../assets/friends-home-character.png';
import '../friends.css';

export default function FriendsHome({ initialRoomId = '' }: { initialRoomId?: string } = {}) {
  const navigate = useNavigate();
  const { joinRoom } = useSocket();
  const storedNickname = useRoomStore((s) => s.nickname);
  const [nickname, setNickname] = useState(storedNickname);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('朋友的音乐房间');
  const [password, setPassword] = useState(getStoredRoomPassword(initialRoomId) || '');
  const [roomId, setRoomId] = useState(initialRoomId);
  const [pendingRoom, setPendingRoom] = useState(initialRoomId);
  const [created, setCreated] = useState(false);
  const [joinError, setJoinError] = useState('');
  const entryRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { void loadLibrary().then((data) => { if (!data.ready) { navigate('/settings', { replace: true }); return; } setNickname(data.nickname); useRoomStore.getState().setNickname(data.nickname); setLoaded(true); }).catch((err: Error) => setError(err.message)); }, [navigate]);
  useEffect(() => { if (loaded && pendingRoom) entryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [loaded, pendingRoom]);
  async function enter(create: boolean) {
    if (busy) return;
    if (!nickname.trim()) { setError('先填一个昵称吧'); return; }
    if (create && password.trim() && password.trim().length < 4) { setError('房间密码至少 4 位'); return; }
    setError(''); setBusy(true);
    try {
      useRoomStore.getState().setNickname(nickname.trim());
      const id = create ? (await createRoom(name, password)).id : roomId.trim().toUpperCase();
      if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('请输入有效的房间号');
      rememberRoomPassword(id, password);
      setJoinError(''); setCreated(create); setPendingRoom(id);
    } catch (err) { setError(err instanceof Error ? err.message : '暂时连接不上，请重试'); }
    finally { setBusy(false); }
  }
  async function confirmJoin() {
    if (busy) return;
    if (!nickname.trim()) { setJoinError('请先在设置中填写昵称'); return; }
    setBusy(true); setJoinError('');
    try {
      const res = await joinRoom(pendingRoom, nickname.trim(), password || undefined);
      if (!res.success) throw new Error(res.error || '加入失败');
      rememberRoomPassword(pendingRoom, password);
      navigate(`/room/${encodeURIComponent(pendingRoom)}`, { state: { friendsJoinedRoomId: pendingRoom } });
    } catch (err) { setJoinError(err instanceof Error ? err.message : '连接失败，请重试'); }
    finally { setBusy(false); }
  }
  return <main className="friends-app friends-home">
    <div className={`friends-home-layout${pendingRoom ? ' friends-home-layout-expanded' : ''}`}>
    <figure className="friends-home-art" aria-hidden="true"><img src={homeCharacter} alt="" /></figure>
    <div className="friends-home-content">
    {loaded && <><section className="friends-card friends-entry">
      <div className="friends-header"><strong>{nickname}</strong><div className="friends-header-actions"><FriendsThemeToggle /><button onClick={() => navigate('/settings')}>设置</button></div></div>
      <div className="friends-entry-columns">
        <form onSubmit={(e) => { e.preventDefault(); void enter(true); }}><label>房间名称<input maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /></label><button disabled={busy} className="friends-primary">{busy ? '正在连接…' : '创建房间'}</button></form>
        <form onSubmit={(e) => { e.preventDefault(); void enter(false); }}><label>房间号<input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="朋友分享的房间号" required /></label><button disabled={busy}>加入房间</button></form>
      </div>
      {!pendingRoom && <label className="friends-home-password">房间密码（可选）<input type="password" maxLength={64} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="设置密码后，仅知道密码的朋友能加入" /></label>}
      {error && <p role="alert" className="friends-error">{error}</p>}
    </section>
    {pendingRoom && <section ref={entryRef} className="friends-card friends-home-join" aria-label="确认加入房间">
      <h2>{created ? '房间已创建' : '加入音乐房间'}</h2>
      <p className="friends-muted">房间号 {pendingRoom}</p>
      <form onSubmit={(e) => { e.preventDefault(); void confirmJoin(); }}>
        <label>房间密码（没有密码可留空）<input type="password" value={password} maxLength={64} onChange={(e) => setPassword(e.target.value)} /></label>
        {joinError && <p role="alert" className="friends-error">{joinError}</p>}
        <div className="friends-controls"><button disabled={busy} className="friends-primary">{busy ? '正在加入…' : '加入并一起听'}</button><button type="button" disabled={busy} onClick={() => { setPendingRoom(''); setJoinError(''); }}>取消</button></div>
      </form>
    </section>}
    <FriendsOpenRooms disabled={busy} onSelect={(selected) => { setRoomId(selected.id); setPendingRoom(selected.id); setCreated(false); setJoinError(''); setError(''); setPassword(getStoredRoomPassword(selected.id) || ''); }} /></>}
    {!loaded && <p role={error ? 'alert' : 'status'}>{error || '正在读取账号…'}</p>}
    </div></div>
  </main>;
}
