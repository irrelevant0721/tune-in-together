import type { RoomVisualFxSettings } from './roomVisualPreset';
import { readRoomVisualFx } from './roomVisualPreset';
import type { LyricPalette } from './lyricStyle';
import {
  effectiveLyricPalette,
  extractLyricPaletteFromCover,
  resolveBaseLyricPalette,
  silverBlueLyricPalette,
} from './lyricStyle';

const paletteListeners = new Set<() => void>();

let readFx: () => RoomVisualFxSettings = readRoomVisualFx;

/** 由 roomVisualFxLive 在模块初始化后注入，避免循环依赖 */
export function bindStageLyricFxSource(getter: () => RoomVisualFxSettings): void {
  readFx = getter;
}

export const stageLyricPaletteLive: {
  coverPalette: LyricPalette | null;
  palette: LyricPalette;
} = {
  coverPalette: null,
  palette: silverBlueLyricPalette(),
};

export function subscribeStageLyricPalette(listener: () => void): () => void {
  paletteListeners.add(listener);
  return () => {
    paletteListeners.delete(listener);
  };
}

function notifyPaletteListeners(): void {
  paletteListeners.forEach((listener) => listener());
}

export function recomputeStageLyricPalette(): LyricPalette {
  const fx = readFx();
  const base = resolveBaseLyricPalette(fx, stageLyricPaletteLive.coverPalette);
  stageLyricPaletteLive.palette = effectiveLyricPalette(fx, base);
  notifyPaletteListeners();
  return stageLyricPaletteLive.palette;
}

/** Mineradio setStageLyricPalette */
export function setStageLyricPaletteFromCover(pal: LyricPalette | null): void {
  if (pal) stageLyricPaletteLive.coverPalette = pal;
  recomputeStageLyricPalette();
}

/** Mineradio updateLyricPaletteFromCover */
export function updateLyricPaletteFromCover(coverCanvas: HTMLCanvasElement | null | undefined): void {
  if (!coverCanvas) return;
  const pal = extractLyricPaletteFromCover(coverCanvas);
  if (!pal) return;
  stageLyricPaletteLive.coverPalette = pal;
  if (readFx().lyricColorMode !== 'custom') {
    recomputeStageLyricPalette();
  }
}
