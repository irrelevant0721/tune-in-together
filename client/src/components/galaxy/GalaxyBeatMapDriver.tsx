import { useEffect, useRef } from 'react';
import { getSongUrl } from '../../api/music';
import type { QueueItem } from '../../types';
import { getSharedAudio } from '../../lib/audioElement';
import { isProxiedMediaUrl, isSameOriginMediaUrl } from '../../lib/mediaProxyUrl';
import {
  bindBeatMapToSong,
  cancelBeatMapAnalysis,
  resetGalaxyBeatMapState,
} from './lib/galaxyBeatMap';
import { resetGalaxyAudioVisualStateForSongChange } from './lib/galaxyAudio';

interface Props {
  song: Pick<QueueItem, 'queueId' | 'id' | 'source' | 'url'> | null | undefined;
  isPlaying: boolean;
}

function currentAnalyzableAudioUrl(): string | null {
  const audio = getSharedAudio();
  const src = audio.currentSrc || audio.src || '';
  if (!src) return null;
  // blob:（汽水解密结果）与同源/代理地址均可离线分析；外链直链会 CORS 失败
  if (src.startsWith('blob:') || isProxiedMediaUrl(src) || isSameOriginMediaUrl(src)) return src;
  return null;
}

/** 绑定当前曲目并后台分析离线 BeatMap */
export default function GalaxyBeatMapDriver({ song, isPlaying }: Props) {
  const lastQueueIdRef = useRef<string | null>(null);

  useEffect(() => {
    const queueId = song?.queueId ?? null;
    if (!queueId) {
      lastQueueIdRef.current = null;
      cancelBeatMapAnalysis();
      resetGalaxyBeatMapState();
      return;
    }

    if (lastQueueIdRef.current !== queueId) {
      lastQueueIdRef.current = queueId;
      resetGalaxyAudioVisualStateForSongChange();
      resetGalaxyBeatMapState(true);
    }

    let cancelled = false;

    const attach = async () => {
      let audioUrl = currentAnalyzableAudioUrl();
      // 汽水只能等本地解密后的 blob:；禁止 getSongUrl(proxy:true) 把解密打回服务器
      if (!audioUrl && song && (song.source || 'netease') !== 'qishui') {
        try {
          audioUrl = await getSongUrl(song, undefined, { proxy: true });
        } catch {
          audioUrl = null;
        }
      }
      if (cancelled) return;
      bindBeatMapToSong(song, audioUrl, isPlaying);
    };

    void attach();

    const audio = getSharedAudio();
    const onAudioReady = () => {
      if (cancelled || !isPlaying) return;
      void attach();
    };
    audio.addEventListener('loadeddata', onAudioReady);
    audio.addEventListener('canplay', onAudioReady);

    return () => {
      cancelled = true;
      audio.removeEventListener('loadeddata', onAudioReady);
      audio.removeEventListener('canplay', onAudioReady);
    };
  }, [song, isPlaying]);

  useEffect(() => () => cancelBeatMapAnalysis(), []);

  return null;
}
