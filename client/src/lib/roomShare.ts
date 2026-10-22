import { buildRoomEntryUrl } from './roomPassword';

export interface RoomShareOptions {
  inviterNickname: string;
  roomId: string;
  roomName: string;
  password?: string;
  currentSong?: { name: string; artist: string } | null;
  isPlaying?: boolean;
  origin?: string;
}

export function buildRoomSharePayload(options: RoomShareOptions): { url: string; text: string } {
  const {
    inviterNickname,
    roomId,
    roomName,
    password,
    currentSong,
    isPlaying = true,
  } = options;
  const origin = options.origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const url = buildRoomEntryUrl(roomId, { password, origin });
  const inviter = inviterNickname.trim() || '好友';
  const pwd = password?.trim();

  let playbackLine: string;
  if (currentSong) {
    const status = isPlaying ? '正在播放' : '暂停中';
    playbackLine = `${status}《${currentSong.name}》— ${currentSong.artist}，一起来听吧 🎧`;
  } else {
    playbackLine = '房间等你一起点歌，快来加入吧 🎵';
  }

  const lines = [
    `${inviter} 邀请你加入 OpenMusic 房间「${roomName}」`,
    playbackLine,
    `房间号：${roomId}`,
  ];
  if (pwd) lines.push(`密码：${pwd}`);
  lines.push(`👉 ${url}`);
  return { url, text: lines.join('\n') };
}

export function buildRoomShareText(options: RoomShareOptions): string {
  return buildRoomSharePayload(options).text;
}
