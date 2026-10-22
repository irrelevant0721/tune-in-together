import { fetchWithTimeout } from '../api/http';

export type SiteAnnouncement = {
  enabled: boolean;
  id: string;
  title: string;
  text: string;
};

const STORAGE_KEY = 'openmusic:site-announcement-seen-id';

export async function fetchSiteAnnouncement(): Promise<SiteAnnouncement | null> {
  try {
    const res = await fetchWithTimeout('/api/site-announcement', { method: 'GET' }, 5000);
    if (!res.ok) return null;
    const data = await res.json() as Partial<SiteAnnouncement>;
    const id = String(data.id || '').trim();
    const text = String(data.text || '').trim();
    const enabled = Boolean(data.enabled) && Boolean(id) && Boolean(text);
    return {
      enabled,
      id: enabled ? id : '',
      title: String(data.title || '站点公告').trim() || '站点公告',
      text: enabled ? text : '',
    };
  } catch {
    return null;
  }
}

export function hasSeenSiteAnnouncement(id: string): boolean {
  const revision = String(id || '').trim();
  if (!revision) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === revision;
  } catch {
    return false;
  }
}

export function markSiteAnnouncementSeen(id: string): void {
  const revision = String(id || '').trim();
  if (!revision) return;
  try {
    localStorage.setItem(STORAGE_KEY, revision);
  } catch {
    // localStorage may be unavailable.
  }
}

export function shouldAutoShowSiteAnnouncement(announcement: SiteAnnouncement | null | undefined): boolean {
  if (!announcement?.enabled || !announcement.id || !announcement.text.trim()) return false;
  return !hasSeenSiteAnnouncement(announcement.id);
}
