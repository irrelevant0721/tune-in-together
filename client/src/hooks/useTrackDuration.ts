import { useAudioStore } from '../stores/audioStore';
import { getTrackKey } from '../api/music';
import type { Song, QueueItem } from '../types';
import { normalizeDurationMs } from '../lib/duration';

type TrackSong = Pick<Song, 'duration' | 'id' | 'source'> &
  Partial<Pick<QueueItem, 'queueId'>>;

interface DurationSources {
  lrcDurationMs: number | null;
  lrcTrackKey: string | null;
  mediaDurationMs: number | null;
  mediaTrackKey: string | null;
}

const MIN_TRUSTED_MEDIA_DURATION_SEC = 5;
const TINY_MEDIA_DURATION_RATIO = 0.05;

function metadataDurationSeconds(song: TrackSong | null | undefined): number {
  const durationMs = normalizeDurationMs(song?.duration);
  return durationMs ? durationMs / 1000 : 0;
}

function lrcDurationSeconds(sources: DurationSources, key: string): number {
  if (sources.lrcTrackKey !== key || !sources.lrcDurationMs || sources.lrcDurationMs <= 0) return 0;
  return sources.lrcDurationMs / 1000;
}

/** 元数据时长（不含歌词推算），用于校验媒体时长与自动切歌 */
export function resolveReferenceDurationSeconds(
  song: TrackSong | null | undefined,
  _sources?: DurationSources,
): number {
  return metadataDurationSeconds(song);
}

export function isTrustedMediaDurationSeconds(
  mediaDurationSec: number | null | undefined,
  referenceDurationSec = 0,
): boolean {
  if (!mediaDurationSec || !Number.isFinite(mediaDurationSec) || mediaDurationSec <= 0) return false;
  if (mediaDurationSec < MIN_TRUSTED_MEDIA_DURATION_SEC) return false;
  if (
    referenceDurationSec >= MIN_TRUSTED_MEDIA_DURATION_SEC
    && mediaDurationSec < referenceDurationSec * TINY_MEDIA_DURATION_RATIO
  ) {
    return false;
  }
  return true;
}

function trustedStoredMediaDurationSeconds(
  song: TrackSong | null | undefined,
  sources: DurationSources,
  key: string,
): number {
  const mediaSec = sources.mediaTrackKey === key && sources.mediaDurationMs
    ? sources.mediaDurationMs / 1000
    : 0;
  return isTrustedMediaDurationSeconds(mediaSec, resolveReferenceDurationSeconds(song, sources))
    ? mediaSec
    : 0;
}

/** Seek/end cap：接口元数据优先，媒体时长仅在接口缺失时使用 */
export function resolveTrackDurationSeconds(
  song: TrackSong | null | undefined,
  sources: DurationSources,
): number {
  if (!song) return 0;

  const key = getTrackKey(song as Pick<QueueItem, 'queueId' | 'id' | 'source'>);
  const metadataDur = metadataDurationSeconds(song);
  if (metadataDur > 0) return metadataDur;

  const mediaDur = trustedStoredMediaDurationSeconds(song, sources, key);
  if (mediaDur > 0) return mediaDur;

  return 0;
}

/** Display duration for progress/lyrics: interface metadata first, then media/lyrics. */
export function resolveDisplayDurationSeconds(
  song: TrackSong | null | undefined,
  sources: DurationSources,
): number {
  if (!song) return 0;

  const key = getTrackKey(song as Pick<QueueItem, 'queueId' | 'id' | 'source'>);
  const referenceDur = resolveReferenceDurationSeconds(song, sources);
  if (referenceDur > 0) return referenceDur;

  const mediaDur = trustedStoredMediaDurationSeconds(song, sources, key);
  if (mediaDur > 0) return mediaDur;

  const lrcDur = lrcDurationSeconds(sources, key);
  if (lrcDur > 0) return lrcDur;

  return 0;
}

/** Auto-skip：仅用音频/元数据；多路媒体取较短者（应对截断预览） */
export function resolveAutoSkipThresholdSeconds(
  song: TrackSong | null | undefined,
  sources: DurationSources,
  fileDurationSec?: number,
): number {
  if (!song) return 0;

  const key = getTrackKey(song as Pick<QueueItem, 'queueId' | 'id' | 'source'>);
  const referenceDur = resolveReferenceDurationSeconds(song, sources);
  if (referenceDur > 0) return referenceDur;
  const fileDur = isTrustedMediaDurationSeconds(fileDurationSec, referenceDur) ? fileDurationSec! : 0;
  const storedMedia = trustedStoredMediaDurationSeconds(song, sources, key);

  const mediaCandidates = [fileDur, storedMedia].filter((d) => d > 0);
  if (mediaCandidates.length > 0) return Math.min(...mediaCandidates);

  return 0;
}

export function clampPlaybackTime(currentTime: number, duration: number): number {
  if (duration <= 0) return currentTime;
  return Math.min(currentTime, duration);
}

export function useTrackDuration(song: TrackSong | null | undefined): number {
  const lrcDurationMs = useAudioStore((s) => s.lrcDurationMs);
  const lrcTrackKey = useAudioStore((s) => s.lrcTrackKey);
  const mediaDurationMs = useAudioStore((s) => s.mediaDurationMs);
  const mediaTrackKey = useAudioStore((s) => s.mediaTrackKey);

  return resolveDisplayDurationSeconds(song, {
    lrcDurationMs,
    lrcTrackKey,
    mediaDurationMs,
    mediaTrackKey,
  });
}
