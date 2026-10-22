import type { RoomSummary } from '../types';

export type RoomSwitcherRoom = Pick<RoomSummary, 'id' | 'name' | 'userCount'> & Partial<Pick<RoomSummary, 'isOwner' | 'isAdmin' | 'hasPassword' | 'isLocked'>>;

export function sortRoomSwitcherRooms<T extends RoomSwitcherRoom>(rooms: T[], currentRoomId: string, recentRoomIds: string[]): T[] {
  const currentId = currentRoomId.trim().toUpperCase();
  const recentRank = new Map(recentRoomIds.map((id, index) => [id.trim().toUpperCase(), index]));

  return [...rooms].sort((a, b) => {
    const aId = a.id.toUpperCase();
    const bId = b.id.toUpperCase();
    if (aId === currentId) return -1;
    if (bId === currentId) return 1;
    const aRecent = recentRank.get(aId);
    const bRecent = recentRank.get(bId);
    if (aRecent !== undefined || bRecent !== undefined) {
      if (aRecent === undefined) return 1;
      if (bRecent === undefined) return -1;
      if (aRecent !== bRecent) return aRecent - bRecent;
    }
    const roleDiff = (b.isOwner ? 2 : b.isAdmin ? 1 : 0) - (a.isOwner ? 2 : a.isAdmin ? 1 : 0);
    if (roleDiff !== 0) return roleDiff;
    return b.userCount - a.userCount;
  });
}
