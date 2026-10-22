const STORAGE_KEY = 'openmusic_recent_rooms';
const MAX_RECENT = 12;

export interface RecentRoomEntry {
  id: string;
  visitedAt: number;
}

export function rememberRoomVisit(roomId: string): void {
  const id = roomId.trim().toUpperCase();
  if (!id) return;
  try {
    const items = getRecentRoomEntries();
    const filtered = items.filter((entry) => entry.id !== id);
    const next: RecentRoomEntry[] = [{ id, visitedAt: Date.now() }, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be unavailable.
  }
}

export function getRecentRoomEntries(): RecentRoomEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is RecentRoomEntry =>
          Boolean(entry)
          && typeof entry === 'object'
          && typeof (entry as RecentRoomEntry).id === 'string'
          && typeof (entry as RecentRoomEntry).visitedAt === 'number',
      )
      .map((entry) => ({ id: entry.id.toUpperCase(), visitedAt: entry.visitedAt }));
  } catch {
    return [];
  }
}

export function getRecentRoomIds(): string[] {
  return getRecentRoomEntries().map((entry) => entry.id);
}

export function partitionRoomsByRecent<T extends { id: string }>(rooms: T[]): { recent: T[]; others: T[] } {
  const recentIds = getRecentRoomIds();
  const byId = new Map(rooms.map((room) => [room.id.toUpperCase(), room]));
  const recent: T[] = [];
  const recentSet = new Set<string>();

  for (const id of recentIds) {
    const room = byId.get(id);
    if (room) {
      recent.push(room);
      recentSet.add(id);
    }
  }

  const others = rooms.filter((room) => !recentSet.has(room.id.toUpperCase()));
  return { recent, others };
}

/** 最近去过中固定按身份优先，再按实际最近访问时间排序。 */
export function sortRecentRooms<T extends { id: string; isOwner?: boolean; isAdmin?: boolean }>(rooms: T[]): T[] {
  const visitedAt = new Map(getRecentRoomEntries().map((entry) => [entry.id, entry.visitedAt]));
  return [...rooms].sort((a, b) => {
    const roleDiff = (b.isOwner ? 2 : b.isAdmin ? 1 : 0) - (a.isOwner ? 2 : a.isAdmin ? 1 : 0);
    if (roleDiff !== 0) return roleDiff;
    return (visitedAt.get(b.id.toUpperCase()) || 0) - (visitedAt.get(a.id.toUpperCase()) || 0);
  });
}
