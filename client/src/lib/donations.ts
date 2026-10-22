import { fetchWithTimeout } from '../api/http';

export interface DonationEntry {
  id: string;
  name: string;
  date: string;
  /** 仅用于名单排序，界面不展示金额。 */
  amount?: number;
}

export async function fetchDonations(): Promise<DonationEntry[]> {
  try {
    const res = await fetchWithTimeout('/api/donations', { method: 'GET', cache: 'no-store' }, 5000);
    if (!res.ok) return [];
    const data = await res.json() as { donations?: DonationEntry[] };
    return Array.isArray(data.donations) ? data.donations : [];
  } catch {
    return [];
  }
}
