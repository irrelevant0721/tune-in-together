import type { QueueItem } from '../types';
import { getCoverUrl } from '../api/music';
import { readRoomPureMode } from './roomPureMode';
import { needsApiSign } from './apiSign';
import { signApiUrl } from './signedApiUrl';

export type MediaSessionPlaybackState = 'none' | 'paused' | 'playing';

export type MediaSessionActionHandlers = {
  play?: () => void;
  pause?: () => void;
  nexttrack?: () => void;
  previoustrack?: () => void;
  seekbackward?: (details: MediaSessionActionDetails) => void;
  seekforward?: (details: MediaSessionActionDetails) => void;
  seekto?: (details: MediaSessionActionDetails) => void;
  stop?: () => void;
};

const CLEAR_ACTIONS: MediaSessionAction[] = [
  'play',
  'pause',
  'nexttrack',
  'previoustrack',
  'seekbackward',
  'seekforward',
  'seekto',
  'stop',
];

let lastMetadataKey = '';
let lastPlaybackState: MediaSessionPlaybackState | '' = '';
let lastPositionKey = '';
let handlersBound = false;

function getMediaSession(): MediaSession | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.mediaSession ?? null;
}

function toAbsoluteUrl(url: string): string {
  const value = String(url || '').trim();
  if (!value) return '';
  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return value;
  }
}

function metadataKey(song: Pick<QueueItem, 'queueId' | 'name' | 'artist' | 'pic' | 'id' | 'source'> | null): string {
  if (!song) return '';
  return `${song.queueId}|${song.name}|${song.artist}|${song.pic || ''}|${readRoomPureMode() ? '1' : '0'}`;
}

async function buildArtwork(song: Pick<QueueItem, 'id' | 'source' | 'pic'>): Promise<MediaImage[]> {
  const sizes: Array<{ size: 'tiny' | 'thumb' | 'medium' | 'full'; dims: string }> = [
    { size: 'tiny', dims: '96x96' },
    { size: 'thumb', dims: '128x128' },
    { size: 'medium', dims: '256x256' },
    { size: 'full', dims: '512x512' },
  ];
  const seen = new Set<string>();
  const artwork: MediaImage[] = [];

  for (const entry of sizes) {
    let src = toAbsoluteUrl(getCoverUrl(song, entry.size));
    if (src && needsApiSign(src)) {
      const parsed = new URL(src);
      src = toAbsoluteUrl(await signApiUrl(`${parsed.pathname}${parsed.search}`));
    }
    if (!src || seen.has(src)) continue;
    seen.add(src);
    artwork.push({
      src,
      sizes: entry.dims,
      type: 'image/jpeg',
    });
  }
  return artwork;
}

/** 原生通知栏用单张封面（优先中等尺寸） */
export async function resolveMediaArtworkUrl(
  song: Pick<QueueItem, 'id' | 'source' | 'pic'> | null,
): Promise<string> {
  if (!song) return '';
  let src = toAbsoluteUrl(getCoverUrl(song, 'medium'));
  if (!src) src = toAbsoluteUrl(getCoverUrl(song, 'full'));
  if (src && needsApiSign(src)) {
    try {
      const parsed = new URL(src);
      src = toAbsoluteUrl(await signApiUrl(`${parsed.pathname}${parsed.search}`));
    } catch {
      // keep unsigned
    }
  }
  return src;
}

export function isMediaSessionSupported(): boolean {
  return Boolean(getMediaSession());
}

