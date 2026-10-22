import {
  markVisibilityBackground,
  markVisibilityForeground,
} from './syncStateMachine';

let listenersInstalled = false;

export function installVisibilitySync(): void {
  if (listenersInstalled) return;
  listenersInstalled = true;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      markVisibilityBackground();
    } else {
      markVisibilityForeground();
    }
  });
}
