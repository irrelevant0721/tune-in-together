import type { LyricLine } from '../types';

/** 二分查找当前歌词行索引 */
export function findActiveLyricIndex(lines: LyricLine[], currentTime: number): number {
  if (lines.length === 0) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= currentTime) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (result < 0) return -1;
  const next = lines[result + 1];
  if (next && currentTime >= next.time) return -1;
  return result;
}
