import type { Socket } from 'socket.io-client';
import { useRoomStore } from '../stores/roomStore';

let socketGetter: (() => Socket | null) | null = null;

export function bindReportTrackDurationSocket(getSocket: () => Socket | null) {
  socketGetter = getSocket;
}

/** 将音频真实时长回传服务端，供自动切歌（不触发 room_update） */
export function reportTrackDurationToServer(queueId: string, durationMs: number) {
  if (!queueId || !Number.isFinite(durationMs) || durationMs <= 0) return;
  const { isPlaybackLeader, room } = useRoomStore.getState();
  if (!room?.current || room.current.queueId !== queueId) return;

  const existingMs = Number(room.current.duration || 0);
  const roundedMs = Math.round(durationMs);
  // 播放主控可更新；其他人仅在服务端尚无时长时补种，避免卡死无法切歌
  if (!isPlaybackLeader && existingMs > 0) return;
  if (existingMs > 0 && Math.abs(roundedMs - existingMs) < 50) return;

  const socket = socketGetter?.();
  if (!socket?.connected) return;

  socket.timeout(5000).emit(
    'report_track_duration',
    { queueId, durationMs: roundedMs },
    () => {},
  );
}
