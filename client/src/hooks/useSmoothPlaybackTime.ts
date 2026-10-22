import { useEffect } from 'react';

import { useRoomStore } from '../stores/roomStore';
import { useAudioStore } from '../stores/audioStore';
import { resolveDisplayDurationSeconds } from '../hooks/useTrackDuration';
import { getClientPlaybackState, getPlaybackTime } from '../lib/playbackState';
import { getSharedAudio } from '../lib/audioElement';
import type { Song, QueueItem } from '../types';

type TimeCapSong = Pick<Song, 'duration' | 'id' | 'source'> & Partial<Pick<QueueItem, 'queueId'>>;

let rafId = 0;
let loopSubscribers = 0;
let lastTrackKey = '';
let lastPublishedTime = 0;

function publishSmoothPlaybackTime(time: number, force = false) {
  if (!force && Math.abs(time - lastPublishedTime) < 0.05) return;
  lastPublishedTime = time;
  useAudioStore.getState().setSmoothPlaybackTime(time);
}

function getSongDisplayDurationSec(song: TimeCapSong | null | undefined): number {
  if (!song) return 0;
  const { lrcDurationMs, lrcTrackKey, mediaDurationMs, mediaTrackKey } = useAudioStore.getState();
  return resolveDisplayDurationSeconds(song, {
    lrcDurationMs,
    lrcTrackKey,
    mediaDurationMs,
    mediaTrackKey,
  });
}

function capSongTime(time: number, song: TimeCapSong | null | undefined): number {
  const dur = getSongDisplayDurationSec(song);
  return dur > 0 ? Math.min(time, dur) : time;
}

function stateMatchesSong(song: TimeCapSong | null | undefined): boolean {
  const state = getClientPlaybackState();
  if (!state?.trackId || !song?.queueId) return true;
  return state.trackId === song.queueId;
}

function readAudioCurrentTime(song: TimeCapSong | null | undefined): number | null {
  const audio = getSharedAudio();
  if (!audio.src || !Number.isFinite(audio.currentTime)) return null;
  return capSongTime(audio.currentTime, song);
}

/**
 * 底栏和歌词始终优先使用房间时间轴。
 *
 * 本机聊天卡片 / 搜索试听会临时暂停共享房间 audio；若在占用切换前后
 * 改读 audio.currentTime，会先显示旧位置、完成房间重同步后又跳到新位置。
 * 房主拖动时会同步乐观更新 playback state，因此仍可即时反映手动进度。
 */
function resolveDisplayedPlaybackTime(song: TimeCapSong | null | undefined): number | null {
  if (!song || !stateMatchesSong(song)) return null;
  const state = getClientPlaybackState();
  if (state) return capSongTime(getPlaybackTime(state), song);
  return readAudioCurrentTime(song);
}

function publishAudioTimeForSong(song: TimeCapSong | null | undefined, force = false) {
  if (!stateMatchesSong(song)) return;
  const displayed = resolveDisplayedPlaybackTime(song);
  if (displayed !== null) {
    publishSmoothPlaybackTime(displayed, force);
    return;
  }
  const state = getClientPlaybackState();
  if (state) {
    publishSmoothPlaybackTime(capSongTime(getPlaybackTime(state), song), force);
  }
}

function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

function tick() {
  if (loopSubscribers <= 0) {
    stopLoop();
    return;
  }

  const { room } = useRoomStore.getState();
  publishAudioTimeForSong(room?.current ?? null);
  rafId = requestAnimationFrame(tick);
}

function startLoop() {
  if (!rafId) rafId = requestAnimationFrame(tick);
}

/** seek / 切歌时立即对齐进度 */
export function snapSmoothPlaybackTime(time: number) {
  publishSmoothPlaybackTime(time, true);
}

function readLocalPlaybackTime(song: TimeCapSong | null | undefined): number {
  const displayed = resolveDisplayedPlaybackTime(song);
  if (displayed !== null) return displayed;
  if (!song || !stateMatchesSong(song)) {
    return useAudioStore.getState().smoothPlaybackTime;
  }
  const fromAudio = readAudioCurrentTime(song);
  if (fromAudio !== null) return fromAudio;
  return capSongTime(getPlaybackTime(getClientPlaybackState()), song);
}

/**
 * 歌词/进度条用的高频播放时间（全局单例 RAF）。
 * 有控制权：本机 HTMLAudioElement.currentTime。
 * 听众：房间服务端播放时钟，本机误拖进度不影响展示。
 */
export function useSmoothPlaybackTime(): number {
  const isPlaying = useRoomStore((s) => s.room?.isPlaying ?? false);
  const current = useRoomStore((s) => s.room?.current);
  const playbackVersion = useAudioStore((s) => s.playbackVersion);
  // RAF 写入 smoothPlaybackTime 以驱动重绘；展示值始终读本机 audio
  useAudioStore((s) => s.smoothPlaybackTime);

  useEffect(() => {
    const trackKey = current ? `${current.source}:${current.id}:${current.queueId}` : '';
    const trackChanged = trackKey !== lastTrackKey;
    lastTrackKey = trackKey;

    if (trackChanged) {
      snapSmoothPlaybackTime(0);
    }
  }, [playbackVersion, current?.queueId, current?.id, current?.source]);

  useEffect(() => {
    publishAudioTimeForSong(current ?? null, true);

    if (!isPlaying) {
      return;
    }

    loopSubscribers += 1;
    startLoop();

    return () => {
      loopSubscribers -= 1;
      if (loopSubscribers <= 0) stopLoop();
    };
  }, [isPlaying, current?.queueId, current?.id, current?.source, playbackVersion]);

  return readLocalPlaybackTime(current ?? null);
}
