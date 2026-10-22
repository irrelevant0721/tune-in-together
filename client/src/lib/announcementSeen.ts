const STORAGE_PREFIX = 'openmusic_announcement_seen:';

export function getAnnouncementRevision(enabled: boolean, text: string): string {
  return `${enabled ? 1 : 0}\n${text.trim()}`;
}

function storageKey(roomId: string): string {
  return `${STORAGE_PREFIX}${roomId}`;
}

export function hasSeenAnnouncement(roomId: string, enabled: boolean, text: string): boolean {
  try {
    return localStorage.getItem(storageKey(roomId)) === getAnnouncementRevision(enabled, text);
  } catch {
    return false;
  }
}

export function markAnnouncementSeen(roomId: string, enabled: boolean, text: string): void {
  try {
    localStorage.setItem(storageKey(roomId), getAnnouncementRevision(enabled, text));
  } catch {
    // localStorage may be unavailable.
  }
}

export function shouldAutoShowAnnouncement(
  roomId: string,
  enabled?: boolean,
  text?: string,
): boolean {
  if (!enabled || !text?.trim()) return false;
  return !hasSeenAnnouncement(roomId, enabled, text);
}
