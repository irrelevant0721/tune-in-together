/** 格式化用户在房停留时长 */
export function formatStayDuration(joinedAtMs: number, nowMs = Date.now()): string {
  if (!joinedAtMs) return '';
  const elapsed = Math.max(0, nowMs - joinedAtMs);
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  if (hours < 24) {
    return remainMin > 0 ? `${hours}小时${remainMin}分` : `${hours}小时`;
  }
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days}天${remainHours}小时` : `${days}天`;
}

/** 点歌等待剩余时间提示 */
export function formatSongRequestWaitRemain(remainSec: number): string {
  const sec = Math.ceil(Math.max(1, remainSec));
  if (sec < 60) return `还需等待 ${sec} 秒才能点歌`;
  const minutes = Math.ceil(sec / 60);
  return minutes <= 1 ? '还需等待 1 分钟才能点歌' : `还需等待 ${minutes} 分钟才能点歌`;
}
