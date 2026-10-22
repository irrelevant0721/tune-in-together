import { create } from 'zustand';
import { applyAllAudioVolume } from '../lib/audioVolume';
import type { MusicSource } from '../types';

const VOLUME_KEY = 'openmusic:volume';

function readStoredVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw == null) return 1;
    const v = Number(raw);
    if (!Number.isFinite(v)) return 1;
    return Math.min(1, Math.max(0, v));
  } catch {
    return 1;
  }
}

interface AudioStore {
  trackLoading: boolean;
  setTrackLoading: (loading: boolean) => void;
  lrcDurationMs: number | null;
  lrcTrackKey: string | null;
  setLrcDuration: (trackKey: string | null, ms: number | null) => void;
  mediaDurationMs: number | null;
  mediaTrackKey: string | null;
  setMediaDuration: (trackKey: string | null, ms: number | null) => void;
  seekPlayback: ((time: number) => void) | null;
  setSeekPlayback: (fn: ((time: number) => void) | null) => void;
  localPlayback: ((isPlaying: boolean) => void) | null;
  setLocalPlayback: (fn: ((isPlaying: boolean) => void) | null) => void;
  /** 仅续播 audio，不改房间乐观态/进度（用于系统媒体卡片关闭误暂停） */
  softResumeLocalAudio: (() => void) | null;
  setSoftResumeLocalAudio: (fn: (() => void) | null) => void;
  needsAudioUnlock: boolean;
  setNeedsAudioUnlock: (needs: boolean) => void;
  retryPlayback: ((fromUserGesture?: boolean) => Promise<void>) | null;
  setRetryPlayback: (fn: ((fromUserGesture?: boolean) => Promise<void>) | null) => void;
  smoothPlaybackTime: number;
  setSmoothPlaybackTime: (time: number) => void;
  playbackVersion: number;
  setPlaybackVersion: (playbackVersion: number) => void;
  trackReloadNonce: number;
  requestTrackReload: () => void;
  /** 各曲目实际音质（按 trackKey；预取下一首时不会覆盖当前曲） */
  actualQualityByTrack: Record<string, string>;
  /** 各曲目实际播放媒体信息（按 trackKey；跨源取链时 source 为实际取链平台） */
  actualMediaByTrack: Record<string, { qualityLabel?: string; source?: MusicSource }>;
  setActualMedia: (trackKey: string, media: { qualityLabel?: string | null; source?: MusicSource | null }) => void;
  setActualQuality: (trackKey: string, label: string | null, source?: MusicSource | null) => void;
  volume: number;
  setVolume: (volume: number) => void;
}

const MAX_QUALITY_TRACKS = 32;

export const useAudioStore = create<AudioStore>((set) => ({
  trackLoading: false,
  setTrackLoading: (trackLoading) => set({ trackLoading }),
  lrcDurationMs: null,
  lrcTrackKey: null,
  setLrcDuration: (lrcTrackKey, lrcDurationMs) => set({ lrcTrackKey, lrcDurationMs }),
  mediaDurationMs: null,
  mediaTrackKey: null,
  setMediaDuration: (mediaTrackKey, mediaDurationMs) => set({ mediaTrackKey, mediaDurationMs }),
  seekPlayback: null,
  setSeekPlayback: (seekPlayback) => set({ seekPlayback }),
  localPlayback: null,
  setLocalPlayback: (localPlayback) => set({ localPlayback }),
  softResumeLocalAudio: null,
  setSoftResumeLocalAudio: (softResumeLocalAudio) => set({ softResumeLocalAudio }),
  needsAudioUnlock: false,
  setNeedsAudioUnlock: (needsAudioUnlock) => set({ needsAudioUnlock }),
  retryPlayback: null,
  setRetryPlayback: (retryPlayback) => set({ retryPlayback }),
  smoothPlaybackTime: 0,
  setSmoothPlaybackTime: (smoothPlaybackTime) => set({ smoothPlaybackTime }),
  playbackVersion: 0,
  setPlaybackVersion: (playbackVersion) => set({ playbackVersion }),
  trackReloadNonce: 0,
  requestTrackReload: () => set((state) => ({ trackReloadNonce: state.trackReloadNonce + 1 })),
  actualQualityByTrack: {},
  actualMediaByTrack: {},
  setActualMedia: (trackKey, media) => set((state) => {
    if (!trackKey) return state;
    const trimmed = media.qualityLabel?.trim() || '';
    const source = media.source || undefined;
    const prev = state.actualQualityByTrack[trackKey];
    const prevMedia = state.actualMediaByTrack[trackKey];
    // 取链成功但上游未返回音质时，只更新实际平台，不抹掉先前已确认的音质。
    const effectiveQuality = trimmed || prevMedia?.qualityLabel || prev || '';
    if (!trimmed && !source) {
      if (!prev && !prevMedia) return state;
      const nextQuality = { ...state.actualQualityByTrack };
      const nextMedia = { ...state.actualMediaByTrack };
      delete nextQuality[trackKey];
      delete nextMedia[trackKey];
      return { actualQualityByTrack: nextQuality, actualMediaByTrack: nextMedia };
    }
    if (prev === effectiveQuality && prevMedia?.qualityLabel === (effectiveQuality || undefined) && prevMedia?.source === source) {
      return state;
    }
    const nextQuality = { ...state.actualQualityByTrack };
    if (effectiveQuality) nextQuality[trackKey] = effectiveQuality;
    else delete nextQuality[trackKey];
    const nextMedia = {
      ...state.actualMediaByTrack,
      [trackKey]: {
        ...(effectiveQuality ? { qualityLabel: effectiveQuality } : {}),
        ...(source ? { source } : {}),
      },
    };
    const keys = Object.keys(nextMedia);
    if (keys.length > MAX_QUALITY_TRACKS) {
      for (const key of keys.slice(0, keys.length - MAX_QUALITY_TRACKS)) {
        delete nextQuality[key];
        delete nextMedia[key];
      }
    }
    return { actualQualityByTrack: nextQuality, actualMediaByTrack: nextMedia };
  }),
  setActualQuality: (trackKey, label, source) => (
    useAudioStore.getState().setActualMedia(trackKey, { qualityLabel: label, source })
  ),
  volume: readStoredVolume(),
  setVolume: (volume) => {
    const next = Math.min(1, Math.max(0, volume));
    set({ volume: next });
    applyAllAudioVolume(next);
    try {
      localStorage.setItem(VOLUME_KEY, String(next));
    } catch {
      // localStorage may be unavailable.
    }
  },
}));
