import { useEffect, useState } from 'react';
import { ChevronDown, Heart, Headphones, Music2 } from 'lucide-react';
import { friendsRequest, type ListeningSummary } from '../api/friends';

export function listeningDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes} 分钟` : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
}

export default function FriendsListeningSummary() {
  const [data, setData] = useState<ListeningSummary | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    const refresh = () => friendsRequest<ListeningSummary>(`/api/friends/listening?offset=${page * 20}`)
      .then((result) => { if (active) { setData(result); setError(''); } })
      .catch((err: Error) => { if (active) setError(err.message); });
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [page, retry]);
  return <section className="friends-card friends-listening-summary" aria-label="听歌总结">
    <h2>听歌总结</h2>
    {error && <p className="friends-error" role="alert">{error} <button onClick={() => setRetry((value) => value + 1)}>重试</button></p>}
    {!data && !error && <p role="status" className="friends-muted">正在读取听歌记录…</p>}
    {data && <>
      <div className="friends-listening-totals">
        <div><Headphones size={20} aria-hidden="true" /><span>总听歌时长</span><strong>{listeningDuration(data.listeningMs)}</strong></div>
        <div><Music2 size={20} aria-hidden="true" /><span>听歌数量</span><strong>{data.songCount} 首</strong></div>
      </div>
      <h3>听歌历史</h3>
      <p className="friends-muted friends-listening-hint">暂停不计时，同一首歌在每次记录中只计一次。</p>
      {!data.history.length && <p className="friends-muted">还没有听歌记录，播放一首歌，开始记录你的音乐时光。</p>}
      <div className="friends-listening-history">{data.history.map((record) => <details key={record.id} className="friends-listening-drawer">
        <summary><div><strong>{record.companions.length ? `和 ${record.companions.join('、')} 一起听` : '我的音乐时光'}</strong><span>{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(record.startedAt)} · {listeningDuration(record.listeningMs)} · {record.songCount} 首{record.ongoing ? ' · 进行中' : ''}</span></div><ChevronDown size={20} aria-hidden="true" /></summary>
        <div className="friends-listening-detail">
          <p className="friends-muted">{record.roomName}</p>
          <p>一起听过的朋友：{record.companions.join('、') || '本次独自听歌'}</p>
          <p>本次听了 <strong>{listeningDuration(record.listeningMs)}</strong>，共 <strong>{record.songCount} 首歌</strong></p>
          <h4>本次点赞最多的歌曲 TOP 3</h4>
          {!record.topSongs.length && <p className="friends-muted">本次听过的歌曲还没有收到点赞。</p>}
          <ol className="friends-listening-top">{record.topSongs.map((song, index) => <li key={`${song.source}:${song.id}`}><span className="friends-listening-rank">{index + 1}</span><div><strong>{song.name}</strong><small>{song.artist}</small></div><span><Heart size={15} aria-hidden="true" />{song.likes} 赞</span></li>)}</ol>
        </div>
      </details>)}</div>
      {(page > 0 || data.hasMore) && <div className="friends-controls"><button disabled={!page} onClick={() => setPage(page - 1)}>上一页</button><span>第 {page + 1} 页</span><button disabled={!data.hasMore} onClick={() => setPage(page + 1)}>下一页</button></div>}
    </>}
  </section>;
}
