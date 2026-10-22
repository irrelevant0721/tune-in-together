import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useRoomStore } from '../stores/roomStore';
import { useAudioStore } from '../stores/audioStore';
import { searchSongs } from '../api/music';
import { friendsRequest, loadLibrary, type CurrentLike, type SavedPlaylist } from '../api/friends';
import type { MusicSource, Song } from '../types';
import AudioEngine from '../components/AudioEngine';
import SongCover from '../components/SongCover';
import PlaybackProgressBar from '../components/playback/PlaybackProgressBar';
import PlaybackTimeLabel from '../components/playback/PlaybackTimeLabel';
import FriendsLyrics from '../components/FriendsLyrics';
import FriendsVolume from '../components/FriendsVolume';
import FriendsSelect from '../components/FriendsSelect';
import FriendsThemeToggle from '../components/FriendsThemeToggle';
import FriendsSettings from './FriendsSettings';
import FriendsHome from './FriendsHome';
import { useTrackLyrics } from '../hooks/useTrackLyrics';
import { canPauseInRoom, canSeekInRoom } from '../lib/roomPermissions';
import { copyToClipboard } from '../lib/copyToClipboard';
import '../friends.css';

export default function FriendsRoom() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const api = useSocket();
  const { leaveRoom } = api;
  const room = useRoomStore((s) => s.room);
  const control = useRoomStore((s) => s.canControlPlayback);
  const isOwner = useRoomStore((s) => s.isOwner);
  const reconnecting = useRoomStore((s) => s.isReconnecting);
  const nickname = useRoomStore((s) => s.nickname);
  const exitReason = useRoomStore((s) => s.exitReason);
  const localPlayback = useAudioStore((s) => s.localPlayback);
  const seekPlayback = useAudioStore((s) => s.seekPlayback);
  const [translationLoading, setTranslationLoading] = useState(false);
  const lyrics = useTrackLyrics(room?.current, setTranslationLoading);
  const [joined, setJoined] = useState(location.state?.friendsJoinedRoomId === roomId && room?.id === roomId);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!notice.startsWith('已点歌：')) return;
    const timer = window.setTimeout(() => setNotice(''), 10000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const [source, setSource] = useState<MusicSource>('netease');
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState('');
  const [playlistPage, setPlaylistPage] = useState(1);
  const [playlistQuery, setPlaylistQuery] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [busy, setBusy] = useState(false);
  const [resultPage, setResultPage] = useState(1);
  const [searchSummary, setSearchSummary] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const clearQueueDialog = useRef<HTMLDialogElement>(null);
  const [clearQueueOpen, setClearQueueOpen] = useState(false);
  const [clearQueueError, setClearQueueError] = useState('');
  const playbackDialog = useRef<HTMLDialogElement>(null);
  const playbackSubmitting = useRef(false);
  const [playbackAction, setPlaybackAction] = useState<{ type: 'pause' | 'skip'; trackId: string; name: string } | null>(null);
  const [playbackError, setPlaybackError] = useState('');
  const moveDialog = useRef<HTMLDialogElement>(null);
  const moveSubmitting = useRef(false);
  const [queueMove, setQueueMove] = useState<{ queueId: string; name: string; direction: -1 | 1; orderedIds: string[] } | null>(null);
  const [moveError, setMoveError] = useState('');
  const [like, setLike] = useState<CurrentLike | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);
  const currentSongKey = room?.current ? `${room.current.source}:${room.current.id}` : '';
  const liveSongKey = useRef(currentSongKey);
  liveSongKey.current = currentSongKey;
  const currentTrackId = room?.current?.queueId || currentSongKey;

  useEffect(() => {
    if (queueMove && joined && !reconnecting && room?.id === roomId
      && room.queue.length === queueMove.orderedIds.length
      && room.queue.every((song, index) => song.queueId === queueMove.orderedIds[index])) {
      moveDialog.current?.showModal();
    } else {
      moveDialog.current?.close();
      if (queueMove) setQueueMove(null);
    }
  }, [queueMove, joined, reconnecting, room, roomId]);

  useEffect(() => {
    if (playbackAction && joined && room?.id === roomId && currentTrackId === playbackAction.trackId
      && !reconnecting && (playbackAction.type !== 'pause' || (room.isPlaying && canPauseInRoom(room, control)))) {
      playbackDialog.current?.showModal();
    } else {
      playbackDialog.current?.close();
      if (playbackAction) setPlaybackAction(null);
    }
  }, [playbackAction, joined, room, roomId, currentTrackId, reconnecting, control]);

  function requestPlaybackAction(type: 'pause' | 'skip') {
    if (busy || reconnecting || !room?.current) return;
    setPlaybackError('');
    setPlaybackAction({ type, trackId: currentTrackId, name: room.current.name });
  }

  async function confirmPlaybackAction() {
    if (!playbackAction || busy || playbackSubmitting.current) return;
    const state = useRoomStore.getState();
    const track = state.room?.current;
    const trackId = track?.queueId || (track ? `${track.source}:${track.id}` : '');
    if (state.isReconnecting || state.room?.id !== roomId || trackId !== playbackAction.trackId
      || (playbackAction.type === 'pause' && (!state.room.isPlaying || !canPauseInRoom(state.room, state.canControlPlayback)))) {
      setPlaybackAction(null);
      return;
    }
    playbackSubmitting.current = true;
    setBusy(true); setPlaybackError(''); setError(''); setNotice('');
    try {
      if (playbackAction.type === 'pause') {
        if (!await api.togglePlay(false)) throw new Error('暂停失败，请重试');
        const live = useRoomStore.getState().room;
        if (live?.id === roomId && (live.current?.queueId || (live.current ? `${live.current.source}:${live.current.id}` : '')) === trackId) localPlayback?.(false);
      } else {
        const result = await api.skipSong();
        if (!result.success) throw new Error(result.error || '切歌失败，请重试');
      }
      setPlaybackAction(null);
    } catch (err) { setPlaybackError(err instanceof Error ? err.message : '操作失败，请重试'); }
    finally { playbackSubmitting.current = false; setBusy(false); }
  }

  useEffect(() => {
    if (clearQueueOpen && joined && isOwner && room?.queue.length) clearQueueDialog.current?.showModal();
    else { clearQueueDialog.current?.close(); if (clearQueueOpen) setClearQueueOpen(false); }
  }, [clearQueueOpen, joined, isOwner, room?.queue.length]);

  async function removeAllQueuedSongs() {
    if (busy || reconnecting || !isOwner || !room?.queue.length) return;
    setBusy(true); setClearQueueError('');
    try {
      const result = await api.clearQueue();
      if (!result.success) throw new Error(result.error || '移除失败，请重试');
      setClearQueueOpen(false); setNotice('已移除全部待播歌曲');
    } catch (err) { setClearQueueError(err instanceof Error ? err.message : '移除失败，请重试'); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    let active = true;
    setLike(null);
    if (!joined || !currentSongKey || reconnecting) return;
    const refresh = () => friendsRequest<CurrentLike>(`/api/friends/rooms/${encodeURIComponent(roomId)}/like`)
      .then((result) => { if (active && result.songKey === currentSongKey) setLike(result); })
      .catch((err: Error) => { if (active) setError(err.message); });
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [joined, roomId, currentSongKey, reconnecting]);

  async function toggleLike() {
    if (!like || likeBusy || like.songKey !== currentSongKey) return;
    setLikeBusy(true); setError('');
    try {
      const result = await friendsRequest<CurrentLike>(`/api/friends/rooms/${encodeURIComponent(roomId)}/like`, 'PUT', { liked: !like.liked, songKey: currentSongKey });
      if (liveSongKey.current === result.songKey) setLike(result);
    } catch (err) { setError(err instanceof Error ? err.message : '点赞失败'); }
    finally { setLikeBusy(false); }
  }

  useEffect(() => {
    if (settingsOpen) settingsDialog.current?.showModal();
    else settingsDialog.current?.close();
  }, [settingsOpen]);

  useEffect(() => { void loadLibrary().then((data) => {
    if (!data.ready) { navigate(`/settings?next=${encodeURIComponent(`/room/${roomId}`)}`, { replace: true }); return; }
    useRoomStore.getState().setNickname(data.nickname); setPlaylists(data.playlists); setSelectedPlaylist(data.playlists[0]?.id || '');
  }).catch((err: Error) => setError(err.message)); }, [navigate, roomId]);

  useEffect(() => {
    if (location.state?.friendsJoinedRoomId === roomId && room?.id === roomId) setJoined(true);
  }, [location.state, room?.id, roomId]);
  useEffect(() => {
    if (joined) return () => { void leaveRoom(); };
  }, [joined, leaveRoom]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : '操作失败'); }
    finally { setBusy(false); }
  }
  async function add(song: Song) {
    const res = await api.addSong(song);
    if (!res.success) throw new Error(res.error || '添加失败');
    setNotice(`已点歌：${song.name}`);
  }
  function requestQueueMove(queueId: string, direction: -1 | 1) {
    const state = useRoomStore.getState();
    if (busy || state.isReconnecting || state.room?.id !== roomId) return;
    const queue = state.room.queue;
    const index = queue.findIndex((song) => song.queueId === queueId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= queue.length) return;
    if (queue[index].companion || queue[target].companion) return;
    setMoveError('');
    setQueueMove({ queueId, direction, name: queue[index].name, orderedIds: queue.map((song) => song.queueId) });
  }
  async function confirmQueueMove() {
    if (!queueMove || busy || moveSubmitting.current) return;
    const state = useRoomStore.getState();
    const queue = state.room?.queue;
    if (state.isReconnecting || state.room?.id !== roomId || !queue
      || queue.length !== queueMove.orderedIds.length
      || queue.some((song, index) => song.queueId !== queueMove.orderedIds[index])) {
      setQueueMove(null); return;
    }
    const queueIds = [...queueMove.orderedIds];
    const index = queueIds.indexOf(queueMove.queueId);
    const target = index + queueMove.direction;
    if (index < 0 || target < 0 || target >= queueIds.length) { setQueueMove(null); return; }
    [queueIds[index], queueIds[target]] = [queueIds[target], queueIds[index]];
    moveSubmitting.current = true; setBusy(true); setMoveError(''); setError(''); setNotice('');
    try {
      const result = await api.reorderQueue(queueIds, queueMove.queueId);
      if (!result.success) throw new Error(result.error || '移动失败，请重试');
      setQueueMove(null);
    } catch (err) { setMoveError(err instanceof Error ? err.message : '移动失败，请重试'); }
    finally { moveSubmitting.current = false; setBusy(false); }
  }
  async function addAll(songs: Song[]) {
    let added = 0;
    for (let start = 0; start < songs.length; start += 20) {
      const res = await api.addSongs(songs.slice(start, start + 20));
      added += res.added || 0;
      setNotice(`已加入 ${added} / ${songs.length} 首`);
      if (!res.success) throw new Error(res.error || '添加失败');
    }
  }
  const current = room?.current || null;
  const canPause = canPauseInRoom(room, control);
  const canSeek = canSeekInRoom(room, control);
  const pageCount = Math.max(1, Math.ceil(results.length / 50));
  const selectedList = playlists.find((list) => list.id === selectedPlaylist);
  const playlistSongs = useMemo(() => {
    const term = playlistQuery.trim().toLocaleLowerCase();
    return (selectedList?.songs || []).filter((song) => !term || `${song.name}\n${song.artist}`.toLocaleLowerCase().includes(term));
  }, [selectedList, playlistQuery]);
  const playlistPages = Math.max(1, Math.ceil(playlistSongs.length / 50));
  if (!joined) return <FriendsHome initialRoomId={roomId} />;
  return <main className={`friends-app friends-room ${joined && room ? 'friends-room-active' : ''}`}>
    <header className="friends-header friends-room-header">
      <div className="friends-room-heading">
        <h1>{room?.name || '加入音乐房间'}</h1>
        <div className="friends-room-details"><p className="friends-muted">房间号 {roomId} · {reconnecting ? '正在重连…' : joined ? `${room?.users.length || 0} 人一起听` : '准备好耳机，加入朋友'} </p>
        {joined && room && <p className="friends-muted friends-listeners">正在一起听：{room.users.map((user) => `${user.nickname}${user.companion ? '（AI 陪听）' : ''}`).join('、')}</p>}</div>
      </div>
      <div className="friends-header-actions">
      <FriendsThemeToggle />
      {joined && <button onClick={() => void run(async () => { await copyToClipboard(`${window.location.origin}/room/${encodeURIComponent(roomId)}`); setNotice('邀请链接已复制；密码请单独发给朋友'); })}>邀请朋友</button>}
      <button onClick={() => setSettingsOpen(true)}>设置</button>
      <button onClick={() => void leaveRoom().then(() => navigate('/'))}>离开房间</button>
    </div></header>
    <div className="friends-feedback">{error && <p role="alert" className="friends-error">{error}</p>}
    {notice && <p role="status" className="friends-notice">{notice}</p>}
    {exitReason && <p role="alert" className="friends-error">{exitReason}</p>}</div>
    {joined && room && <>
      <AudioEngine />
      <div className="friends-grid">
        <section className="friends-card friends-player">
          {current ? <SongCover song={current} size="medium" className="friends-cover" /> : <div className="friends-cover friends-empty-cover" aria-hidden="true">♫</div>}
          <h2>{current?.name || '还没有播放的歌曲'}</h2><p className="friends-muted">{current?.artist || '从搜索或右侧歌单添加歌曲'}</p>
          {current && <p className="friends-muted">点歌人：{current.requestedBy || '系统推荐'}</p>}
          <div className="friends-controls"><button className={`friends-song-like ${like?.liked ? 'friends-song-liked' : ''}`} aria-label={like?.liked ? '取消当前歌曲点赞' : '点赞当前歌曲'} aria-pressed={Boolean(like?.liked)} disabled={!current || !like || likeBusy || reconnecting} onClick={() => void toggleLike()}><Heart size={18} fill={like?.liked ? 'currentColor' : 'none'} aria-hidden="true" /><span>{like?.liked ? '已赞' : '点赞'}{like && like.likes > 0 ? ` ${like.likes}` : ''}</span></button><button disabled={!current || !canPause || busy || reconnecting} className="friends-primary" onClick={() => { if (room.isPlaying) requestPlaybackAction('pause'); else void run(async () => { if (!await api.togglePlay(true)) throw new Error('播放控制失败'); localPlayback?.(true); }); }}>{room.isPlaying ? '暂停' : '播放'}</button>
            <button disabled={!current || busy || reconnecting} onClick={() => requestPlaybackAction('skip')}>下一首</button>
            <FriendsSelect label="播放模式" disabled={busy} value={room.playMode || 'order'} onChange={(value) => void run(async () => { const res = await api.setRoomPlayMode(value); if (!res.success) throw new Error(res.error || '切换失败'); })} options={[{ value: 'order', label: '顺序播放' }, { value: 'loop-all', label: '列表循环' }, { value: 'shuffle', label: '随机播放' }, { value: 'loop-one', label: '单曲循环' }]} />
          </div>
          <PlaybackProgressBar song={current} disabled={!canSeek} onSeek={(time) => seekPlayback?.(time)} trackClassName="friends-progress-track" fillClassName="friends-progress-fill" />
          <div className="friends-controls"><PlaybackTimeLabel song={current} /><FriendsVolume /></div>
          <div className="friends-lyrics"><FriendsLyrics lines={lyrics} loading={translationLoading} onSeek={canSeek ? (time) => seekPlayback?.(time) : undefined} /></div>
        </section>
        <div className="friends-library">
          <section className="friends-card friends-queue">
            <div className="friends-header friends-queue-header"><h2>待播 <small>{room.queue.length}</small></h2>{isOwner && <button disabled={busy || reconnecting || !room.queue.length} onClick={() => { setClearQueueError(''); setClearQueueOpen(true); }}>一键移除</button>}</div>
            {!room.queue.length && <p className="friends-muted">队列还是空的，点一首喜欢的歌吧。</p>}
            <ol className="friends-song-list">{room.queue.map((song, index) => <li key={song.queueId}>
              <div className="friends-queue-song"><strong>{song.name}</strong><small>{song.artist} · {song.requestedBy}{song.companion ? ' · AI 续播' : ''}</small></div>
              <div className="friends-queue-actions">
                <div className="friends-queue-move">
                  <button aria-label={`将 ${song.name} 上移一位`} disabled={busy || reconnecting || index === 0 || song.companion} onClick={() => requestQueueMove(song.queueId, -1)}>↑ 上移</button>
                  <button aria-label={`将 ${song.name} 下移一位`} disabled={busy || reconnecting || index === room.queue.length - 1 || song.companion || room.queue[index + 1]?.companion} onClick={() => requestQueueMove(song.queueId, 1)}>↓ 下移</button>
                </div>
                <button disabled={busy} onClick={() => void run(async () => { if (!await api.removeSong(song.queueId)) throw new Error('移除失败'); })}>移除</button>
              </div>
            </li>)}</ol>
          </section>
          <section className="friends-card friends-search"><h2>找歌</h2>
            <form className="friends-controls" onSubmit={(e) => { e.preventDefault(); void run(async () => { setSearchSummary(''); setResults([]); const songs = await searchSongs(source, query); setResults(songs); setResultPage(1); setSearchSummary(songs.length ? `找到 ${songs.length} 首歌曲` : '没有找到歌曲，试试其他关键词'); }); }}><FriendsSelect label="搜索平台" value={source} onChange={(value) => setSource(value as MusicSource)} options={[{ value: 'netease', label: '网易云音乐' }, { value: 'tencent', label: 'QQ 音乐' }]} /><input aria-label="搜索歌曲" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="歌名或歌手" required /><button disabled={busy}>搜索</button></form>
            {busy && <p role="status">正在处理…</p>}
            {searchSummary && <p role="status" className="friends-muted friends-search-summary">{searchSummary}</p>}
            {!!results.length && <div id="friends-search-results"><ol className="friends-song-list">{results.slice((resultPage - 1) * 50, resultPage * 50).map((song) => <li key={`${song.source}:${song.id}`}><div><strong>{song.name}</strong><small>{song.artist}</small></div><button disabled={busy} onClick={() => void run(() => add(song))}>点歌</button></li>)}</ol>
              {pageCount > 1 && <div className="friends-controls"><button disabled={resultPage <= 1} onClick={() => setResultPage(resultPage - 1)}>上一页</button><span>{resultPage} / {pageCount}</span><button disabled={resultPage >= pageCount} onClick={() => setResultPage(resultPage + 1)}>下一页</button></div>}</div>}
          </section>
        </div>
        <section className="friends-card friends-saved"><h2>我的歌单</h2>
          <FriendsSelect label="已保存的歌单" fullWidth value={selectedPlaylist} onChange={(value) => { setSelectedPlaylist(value); setPlaylistPage(1); setPlaylistQuery(''); }} options={[{ value: '', label: '选择歌单' }, ...playlists.map((list) => ({ value: list.id, label: `${list.name} · ${list.songs.length} 首` }))]} />
          {!playlists.length && <p className="friends-muted">先到设置中导入歌单。</p>}
          {selectedList && <>
            <div className="friends-controls friends-playlist-filter"><input type="search" aria-label="搜索歌单内的歌曲" placeholder="在当前歌单搜歌名或歌手" value={playlistQuery} onChange={(e) => { setPlaylistQuery(e.target.value); setPlaylistPage(1); }} />{playlistQuery && <button onClick={() => { setPlaylistQuery(''); setPlaylistPage(1); }}>清除</button>}</div>
            <div className="friends-controls"><button disabled={busy || !playlistSongs.length} className="friends-primary" onClick={() => void run(() => addAll(playlistSongs))}>{playlistQuery.trim() ? '匹配歌曲加入待播' : '歌单加入待播'}</button><span className="friends-muted">{playlistSongs.length} 首</span></div>
            {!playlistSongs.length && <p role="status" className="friends-muted">没有匹配的歌曲，试试其他歌名或歌手。</p>}
            <ol className="friends-song-list" key={`${selectedPlaylist}:${playlistPage}:${playlistQuery}`}>{playlistSongs.slice((playlistPage - 1) * 50, playlistPage * 50).map((song) => <li key={`${song.source}:${song.id}`}><div><strong>{song.name}</strong><small>{song.artist}</small></div><button disabled={busy} onClick={() => void run(() => add(song))}>加入</button></li>)}</ol>
            {playlistPages > 1 && <div className="friends-controls"><button disabled={playlistPage <= 1} onClick={() => setPlaylistPage(playlistPage - 1)}>上一页</button><span>{playlistPage} / {playlistPages}</span><button disabled={playlistPage >= playlistPages} onClick={() => setPlaylistPage(playlistPage + 1)}>下一页</button></div>}
          </>}
        </section>
      </div>
    </>}
    <dialog ref={moveDialog} className="friends-clear-queue-dialog" aria-labelledby="friends-move-confirm-title" aria-describedby="friends-move-confirm-description" onCancel={(event) => { if (moveSubmitting.current) event.preventDefault(); else setQueueMove(null); }} onClose={() => setQueueMove(null)}>
      <h2 id="friends-move-confirm-title">{queueMove?.direction === -1 ? '确认上移？' : '确认下移？'}</h2>
      <p id="friends-move-confirm-description" className="friends-muted">将「{queueMove?.name}」{queueMove?.direction === -1 ? '上移' : '下移'}一位，房间内所有人的待播顺序都会同步变化。</p>
      {moveError && <p className="friends-error" role="alert">{moveError}</p>}
      <div className="friends-controls"><button autoFocus disabled={busy} onClick={() => setQueueMove(null)}>取消</button><button className="friends-primary" disabled={busy || reconnecting || !queueMove} onClick={() => void confirmQueueMove()}>{busy ? '正在移动…' : queueMove?.direction === -1 ? '确认上移' : '确认下移'}</button></div>
    </dialog>
    <dialog ref={playbackDialog} className="friends-clear-queue-dialog" aria-labelledby="friends-playback-confirm-title" aria-describedby="friends-playback-confirm-description" onCancel={(event) => { if (playbackSubmitting.current) event.preventDefault(); else setPlaybackAction(null); }} onClose={() => setPlaybackAction(null)}>
      <h2 id="friends-playback-confirm-title">{playbackAction?.type === 'pause' ? '确认暂停？' : '确认切换下一首？'}</h2>
      <p id="friends-playback-confirm-description" className="friends-muted">{playbackAction?.type === 'pause' ? `将暂停「${playbackAction.name}」，房间内所有人都会暂停播放。` : `将结束「${playbackAction?.name || ''}」，切换到下一首歌曲。`}</p>
      {playbackError && <p className="friends-error" role="alert">{playbackError}</p>}
      <div className="friends-controls"><button autoFocus disabled={busy} onClick={() => setPlaybackAction(null)}>取消</button><button className="friends-primary" disabled={busy || reconnecting || !playbackAction} onClick={() => void confirmPlaybackAction()}>{busy ? '正在处理…' : playbackAction?.type === 'pause' ? '确认暂停' : '确认切换'}</button></div>
    </dialog>
    <dialog ref={clearQueueDialog} className="friends-clear-queue-dialog" aria-labelledby="friends-clear-queue-title" aria-describedby="friends-clear-queue-description" onCancel={(event) => { if (busy) event.preventDefault(); else setClearQueueOpen(false); }} onClose={() => setClearQueueOpen(false)}>
      <h2 id="friends-clear-queue-title">确认一键移除？</h2>
      <p id="friends-clear-queue-description" className="friends-muted">将移除全部 {room?.queue.length || 0} 首待播歌曲。当前播放的歌曲会继续播放。</p>
      {clearQueueError && <p className="friends-error" role="alert">{clearQueueError}</p>}
      <div className="friends-controls"><button autoFocus disabled={busy} onClick={() => setClearQueueOpen(false)}>取消</button><button className="friends-primary" disabled={busy || reconnecting || !isOwner || !room?.queue.length} onClick={() => void removeAllQueuedSongs()}>{busy ? '正在移除…' : '确认移除'}</button></div>
    </dialog>
    <dialog ref={settingsDialog} className="friends-settings-dialog" aria-label="设置" onCancel={() => setSettingsOpen(false)} onClose={() => setSettingsOpen(false)}>
      {settingsOpen && <FriendsSettings onClose={() => { setSettingsOpen(false); void loadLibrary().then((data) => { setPlaylists(data.playlists); setSelectedPlaylist((id) => data.playlists.some((list) => list.id === id) ? id : data.playlists[0]?.id || ''); setPlaylistPage(1); }).catch((err: Error) => setError(err.message)); }} onSaved={async (data) => { if (joined && data.nickname !== nickname) { const res = await api.renameUser(data.nickname); if (!res.success) throw new Error(res.error || '房间昵称更新失败'); } }} />}
    </dialog>
  </main>;
}
