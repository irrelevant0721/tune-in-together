import { ensureImageFile, normalizeAllowedImageMime } from './imageMime';

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;
const WEBP_QUALITY = 0.82;
const TARGET_MAX_BYTES = 2 * 1024 * 1024;
export const MAX_SOURCE_CHAT_IMAGE_BYTES = 20 * 1024 * 1024;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('图片压缩失败'));
      },
      type,
      quality,
    );
  });
}

function buildOutputName(sourceName: string, ext: string) {
  const base = sourceName.replace(/\.[^.]+$/, '').trim() || 'image';
  return `${base.slice(0, 48)}.${ext}`;
}

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  mimeType: 'image/jpeg' | 'image/webp',
  ext: 'jpg' | 'webp',
  sourceName: string,
): Promise<File> {
  const initialQuality = mimeType === 'image/jpeg' ? JPEG_QUALITY : WEBP_QUALITY;
  let quality = initialQuality;
  let blob = await canvasToBlob(canvas, mimeType, quality);

  while (blob.size > TARGET_MAX_BYTES && quality > 0.45) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  return new File([blob], buildOutputName(sourceName, ext), {
    type: mimeType,
    lastModified: Date.now(),
  });
}

export async function prepareChatImageFile(file: File): Promise<File> {
  if (file.size > MAX_SOURCE_CHAT_IMAGE_BYTES) {
    throw new Error('图片不能超过 20MB');
  }

  const typed = await ensureImageFile(file, file.name || 'image');
  if (!typed) {
    throw new Error('仅支持 JPG、PNG、GIF、WebP 图片');
  }

  if (typed.type === 'image/gif') {
    return typed;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(typed);
    if (
      bitmap.width <= MAX_DIMENSION
      && bitmap.height <= MAX_DIMENSION
      && typed.size <= 512 * 1024
    ) {
      return typed;
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法处理图片');

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const mime = normalizeAllowedImageMime(typed.type) || 'image/jpeg';
    const useWebp = mime === 'image/png' || mime === 'image/webp';
    return encodeCanvas(
      canvas,
      useWebp ? 'image/webp' : 'image/jpeg',
      useWebp ? 'webp' : 'jpg',
      typed.name || 'image',
    );
  } finally {
    bitmap?.close();
  }
}

export function readClipboardImageFile(clipboardData: DataTransfer | null): File | null {
  if (!clipboardData?.items?.length) return null;

  for (const item of clipboardData.items) {
    if (!item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (file) return file;
  }

  return null;
}
