import { useEffect, useState } from 'react';
import { getLyrics, parseLrc, getLrcFallbackDurationMs, getTrackKey } from '../api/music';
import { useAudioStore } from '../stores/audioStore';
import type { LyricLine, Song } from '../types';

export function useTrackLyrics(song: (Pick<Song, 'id' | 'source' | 'name' | 'lrc' | 'duration'> & Partial<Pick<Song, 'artist' | 'album'>>) | null | undefined, onLoadingChange?: (loading: boolean) => void) {
  const setLrcDuration = useAudioStore((s) => s.setLrcDuration);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);

  useEffect(() => {
    if (!song) {
      setLyrics([]);
      onLoadingChange?.(false);
      return;
    }

    let cancelled = false;
    setLyrics([]);
    onLoadingChange?.(true);
    getLyrics({
      id: song.id,
      source: song.source || 'netease',
      name: song.name,
      artist: song.artist,
      lrc: song.lrc,
    }, { onOriginal: (lrc) => { if (!cancelled) setLyrics(parseLrc(lrc)); } })
      .then((lrc) => {
        if (cancelled) return;
        const lines = parseLrc(lrc);
        setLyrics(lines);
        if (!song.duration) {
          const ms = getLrcFallbackDurationMs(lrc);
          if (ms) setLrcDuration(getTrackKey(song), ms);
        }
      })
      .catch(() => { if (!cancelled) setLyrics([]); })
      .finally(() => { if (!cancelled) onLoadingChange?.(false); });
    return () => { cancelled = true; };
  }, [song?.id, song?.source, song?.name, song?.artist, song?.lrc, song?.duration, setLrcDuration, onLoadingChange]);

  return lyrics;
}
