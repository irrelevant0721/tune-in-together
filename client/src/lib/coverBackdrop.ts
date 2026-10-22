export type CoverBackdropTuning = {
  coverOpacity: number;
  baseOverlay: number;
  gradientTop: number;
  gradientBottom: number;
  imgBrightness: number;
};

/** 无法采样亮度时，用偏保守的遮罩避免亮色封面过曝 */
const FALLBACK_TUNING: CoverBackdropTuning = {
  coverOpacity: 0.9,
  baseOverlay: 0.16,
  gradientTop: 0.2,
  gradientBottom: 0.3,
  imgBrightness: 1.04,
};

/** 采样封面平均亮度（0=暗，1=亮） */
export function measureCoverLuminance(img: HTMLImageElement): number | null {
  try {
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let sum = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 16) continue;
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      count += 1;
    }

    return count ? sum / count / 255 : null;
  } catch {
    return null;
  }
}

/** 根据封面亮度计算背景遮罩与压暗参数 */
export function tuneCoverBackdrop(luminance: number | null): CoverBackdropTuning {
  if (luminance == null) return FALLBACK_TUNING;

  const bright = Math.max(0, luminance - 0.48);
  const factor = Math.min(1, bright / 0.35);

  return {
    coverOpacity: 0.92 - factor * 0.08,
    baseOverlay: 0.14 + factor * 0.18,
    gradientTop: 0.18 + factor * 0.16,
    gradientBottom: 0.28 + factor * 0.14,
    imgBrightness: 1.08 - factor * 0.1,
  };
}
