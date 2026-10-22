const THEME_COLOR_KEY = 'openmusic:room-theme-color';

export const DEFAULT_THEME_COLOR = '#ff4d55';

export interface ThemeRgb {
  r: number;
  g: number;
  b: number;
}

export function normalizeThemeColor(value: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  return match ? `#${match[1].toLowerCase()}` : null;
}

export function hexToThemeRgb(hex: string): ThemeRgb {
  const raw = hex.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

export function themeRgbToHex({ r, g, b }: ThemeRgb): string {
  const toHex = (value: number) => Math.min(255, Math.max(0, Math.round(value))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** 与白色按比例混合，得到用于渐变的浅色变体 */
function lightenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToThemeRgb(hex);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const toHex = (channel: number) => mix(channel).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function readRoomThemeColor(): string {
  try {
    const stored = localStorage.getItem(THEME_COLOR_KEY);
    if (stored) {
      const normalized = normalizeThemeColor(stored);
      if (normalized) return normalized;
    }
  } catch {
    // localStorage may be unavailable.
  }
  return DEFAULT_THEME_COLOR;
}

export function writeRoomThemeColor(hex: string): void {
  try {
    const normalized = normalizeThemeColor(hex);
    if (!normalized || normalized === DEFAULT_THEME_COLOR) {
      localStorage.removeItem(THEME_COLOR_KEY);
    } else {
      localStorage.setItem(THEME_COLOR_KEY, normalized);
    }
  } catch {
    // localStorage may be unavailable.
  }
}

export function applyRoomThemeColor(hex: string): void {
  if (typeof document === 'undefined') return;
  const normalized = normalizeThemeColor(hex) ?? DEFAULT_THEME_COLOR;
  const { r, g, b } = hexToThemeRgb(normalized);
  const root = document.documentElement;
  root.style.setProperty('--om-accent', normalized);
  root.style.setProperty('--om-accent-rgb', `${r} ${g} ${b}`);
  root.style.setProperty('--om-accent-soft', lightenHex(normalized, 0.35));
}

/** 启动时恢复缓存的主题色 */
export function applyStoredRoomThemeColor(): void {
  document.documentElement.removeAttribute('data-room-theme');
  try {
    localStorage.removeItem('openmusic:room-theme-style');
  } catch {
    // localStorage may be unavailable.
  }
  applyRoomThemeColor(readRoomThemeColor());
}
