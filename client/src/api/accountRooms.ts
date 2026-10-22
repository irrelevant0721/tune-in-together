import { fetchWithTimeout } from './http';
import type { AccountRoomSummary } from '../types';

type AccountRoomsResponse = {
  rooms?: AccountRoomSummary[];
  error?: string;
  code?: string;
};

async function readResponse(response: Response): Promise<AccountRoomsResponse> {
  const data = await response.json().catch(() => ({})) as AccountRoomsResponse;
  if (!response.ok) {
    const error = new Error(data.error || '账户房间操作失败') as Error & { code?: string };
    error.code = data.code;
    throw error;
  }
  return data;
}

export async function listAccountRooms(): Promise<AccountRoomSummary[]> {
  const response = await fetchWithTimeout('/api/account/rooms', { cache: 'no-store' }, 8000);
  const data = await readResponse(response);
  return Array.isArray(data.rooms) ? data.rooms : [];
}

export async function claimAccountRoom(roomId: string): Promise<void> {
  const id = String(roomId || '').trim().toUpperCase();
  const response = await fetchWithTimeout(`/api/account/rooms/${encodeURIComponent(id)}/claim`, {
    method: 'POST',
  }, 8000);
  await readResponse(response);
}
