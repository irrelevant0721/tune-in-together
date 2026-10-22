import { useMemo } from 'react';
import type { LyricLine } from '../types';
import SyncedLyricsPane from './playback/SyncedLyricsPane';
import { needsChineseTranslation, withChineseTranslation } from '../lib/friendsLyricLines';

export default function FriendsLyrics({ lines, onSeek, loading = false }: { lines: LyricLine[]; onSeek?: (time: number) => void; loading?: boolean }) {
  const bilingual = useMemo(() => lines.map(withChineseTranslation), [lines]);
  const missing = needsChineseTranslation(bilingual);
  const status = loading && (!lines.length || missing) ? '正在查找中文译文…'
    : missing ? (bilingual.some((line) => line.translation) ? '部分歌词暂未找到中文译文' : '暂未找到匹配的中文译文') : '';
  return <>{status && <p role="status" className="friends-lyric-status">{status}</p>}<SyncedLyricsPane lines={bilingual} scrollable showTranslation onSeek={onSeek} /></>;
}
