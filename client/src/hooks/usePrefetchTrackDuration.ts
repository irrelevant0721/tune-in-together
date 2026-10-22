import { useEffect, useRef } from 'react';
import { useRoomStore } from '../stores/roomStore';
import { useAudioStore } from '../stores/audioStore';
import { getLyrics, getLrcFallbackDurationMs, getTrackKey } from '../api/music';
import { resolveDisplayDurationSeconds } from './useTrackDuration';

/** 切歌后为所有用户预取歌词时长，避免进度条在 duration 缺失时一直为 0 */
export function usePrefetchTrackDuration() {
  const current = useRoomStore((s) => s.room?.current);
  const setLrcDuration = useAudioStore((s) => s.setLrcDuration);
  const genRef = useRef(0);

  useEffect(() => {
    if (!current) return;

    const trackKey = getTrackKey(current);
    const { lrcDurationMs, lrcTrackKey, mediaDurationMs, mediaTrackKey } = useAudioStore.getState();
    if (resolveDisplayDurationSeconds(current, {
      lrcDurationMs,
      lrcTrackKey,
      mediaDurationMs,
      mediaTrackKey,
    }) > 0) {
      return;
    }

    const gen = ++genRef.current;
    getLyrics({
      id: current.id,
      source: current.source || 'netease',
      name: current.name,
      artist: current.artist,
      lrc: current.lrc,
    })
      .then((lrc) => {
        if (gen !== genRef.current) return;
        const ms = getLrcFallbackDurationMs(lrc);
        if (ms) setLrcDuration(trackKey, ms);
      })
      .catch(() => {});
  }, [
    current?.id,
    current?.source,
    current?.queueId,
    current?.name,
    current?.lrc,
    current?.duration,
    setLrcDuration,
  ]);
}
