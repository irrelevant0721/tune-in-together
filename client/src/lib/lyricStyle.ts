import type { RoomVisualFxSettings } from './roomVisualPreset';
import { DEFAULT_ROOM_VISUAL_FX, normalizeHexColor } from './roomVisualPreset';

/** Mineradio lyricColorPresets */
export const LYRIC_COLOR_PRESETS = [
  { name: '雾蓝', color: '#a9b8c8' },
  { name: '银蓝', color: '#9db8cf' },
  { name: '冰川', color: '#7ec8d8' },
  { name: '青绿', color: '#66d2b5' },
  { name: '松针', color: '#7fa894' },
  { name: '月白', color: '#d7d2c4' },
  { name: '岩金', color: '#c3ae7c' },
  { name: '琥珀', color: '#d9a45f' },
  { name: '暮粉', color: '#c78aa4' },
  { name: '玫红', color: '#d76a8d' },
  { name: '烟紫', color: '#9b83d3' },
  { name: '电紫', color: '#8d70ff' },
  { name: '靛蓝', color: '#5e78d8' },
  { name: '海蓝', color: '#3c9fe0' },
  { name: '霓青', color: '#28c5c3' },
  { name: '夜绿', color: '#245c49' },
  { name: '酒红', color: '#6d1f35' },
  { name: '墨黑', color: '#111318' },
] as const;

export type LyricFontKey =
  | 'sans'
  | 'hei'
  | 'song'
  | 'bold-song'
  | 'stone-song'
  | 'kai-song'
  | 'serif-en'
  | 'gothic'
  | 'editorial'
  | 'humanist'
  | 'mono'
  | 'display';

export const LYRIC_FONT_OPTIONS: Array<{ key: LyricFontKey; label: string }> = [
  { key: 'sans', label: '默认' },
  { key: 'hei', label: '黑体' },
  { key: 'song', label: '宋体' },
  { key: 'bold-song', label: '粗宋' },
  { key: 'stone-song', label: '石印宋' },
  { key: 'kai-song', label: '楷宋' },
  { key: 'serif-en', label: 'Serif' },
  { key: 'gothic', label: 'Gothic' },
  { key: 'editorial', label: 'Editorial' },
  { key: 'humanist', label: 'Humanist' },
  { key: 'mono', label: '等宽' },
  { key: 'display', label: '标题' },
];

export interface LyricPalette {
  primary: string;
  secondary: string;
  highlight: string;
  shadow: string;
  glow: string;
  glowColor?: string;
}

