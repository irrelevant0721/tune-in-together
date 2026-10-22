import { formatSongRequestWaitRemain } from './formatStayDuration';
import type { RoomState } from '../types';

export function canModerateRoom(isOwner: boolean, isAdmin: boolean): boolean {
  return isOwner || isAdmin;
}

/** 房主/管理员始终可；开启 memberSeekEnabled 后普通成员也可拖进度条 */
export function canSeekInRoom(room: RoomState | null | undefined, canControlPlayback: boolean): boolean {
  return canControlPlayback || Boolean(room?.memberSeekEnabled);
}

/** 房主/管理员始终可；开启 memberPauseEnabled 后普通成员也可暂停/播放 */
export function canPauseInRoom(room: RoomState | null | undefined, canControlPlayback: boolean): boolean {
  return canControlPlayback || Boolean(room?.memberPauseEnabled);
}

export function canRequestSong(
  room: RoomState | null,
  isOwner: boolean,
  isAdmin: boolean,
  lastSongRequestAt?: number | null,
): boolean {
  return getSongRequestBlockReason(room, isOwner, isAdmin, null, lastSongRequestAt) === null;
}

export function countUserQueueSongs(room: RoomState, userId: string): number {
  return room.queue.filter((item) => item.requestedById === userId).length;
}

export function getSongRequestCooldownRemainSec(
  room: RoomState,
  lastRequestAt: number | null | undefined,
): number {
  const cooldownSec = room.songRequestCooldownSec ?? 0;
  if (cooldownSec <= 0 || !lastRequestAt) return 0;
  const elapsedSec = (Date.now() - lastRequestAt) / 1000;
  return Math.max(0, cooldownSec - elapsedSec);
}

export function getSongRequestBlockReason(
  room: RoomState | null,
  isOwner: boolean,
  isAdmin: boolean,
  mySocketId: string | null,
  lastSongRequestAt?: number | null,
  canControlPlayback = false,
): string | null {
  if (!room) return '未加入房间';
  const privileged = isOwner || isAdmin || canControlPlayback;
  if (room.songRequestEnabled === false && !privileged) {
    return '房主已禁止点歌';
  }

  if (privileged) return null;
  if (!mySocketId) return null;

  const user = room.users.find((entry) => entry.id === mySocketId);
  const minStaySec = room.songRequestMinStaySec ?? 0;
  if (minStaySec > 0 && user) {
    const stayedSec = (Date.now() - user.joinedAt) / 1000;
    if (stayedSec < minStaySec) {
      return formatSongRequestWaitRemain(minStaySec - stayedSec);
    }
  }

  const maxPerUser = room.songRequestMaxPerUser ?? 0;
  if (maxPerUser > 0) {
    const count = countUserQueueSongs(room, mySocketId);
    if (count >= maxPerUser) {
      return `每人最多 ${maxPerUser} 首待播，你已达上限`;
    }
  }

  const cooldownRemain = getSongRequestCooldownRemainSec(room, lastSongRequestAt);
  if (cooldownRemain > 0) {
    return `点歌冷却中，还需等待 ${Math.ceil(cooldownRemain)} 秒`;
  }

  return null;
}
