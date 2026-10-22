const IMMERSIVE_MODE_KEY = 'openmusic:room-immersive-mode';

export function readRoomImmersiveMode(): boolean {
  try {
    return sessionStorage.getItem(IMMERSIVE_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeRoomImmersiveMode(enabled: boolean): void {
  try {
    if (enabled) {
      sessionStorage.setItem(IMMERSIVE_MODE_KEY, '1');
    } else {
      sessionStorage.removeItem(IMMERSIVE_MODE_KEY);
    }
  } catch {
    // sessionStorage may be unavailable.
  }
}
