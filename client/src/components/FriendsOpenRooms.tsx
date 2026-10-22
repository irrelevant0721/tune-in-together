import { useEffect, useRef, useState } from 'react';
import { Lock, Users } from 'lucide-react';
import { listRooms } from '../api/music';
import type { RoomSummary } from '../types';

export default function FriendsOpenRooms({ onSelect, disabled }: { onSelect: (room: RoomSummary) => void; disabled: boolean }) {
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    let active = true;
    let loading = false;
    const refresh = async () => {
      if (loading) return;
      loading = true; setRefreshing(true);
      try { const result = await listRooms(); if (active) { setRooms(result); setError(''); } }
      catch (err) { if (active) setError(err instanceof Error ? err.message : '读取房间失败，请重试'); }
      finally { loading = false; if (active) setRefreshing(false); }
    };
    refreshRef.current = () => { void refresh(); };
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  return <section className="friends-card friends-open-rooms" aria-label="已开的房间">
    <div className="friends-header"><h2>已开的房间{rooms ? <small> {rooms.length}</small> : ''}</h2><button disabled={refreshing} onClick={() => refreshRef.current()}>{refreshing ? '刷新中…' : '刷新'}</button></div>
    {error && <p role="alert" className="friends-error">{error}</p>}
    {!rooms && !error && <p role="status" className="friends-muted">正在读取房间…</p>}
    {rooms && !rooms.length && <p className="friends-muted">现在还没有开放的房间，创建一个邀请朋友一起听吧。</p>}
    {rooms && rooms.length > 0 && <ul className="friends-open-room-list">{rooms.map((room) => <li key={room.id}>
      <div><strong>{room.name}</strong><small><Users size={13} aria-hidden="true" />{room.userCount} 人 · {room.id}{room.hasPassword && <><Lock size={13} aria-hidden="true" />需要密码</>}{room.isLocked && !room.hasPassword && ' · 暂停加入'}</small><p className="friends-muted">{room.currentSong ? `${room.isPlaying ? '正在听' : '已暂停'}：${room.currentSong.name} · ${room.currentSong.artist}` : '还没有播放歌曲'}</p></div>
      <button disabled={disabled || Boolean(room.isLocked && !room.hasPassword)} aria-label={`加入${room.name}`} onClick={() => onSelect(room)}>加入</button>
    </li>)}</ul>}
  </section>;
}
