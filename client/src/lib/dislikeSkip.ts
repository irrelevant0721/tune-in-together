import type { RoomState } from '../types';

export type DislikeSkipMode = 'count' | 'percent';

export function normalizeDislikeSkipMode(mode?: string | null): DislikeSkipMode {
  return mode === 'percent' ? 'percent' : 'count';
}

/** 根据房间配置与当前在线人数，计算踩歌切歌所需人数 */
export function resolveDislikeSkipThreshold(room: Pick<RoomState, 'dislikeSkipMode' | 'dislikeSkipThreshold' | 'dislikeSkipPercent' | 'userCount' | 'users'> | null | undefined): number {
  if (!room) return 5;
  const mode = normalizeDislikeSkipMode(room.dislikeSkipMode);
  if (mode === 'percent') {
    const userCount = Math.max(1, room.userCount ?? room.users?.length ?? 1);
    const percent = Math.min(100, Math.max(1, room.dislikeSkipPercent ?? 50));
    return Math.max(1, Math.ceil(userCount * percent / 100));
  }
  return Math.max(1, room.dislikeSkipThreshold ?? 5);
}

export function formatDislikeSkipRule(room: Pick<RoomState, 'dislikeSkipMode' | 'dislikeSkipThreshold' | 'dislikeSkipPercent'> | null | undefined): string {
  if (!room) return '5 人';
  const mode = normalizeDislikeSkipMode(room.dislikeSkipMode);
  if (mode === 'percent') {
    const percent = Math.min(100, Math.max(1, room.dislikeSkipPercent ?? 50));
    return `${percent}% 在线`;
  }
  return `${Math.max(1, room.dislikeSkipThreshold ?? 5)} 人`;
}
