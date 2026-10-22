const BIAS_MIN = -0.03;
const BIAS_MAX = 0.03;
const DEAD_ZONE_SEC = 0.15;
const DIFF_GAIN = 0.04;
const DECAY_FACTOR = 0.75;
const DEAD_ZONE_DECAY = 0.8;

let rateBias = 0;
let baseRate = 1;

function clampBias(value: number): number {
  return Math.min(BIAS_MAX, Math.max(BIAS_MIN, value));
}

export function getRateBias(): number {
  return rateBias;
}

export function resetDriftController(audio?: HTMLAudioElement, playbackRate = 1): void {
  rateBias = 0;
  baseRate = Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1;
  if (audio) audio.playbackRate = baseRate;
}

/** 只应用当前 bias，不更新（visibility 保护期用） */
export function applyCurrentDriftRate(audio: HTMLAudioElement): void {
  audio.playbackRate = baseRate + rateBias;
}

/**
 * Drift Controller：playbackRate = 1 + bias
 * - 中误差：累加 bias 后衰减，自动回归 1.0
 * - 小误差：仅衰减 bias，避免抖动
 */
export function applyDriftCorrection(audio: HTMLAudioElement, diff: number): void {
  const absDiff = Math.abs(diff);

  if (absDiff < DEAD_ZONE_SEC) {
    rateBias *= DEAD_ZONE_DECAY;
    audio.playbackRate = baseRate + rateBias;
    return;
  }

  rateBias += diff * DIFF_GAIN;
  rateBias = clampBias(rateBias);
  rateBias *= DECAY_FACTOR;
  audio.playbackRate = baseRate + rateBias;
}