function clampRange(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = normalizeHexColor(hex, '#a9b8c8').slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

function rgbCss(rgb: { r: number; g: number; b: number }, alpha?: number): string {
  if (alpha == null) return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

/**
 * Mineradio lyricHighImpactTextHsl —
 * 歌词文字一律推到高亮高饱和区间，绝不压成暗色，否则深色背景上直接看不清。
 */
function lyricHighImpactTextHsl(
  hsl: { h: number; s: number; l: number },
  opts: { avgL?: number; minS?: number; neutralCutoff?: number; sampledBright?: boolean } = {},
): { h: number; s: number; l: number; neutral: boolean } {
  const avgL = opts.avgL == null ? hsl.l : opts.avgL;
  const neutral = hsl.s < (opts.neutralCutoff ?? 0.035);
  const sampledBright = hsl.l >= 0.62 || avgL >= 0.64 || opts.sampledBright === true;
  const minS = opts.minS ?? 0.88;
  const s = neutral
    ? 0
    : sampledBright
      ? clampRange(Math.max(hsl.s, minS), 0, 1)
      : clampRange(Math.max(hsl.s * 1.2, minS), 0, 1);
  const l = sampledBright
    ? clampRange(Math.max(hsl.l, 0.7), 0.66, 0.94)
    : clampRange(Math.max(hsl.l + 0.3, 0.74), 0.7, 0.9);
  return { h: hsl.h, s, l, neutral };
}

/** Mineradio lyricPaletteFromHex */
export function lyricPaletteFromHex(hex: string): LyricPalette {
  const c = hexToRgb(hex);
  const hsl = rgbToHsl(c.r, c.g, c.b);
  const tone = lyricHighImpactTextHsl(hsl, { minS: 0.86 });
  const primary = hslToRgb(tone.h, tone.s, tone.l);
  const secondary = hslToRgb(
    (tone.h + 0.055) % 1,
    tone.neutral ? 0 : clampRange(Math.max(tone.s * 0.92, 0.8), 0, 1),
    clampRange(tone.l - 0.1, 0.58, 0.86),
  );
  const highlight = hslToRgb(
    (tone.h + 0.018) % 1,
    tone.neutral ? 0 : clampRange(Math.max(tone.s * 0.82, 0.74), 0, 1),
    clampRange(tone.l + 0.12, 0.8, 0.96),
  );
  return {
    primary: rgbCss(primary),
    secondary: rgbCss(secondary),
    highlight: rgbCss(highlight),
    shadow: 'rgba(0,6,10,0.48)',
    glow: rgbCss(primary, 0.3),
  };
}

/** Mineradio silverBlueLyricPalette */
export function silverBlueLyricPalette(): LyricPalette {
  return {
    primary: '#d8f1ff',
    secondary: '#9db8cf',
    highlight: '#eef7ff',
    shadow: 'rgba(0,7,12,0.48)',
    glow: 'rgba(138,190,255,0.26)',
  };
}

/** 整张封面的色度统计，用来判断这张图值不值得取色 */
export interface LyricCoverChromaStats {
  avgChroma?: number;
  maxChroma?: number;
  colorfulRatio?: number;
  usableColorfulRatio?: number;
  monochrome?: boolean;
}

/** Mineradio lyricCoverLooksMonochrome */
function lyricCoverLooksMonochrome(stats: LyricCoverChromaStats): boolean {
  return (
    (stats.maxChroma ?? 0) < 0.095 ||
    (stats.avgChroma ?? 0) < 0.026 ||
    (stats.colorfulRatio ?? 0) < 0.014 ||
    (stats.usableColorfulRatio ?? 0) < 0.006
  );
}

/** Mineradio lyricTextPaletteFromHsl */
export function lyricTextPaletteFromHsl(
  hsl: { h: number; s: number; l: number },
  avgL: number,
  chroma: number,
  opts: LyricCoverChromaStats = {},
): LyricPalette {
  const sampleChroma = Number.isFinite(chroma) ? chroma : 0;
  const avgChroma = Number.isFinite(opts.avgChroma) ? (opts.avgChroma as number) : sampleChroma;
  const maxChroma = Number.isFinite(opts.maxChroma) ? (opts.maxChroma as number) : sampleChroma;
  const colorfulRatio = Number.isFinite(opts.colorfulRatio)
    ? (opts.colorfulRatio as number)
    : sampleChroma > 0.055
      ? 1
      : 0;
  // 灰度封面 / 太暗 / 色度不够，一律退回银蓝色，不硬凑一个脏色出来
  if (
    opts.monochrome === true ||
    avgL < 0.16 ||
    sampleChroma < 0.055 ||
    avgChroma < 0.026 ||
    maxChroma < 0.095 ||
    colorfulRatio < 0.014 ||
    hsl.s < 0.06
  ) {
    return silverBlueLyricPalette();
  }
  const hue = hsl.h;
  if (avgL < 0.3 && (hue < 0.06 || hue > 0.86 || (hue > 0.75 && hue < 0.86))) {
    return silverBlueLyricPalette();
  }
  const tone = lyricHighImpactTextHsl(hsl, {
    avgL,
    minS: 0.9,
    sampledBright: avgL > 0.66 || hsl.l > 0.62,
  });
  const c1 = hslToRgb(tone.h, tone.s, tone.l);
  const c2 = hslToRgb(
    (tone.h + 0.08) % 1,
    clampRange(Math.max(tone.s * 0.9, 0.78), 0, 1),
    clampRange(tone.l - 0.1, 0.58, 0.86),
  );
  return {
    primary: rgbCss(c1),
    secondary: rgbCss(c2),
    highlight: rgbCss(
      hslToRgb(
        (tone.h + 0.03) % 1,
        clampRange(Math.max(tone.s * 0.82, 0.72), 0, 1),
        clampRange(tone.l + 0.12, 0.8, 0.96),
      ),
    ),
    shadow: 'rgba(0,6,10,0.48)',
    glow: rgbCss(c1, 0.3),
  };
}

/** Mineradio updateLyricPaletteFromCover */
export function extractLyricPaletteFromCover(coverCanvas: HTMLCanvasElement): LyricPalette | null {
  try {
    const ctx = coverCanvas.getContext('2d');
    if (!ctx) return null;
    const img = ctx.getImageData(0, 0, coverCanvas.width, coverCanvas.height).data;
    const w = coverCanvas.width;
    const h = coverCanvas.height;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;
    let sumChroma = 0;
    let maxChroma = 0;
    let colorfulCount = 0;
    let usableColorfulCount = 0;
    let best = { score: -1, r: 143, g: 233, b: 255, chroma: 0 };
    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) {
        const di = (y * w + x) * 4;
        const r = img[di];
        const g = img[di + 1];
        const b = img[di + 2];
        const a = img[di + 3] / 255;
        if (a < 0.5) continue;
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const chroma = (maxC - minC) / 255;
        const edgePenalty = Math.abs(lum - 0.5);
        const score = chroma * 1.6 + (0.5 - edgePenalty) * 0.45;
        sumR += r;
        sumG += g;
        sumB += b;
        count += 1;
        sumChroma += chroma;
        if (chroma > maxChroma) maxChroma = chroma;
        const hs = rgbToHsl(r, g, b);
        if (chroma > 0.055 && hs.s > 0.075) colorfulCount += 1;
        if (chroma > 0.08 && hs.s > 0.1 && lum > 0.08 && lum < 0.92) usableColorfulCount += 1;
        if (lum > 0.08 && lum < 0.92 && score > best.score) {
          best = { score, r, g, b, chroma };
        }
      }
    }
    if (!count) return null;
    const avgL = (sumR / count * 0.299 + sumG / count * 0.587 + sumB / count * 0.114) / 255;
    const stats: LyricCoverChromaStats = {
      avgChroma: sumChroma / count,
      maxChroma,
      colorfulRatio: colorfulCount / count,
      usableColorfulRatio: usableColorfulCount / count,
    };
    stats.monochrome = lyricCoverLooksMonochrome(stats);
    const hsl = rgbToHsl(best.r, best.g, best.b);
    // 传的是采样点色度，不是打分——score 会到 1.8，当色度用会把饱和度顶爆
    return lyricTextPaletteFromHsl(hsl, avgL, Math.max(0, best.chroma), stats);
  } catch {
    return null;
  }
}

