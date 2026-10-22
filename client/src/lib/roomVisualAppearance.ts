import type { RoomVisualFxSettings } from './roomVisualPreset';
import { normalizeHexColor } from './roomVisualPreset';

export function hexToRgbTuple(hex: string): [number, number, number] {
  const n = normalizeHexColor(hex, '#00f5d4');
  return [
    parseInt(n.slice(1, 3), 16),
    parseInt(n.slice(3, 5), 16),
    parseInt(n.slice(5, 7), 16),
  ];
}

/** Mineradio applyUiAccent / applyControlGlassChromaticOffset 等 — 写入 CSS 变量 */
export function applyRoomVisualAppearance(fx: RoomVisualFxSettings): void {
  const root = document.documentElement;
  const [ar, ag, ab] = hexToRgbTuple(fx.uiAccentColor);
  root.style.setProperty('--fc-accent-rgb', `${ar}, ${ag}, ${ab}`);
  root.style.setProperty('--om-ui-accent', normalizeHexColor(fx.uiAccentColor, '#00f5d4'));
  root.style.setProperty('--om-home-accent', normalizeHexColor(fx.homeAccentColor, '#00f5d4'));
  root.style.setProperty('--om-home-icon', normalizeHexColor(fx.homeIconColor, '#f4d28a'));
  root.style.setProperty('--om-visual-icon', normalizeHexColor(fx.visualIconColor, '#7fd8ff'));
  root.style.setProperty('--om-bg-color', normalizeHexColor(fx.backgroundColor, '#000000'));
  root.style.setProperty('--om-bg-opacity', String(fx.backgroundOpacity));
  root.style.setProperty('--om-glass-chromatic', String(Math.round(fx.controlGlassChromaticOffset)));

  const filter = document.getElementById('mineradio-control-glass-filter');
  if (filter) {
    const dx = String(-Math.round(fx.controlGlassChromaticOffset));
    filter.querySelectorAll('feOffset').forEach((node) => {
      node.setAttribute('dx', dx);
      node.setAttribute('dy', '0');
    });
  }
}

export function effectiveBackgroundColor(fx: RoomVisualFxSettings, coverAccent?: string): string {
  if (fx.backgroundColorMode === 'custom') {
    return normalizeHexColor(fx.backgroundColor, '#000000');
  }
  if (coverAccent) return coverAccent;
  return '#08090b';
}
