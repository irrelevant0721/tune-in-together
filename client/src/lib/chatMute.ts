import type { RoomState } from '../types';

type ChatMuteRoom = Pick<RoomState, 'creatorId' | 'muteAll' | 'mutedUserIds'>;

export function isChatMutedForUser(room: ChatMuteRoom | null, userId: string | null | undefined): boolean {
  if (!room || !userId) return false;
  if (room.creatorId === userId) return false;
  if (room.muteAll) return true;
  return room.mutedUserIds?.includes(userId) ?? false;
}