/** Mineradio effectiveLyricPalette */
export function effectiveLyricPalette(
  fx: RoomVisualFxSettings,
  basePalette: LyricPalette,
): LyricPalette {
  const out: LyricPalette = {
    primary: basePalette.primary || '#d6f8ff',
    secondary: basePalette.secondary || '#9cffdf',
    highlight: basePalette.highlight || '#eef7ff',
    shadow: basePalette.shadow || 'rgba(2,8,12,0.42)',
    glow: basePalette.glow || 'rgba(143,233,255,0.34)',
  };
  if (fx.lyricHighlightMode === 'custom') {
    const hi = lyricPaletteFromHex(fx.lyricHighlightColor);
    out.highlight = hi.primary;
    if (fx.lyricGlowLinked !== false) {
      out.glowColor = hi.secondary || hi.primary;
      out.glow = hi.glow || out.glow;
    }
  }
  if (fx.lyricGlowLinked === false) {
    const glowPal = lyricPaletteFromHex(fx.lyricGlowColor || '#9db8cf');
    out.glowColor = glowPal.primary;
    out.glow = glowPal.glow || out.glow;
  }
  if (!out.glowColor) out.glowColor = out.secondary;
  return out;
}

export function resolveBaseLyricPalette(
  fx: RoomVisualFxSettings,
  coverPalette: LyricPalette | null,
): LyricPalette {
  if (fx.lyricColorMode === 'custom') {
    return lyricPaletteFromHex(fx.lyricColor);
  }
  return coverPalette || silverBlueLyricPalette();
}

export function normalizeLyricFontKey(value: unknown): LyricFontKey {
  const key = String(value || 'sans');
  if (/^(sans|hei|song|bold-song|stone-song|kai-song|serif-en|gothic|editorial|humanist|mono|display)$/.test(key)) {
    return key as LyricFontKey;
  }
  return 'sans';
}

