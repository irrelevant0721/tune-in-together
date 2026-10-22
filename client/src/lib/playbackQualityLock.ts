const RECOVERY_SUCCESS_THRESHOLD = 3;

let lockedToLowest = false;
let consecutiveSuccesses = 0;

export function isPlaybackQualityLockedToLowest(): boolean {
  return lockedToLowest;
}

export function lockPlaybackQualityToLowest(): void {
  lockedToLowest = true;
  consecutiveSuccesses = 0;
}

/** 播放失败时清零连续成功计数 */
export function recordSongPlaybackFailure(): void {
  consecutiveSuccesses = 0;
}

/**
 * 每首歌首次进入稳定播放时调用。
 * @returns true 表示已连续成功达到阈值并恢复为用户偏好音质
 */
export function recordSongPlaybackSuccess(): boolean {
  if (!lockedToLowest) return false;
  consecutiveSuccesses += 1;
  if (consecutiveSuccesses < RECOVERY_SUCCESS_THRESHOLD) return false;
  lockedToLowest = false;
  consecutiveSuccesses = 0;
  return true;
}

export function resetPlaybackQualityLock(): void {
  lockedToLowest = false;
  consecutiveSuccesses = 0;
}
