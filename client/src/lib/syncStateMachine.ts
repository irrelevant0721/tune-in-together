export const SyncState = {
  NORMAL: 'normal',
  BUFFERING: 'buffering',
  POST_BUFFER: 'post_buffer',
  VISIBILITY_RECOVER: 'visibility_recover',
} as const;

export type SyncState = typeof SyncState[keyof typeof SyncState];

const POST_BUFFER_MS = 3000;
const VISIBILITY_RECOVER_MS = 2000;
const RECOVERY_COOLDOWN_MS = 3000;
const FORCE_CORRECTION_COOLDOWN_MS = 800;
const COOLDOWN_OVERRIDE_ENTER_SEC = 2.5;
const COOLDOWN_OVERRIDE_EXIT_SEC = 2.0;

let bufferingActive = false;
let postBufferUntil = 0;
let visibilityRecoverUntil = 0;
let visibilityBackground = false;
let lastHardCorrectionTime = 0;
let lastForceHardCorrectionTime = 0;
let cooldownOverrideActive = false;

function nowMs(): number {
  return Date.now();
}

export function getSyncState(): SyncState {
  if (bufferingActive) return SyncState.BUFFERING;
  if (nowMs() < postBufferUntil) return SyncState.POST_BUFFER;
  if (visibilityBackground || nowMs() < visibilityRecoverUntil) {
    return SyncState.VISIBILITY_RECOVER;
  }
  return SyncState.NORMAL;
}

export function markBufferingStart(): void {
  bufferingActive = true;
}

export function markBufferingEnd(): void {
  bufferingActive = false;
  postBufferUntil = nowMs() + POST_BUFFER_MS;
}

export function markVisibilityBackground(): void {
  visibilityBackground = true;
  visibilityRecoverUntil = 0;
}

export function markVisibilityForeground(): void {
  visibilityBackground = false;
  visibilityRecoverUntil = nowMs() + VISIBILITY_RECOVER_MS;
}

export function markHardCorrection(): void {
  lastHardCorrectionTime = nowMs();
}

export function markForceHardCorrection(): void {
  const t = nowMs();
  lastForceHardCorrectionTime = t;
  lastHardCorrectionTime = t;
}

export function isInRecoveryCooldown(): boolean {
  return nowMs() - lastHardCorrectionTime < RECOVERY_COOLDOWN_MS;
}

export function isInForceCorrectionCooldown(): boolean {
  return nowMs() - lastForceHardCorrectionTime < FORCE_CORRECTION_COOLDOWN_MS;
}

/** cooldown 兜底硬修正滞回：>2.5s 进入，<2.0s 退出 */
function isCooldownOverrideActive(absDiffSec: number): boolean {
  if (!cooldownOverrideActive && absDiffSec > COOLDOWN_OVERRIDE_ENTER_SEC) {
    cooldownOverrideActive = true;
  } else if (cooldownOverrideActive && absDiffSec < COOLDOWN_OVERRIDE_EXIT_SEC) {
    cooldownOverrideActive = false;
  }
  return cooldownOverrideActive;
}

export function isForceCorrection(options: {
  forceZero?: boolean;
  forceTime?: number;
  forceCorrection?: boolean;
}): boolean {
  return options.forceZero === true
    || options.forceTime !== undefined
    || options.forceCorrection === true;
}

export function shouldSkipRoutineSync(forceCorrection: boolean): boolean {
  if (forceCorrection) return false;
  return getSyncState() === SyncState.BUFFERING;
}

export function requiresSoftSyncOnly(forceCorrection: boolean): boolean {
  if (forceCorrection) return false;
  return getSyncState() !== SyncState.NORMAL;
}

export function allowsHardCorrection(
  forceCorrection: boolean,
  absDiffSec = 0,
): boolean {
  const overrideCooldown = isCooldownOverrideActive(absDiffSec);

  if (forceCorrection) {
    if (isInForceCorrectionCooldown()) return false;
    if (isInRecoveryCooldown() && !overrideCooldown) return false;
    return true;
  }

  if (getSyncState() !== SyncState.NORMAL) return false;
  if (isInRecoveryCooldown() && !overrideCooldown) return false;
  return true;
}

export function resetSyncStateMachine(): void {
  bufferingActive = false;
  postBufferUntil = 0;
  visibilityRecoverUntil = 0;
  visibilityBackground = false;
  lastHardCorrectionTime = 0;
  lastForceHardCorrectionTime = 0;
  cooldownOverrideActive = false;
}

/** @deprecated 兼容旧调用 */
export function resetPostBufferLock(): void {
  postBufferUntil = 0;
}