/** Mineradio lyricFontStackForKey — Web 可加载字体置前，系统字体作回退 */
export function lyricFontStackForKey(key: LyricFontKey): string {
  switch (normalizeLyricFontKey(key)) {
    case 'hei':
      return '"Noto Sans SC","Microsoft YaHei",SimHei,"PingFang SC",sans-serif';
    case 'song':
      return '"Noto Serif SC","Source Han Serif SC",SimSun,"Songti SC",serif';
    case 'bold-song':
      return '"Noto Serif SC","Source Han Serif SC Heavy","Source Han Serif SC","STZhongsong","SimSun",serif';
    case 'stone-song':
      return '"Noto Serif SC","FZYaSongS-B-GB","FZCuSong-B09S","STZhongsong","SimSun",serif';
    case 'kai-song':
      return '"LXGW WenKai","Kaiti SC","STKaiti","KaiTi","Noto Serif SC",serif';
    case 'serif-en':
      return 'Georgia,"Times New Roman","Noto Serif SC","Source Han Serif SC",serif';
    case 'gothic':
      return '"UnifrakturCook","UnifrakturMaguntia","Cinzel Decorative","Old English Text MT","Noto Serif SC",serif';
    case 'editorial':
      return '"Libre Baskerville","Didot","Bodoni 72",Georgia,"Noto Serif SC",serif';
    case 'humanist':
      return 'Inter,"Avenir Next","Segoe UI","Noto Sans SC","PingFang SC",sans-serif';
    case 'mono':
      return '"JetBrains Mono",Consolas,"Noto Sans SC","Microsoft YaHei",monospace';
    case 'display':
      return '"Noto Sans SC","Alibaba PuHuiTi","PingFang SC","Microsoft YaHei",sans-serif';
    default:
      return 'Inter,"Noto Sans SC","PingFang SC","Microsoft YaHei",Arial,sans-serif';
  }
}

export function lyricFontWeightValue(fx: RoomVisualFxSettings): number {
  const key = normalizeLyricFontKey(fx.lyricFont);
  if (key === 'stone-song' || key === 'bold-song') return 900;
  if (key === 'display') {
    return Math.max(
      700,
      Math.round(clampRange(Number(fx.lyricWeight) || 900, 500, 900) / 50) * 50,
    );
  }
  return Math.round(clampRange(Number(fx.lyricWeight) || 900, 500, 900) / 50) * 50;
}

export function lyricFontCss(fx: RoomVisualFxSettings, fontSize: number): string {
  return `${lyricFontWeightValue(fx)} ${fontSize}px ${lyricFontStackForKey(fx.lyricFont)}`;
}

export function lyricLetterSpacingPx(fx: RoomVisualFxSettings, fontSize: number): number {
  return clampRange(Number(fx.lyricLetterSpacing) || 0, -0.04, 0.18) * Math.max(1, fontSize || 1);
}

export function lyricLineHeightFactor(fx: RoomVisualFxSettings): number {
  return clampRange(Number(fx.lyricLineHeight) || 1, 0.72, 1.8);
}

export function measureTextWithLetterSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  spacing: number,
): number {
  if (!spacing || text.length < 2) return ctx.measureText(text).width;
  const chars = Array.from(text);
  let w = 0;
  for (let i = 0; i < chars.length; i++) {
    w += ctx.measureText(chars[i]).width;
    if (i < chars.length - 1) w += spacing;
  }
  return Math.max(1, w);
}

export function drawTextWithLetterSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  stroke = false,
): void {
  if (!spacing || text.length < 2) {
    if (stroke) ctx.strokeText(text, x, y);
    else ctx.fillText(text, x, y);
    return;
  }
  const chars = Array.from(text);
  const align = ctx.textAlign || 'left';
  const width = measureTextWithLetterSpacing(ctx, text, spacing);
  let start = x;
  if (align === 'center') start = x - width / 2;
  else if (align === 'right' || align === 'end') start = x - width;
  ctx.textAlign = 'left';
  let cursor = start;
  for (let i = 0; i < chars.length; i++) {
    if (stroke) ctx.strokeText(chars[i], cursor, y);
    else ctx.fillText(chars[i], cursor, y);
    cursor += ctx.measureText(chars[i]).width + (i < chars.length - 1 ? spacing : 0);
  }
  ctx.textAlign = align;
}

export function defaultLyricTypographyPatch(): Pick<
  RoomVisualFxSettings,
  | 'lyricColorMode'
  | 'lyricColor'
  | 'lyricHighlightMode'
  | 'lyricHighlightColor'
  | 'lyricGlowLinked'
  | 'lyricGlowColor'
  | 'lyricFont'
  | 'lyricLetterSpacing'
  | 'lyricLineHeight'
  | 'lyricWeight'
> {
  const d = DEFAULT_ROOM_VISUAL_FX;
  return {
    lyricColorMode: d.lyricColorMode,
    lyricColor: d.lyricColor,
    lyricHighlightMode: d.lyricHighlightMode,
    lyricHighlightColor: d.lyricHighlightColor,
    lyricGlowLinked: d.lyricGlowLinked,
    lyricGlowColor: d.lyricGlowColor,
    lyricFont: d.lyricFont,
    lyricLetterSpacing: d.lyricLetterSpacing,
    lyricLineHeight: d.lyricLineHeight,
    lyricWeight: d.lyricWeight,
  };
}
