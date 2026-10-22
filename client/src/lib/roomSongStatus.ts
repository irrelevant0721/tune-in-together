import { songKey } from '../api/music';
import type { RoomState, SearchResult, Song } from '../types';
import { useSongHistoryStore } from '../stores/songHistoryStore';

type SongRef = Pick<Song, 'source' | 'id'>;

/** 当前正在播放或仍在队列中 */
export function isSongInRoomQueue(
  room: RoomState | null | undefined,
  song: SongRef,
): boolean {
  if (!room) return false;
  const key = songKey(song);
  if (room.current && songKey(room.current) === key) return true;
  return room.queue.some((item) => songKey(item) === key);
}

/** 曾点过且已不在播放队列（已播完或已被切走） */
export function isSongPlayedInRoom(
  room: RoomState | null | undefined,
  song: SongRef,
): boolean {
  const key = songKey(song);
  const { songs, roomId } = useSongHistoryStore.getState();
  if (room && roomId === room.id && songs.length > 0) {
    if (!songs.some((item) => songKey(item) === key)) return false;
    return !isSongInRoomQueue(room, song);
  }
  if (!room?.songHistory?.length) return false;
  if (!room.songHistory.some((item) => songKey(item) === key)) return false;
  return !isSongInRoomQueue(room, song);
}

export function getRoomSongStatus(
  room: RoomState | null | undefined,
  song: SearchResult | SongRef,
): { inQueue: boolean; played: boolean } {
  const inQueue = isSongInRoomQueue(room, song);
  const played = isSongPlayedInRoom(room, song);
  return { inQueue, played };
}
