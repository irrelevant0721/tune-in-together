import { normalizeCoverResolution } from '../../../lib/roomVisualPreset';

/** Mineradio coverTextureSizeForResolution */
export function coverTextureSizeForResolution(value: number): number {
  const v = normalizeCoverResolution(value);
  if (v >= 1.32) return 512;
  if (v >= 1.1) return 384;
  return 256;
}

/** Mineradio makeSquareCoverCanvas — 居中裁切为正方形 */
export function makeSquareCoverCanvas(
  img: CanvasImageSource,
  size = 512,
): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  // 后续会 sampleCoverAccentColor / 粒子取色 getImageData
  const cx = cv.getContext('2d', { willReadFrequently: true });
  if (!cx) return cv;

  if (img instanceof HTMLImageElement) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const s = Math.min(iw, ih);
    cx.drawImage(img, (iw - s) / 2, (ih - s) / 2, s, s, 0, 0, size, size);
  } else if (img instanceof HTMLCanvasElement) {
    const iw = img.width;
    const ih = img.height;
    const s = Math.min(iw, ih);
    cx.drawImage(img, (iw - s) / 2, (ih - s) / 2, s, s, 0, 0, size, size);
  } else {
    cx.drawImage(img, 0, 0, size, size);
  }
  return cv;
}

export function visualEase(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** 从封面画布采样主色（对齐 Mineradio 封面取色） */
export function sampleCoverAccentColor(cv: HTMLCanvasElement): string {
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '#9db8cf';
  const w = cv.width;
  const h = cv.height;
  const samples: [number, number][] = [
    [0.5, 0.5],
    [0.22, 0.22],
    [0.78, 0.78],
    [0.22, 0.78],
    [0.78, 0.22],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [u, v] of samples) {
    const d = ctx.getImageData(
      Math.min(w - 1, Math.max(0, Math.floor(u * w))),
      Math.min(h - 1, Math.max(0, Math.floor(v * h))),
      1,
      1,
    ).data;
    r += d[0];
    g += d[1];
    b += d[2];
  }
  const n = samples.length;
  const toHex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** 切歌时复制当前深度图，返回独立 canvas（尺寸变化时勿原地改 THREE.Texture.image） */
export function cloneEdgeCanvas(
  currentEdge: HTMLCanvasElement | null | undefined,
): HTMLCanvasElement | null {
  if (!currentEdge || currentEdge.width < 2) return null;
  const prevCv = document.createElement('canvas');
  prevCv.width = currentEdge.width;
  prevCv.height = currentEdge.height;
  const pctx = prevCv.getContext('2d');
  if (!pctx) return null;
  try {
    pctx.drawImage(currentEdge, 0, 0);
    return prevCv;
  } catch {
    return null;
  }
}

/** 切歌时复制当前封面，返回独立 canvas */
export function cloneCoverCanvas(
  currentImage: CanvasImageSource | null | undefined,
): HTMLCanvasElement | null {
  if (!currentImage) return null;
  const prevW =
    currentImage instanceof HTMLImageElement
      ? currentImage.naturalWidth || currentImage.width
      : currentImage instanceof HTMLCanvasElement
        ? currentImage.width
        : 256;
  const prevH =
    currentImage instanceof HTMLImageElement
      ? currentImage.naturalHeight || currentImage.height
      : currentImage instanceof HTMLCanvasElement
        ? currentImage.height
        : 256;
  const prevScale = Math.min(1, 256 / Math.max(prevW, prevH, 1));
  const prevCv = document.createElement('canvas');
  prevCv.width = Math.max(1, Math.round(prevW * prevScale));
  prevCv.height = Math.max(1, Math.round(prevH * prevScale));
  const pctx = prevCv.getContext('2d');
  if (!pctx) return null;
  try {
    pctx.drawImage(currentImage, 0, 0, prevCv.width, prevCv.height);
    return prevCv;
  } catch {
    return null;
  }
}
