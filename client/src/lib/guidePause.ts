/**
 * 高优先级弹窗（新版本、公告处理等）打开时，暂停新手指引，避免叠层遮挡。
 */

type Listener = () => void;

const reasons = new Set<string>();
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener();
}

export function setGuidePauseReason(reason: string, active: boolean): void {
  const key = String(reason || '').trim();
  if (!key) return;
  const before = reasons.size;
  if (active) reasons.add(key);
  else reasons.delete(key);
  if (reasons.size !== before) notify();
}

export function isGuideExternallyPaused(): boolean {
  return reasons.size > 0;
}

export function subscribeGuidePause(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