/** 更新锁屏/通知栏曲目信息 */
export function updateMediaSessionMetadata(
  song: Pick<QueueItem, 'queueId' | 'name' | 'artist' | 'album' | 'pic' | 'id' | 'source'> | null,
): void {
  const session = getMediaSession();
  if (!session) return;

  const key = metadataKey(song);
  if (key === lastMetadataKey) return;
  lastMetadataKey = key;

  if (!song) {
    try {
      session.metadata = null;
    } catch {
      // Safari may throw when clearing metadata.
    }
    return;
  }

  const pure = readRoomPureMode();
  const metadataKeySnapshot = key;
  void buildArtwork(song).then((artwork) => {
    if (metadataKeySnapshot !== lastMetadataKey) return;
    try {
      session.metadata = new MediaMetadata({
        title: pure ? '正在播放' : (song.name || '未知歌曲'),
        artist: pure ? '' : (song.artist || '未知歌手'),
        album: pure ? 'OpenMusic' : (song.album || 'OpenMusic'),
        artwork: pure ? [] : artwork,
      });
    } catch {
      // MediaMetadata / artwork may fail on some WebViews.
    }
  }).catch(() => {
    try {
      session.metadata = new MediaMetadata({
        title: pure ? '正在播放' : (song.name || '未知歌曲'),
        artist: pure ? '' : (song.artist || '未知歌手'),
        album: pure ? 'OpenMusic' : (song.album || 'OpenMusic'),
        artwork: [],
      });
    } catch {
      // ignore
    }
  });
}

export function updateMediaSessionPlaybackState(
  state: MediaSessionPlaybackState,
  options?: { force?: boolean },
): void {
  const session = getMediaSession();
  if (!session) return;
  if (!options?.force && lastPlaybackState === state) return;
  lastPlaybackState = state;
  try {
    session.playbackState = state;
  } catch {
    // ignore unsupported assignment
  }
}

/** 同步进度到系统媒体控件 */
export function updateMediaSessionPositionState(options: {
  duration: number;
  position: number;
  playbackRate?: number;
}): void {
  const session = getMediaSession();
  if (!session || typeof session.setPositionState !== 'function') return;

  const duration = Number(options.duration);
  const position = Number(options.position);
  const playbackRate = Number(options.playbackRate ?? 1);

  if (!Number.isFinite(duration) || duration <= 0) return;
  if (!Number.isFinite(position) || position < 0) return;
  if (!Number.isFinite(playbackRate) || playbackRate <= 0) return;

  const safePosition = Math.min(position, duration);
  const key = `${duration.toFixed(1)}|${safePosition.toFixed(1)}|${playbackRate}`;
  if (key === lastPositionKey) return;
  lastPositionKey = key;

  try {
    session.setPositionState({
      duration,
      position: safePosition,
      playbackRate,
    });
  } catch {
    // Invalid state combinations throw on some browsers.
  }
}

export function bindMediaSessionActions(handlers: MediaSessionActionHandlers): void {
  const session = getMediaSession();
  if (!session) return;

  const bind = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try {
      session.setActionHandler(action, handler);
    } catch {
      // Older browsers reject unsupported actions.
    }
  };

  bind('play', handlers.play ? (() => handlers.play?.()) : null);
  bind('pause', handlers.pause ? (() => handlers.pause?.()) : null);
  bind('nexttrack', handlers.nexttrack ? (() => handlers.nexttrack?.()) : null);
  bind('previoustrack', handlers.previoustrack ? (() => handlers.previoustrack?.()) : null);
  bind('stop', handlers.stop ? (() => handlers.stop?.()) : null);
  bind('seekbackward', handlers.seekbackward
    ? ((details) => handlers.seekbackward?.(details))
    : null);
  bind('seekforward', handlers.seekforward
    ? ((details) => handlers.seekforward?.(details))
    : null);
  bind('seekto', handlers.seekto
    ? ((details) => handlers.seekto?.(details))
    : null);

  handlersBound = true;
}

export function clearMediaSession(): void {
  const session = getMediaSession();
  if (!session) return;

  if (handlersBound) {
    for (const action of CLEAR_ACTIONS) {
      try {
        session.setActionHandler(action, null);
      } catch {
        // ignore
      }
    }
    handlersBound = false;
  }

  lastMetadataKey = '';
  lastPlaybackState = '';
  lastPositionKey = '';

  try {
    session.playbackState = 'none';
  } catch {
    // ignore
  }
  try {
    session.metadata = null;
  } catch {
    // ignore
  }
  try {
    session.setPositionState?.();
  } catch {
    // Clearing without args is supported in Chromium.
  }
}
