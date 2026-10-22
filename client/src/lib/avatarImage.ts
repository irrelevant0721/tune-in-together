/** 头像上传处理：裁剪居中正方形、缩放到固定尺寸后转 base64 data URL */

const AVATAR_SIZE = 128;
/** 与服务端 MAX_AVATAR_DATA_URL_LENGTH 保持一致 */
export const MAX_AVATAR_DATA_URL_LENGTH = 200 * 1024;
const AVATAR_DATA_URL_PATTERN = /^data:image\/(jpeg|png);base64,/;

export function isValidAvatarDataUrl(value: string | null | undefined): value is string {
  const raw = String(value || '').trim();
  return Boolean(raw) && AVATAR_DATA_URL_PATTERN.test(raw) && raw.length <= MAX_AVATAR_DATA_URL_LENGTH;
}

/** 头像只接受服务端认可的压缩 data URL，避免旧缓存/恶意外链被原图加载。 */
export function getSafeAvatarUrl(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  return isValidAvatarDataUrl(raw) ? raw : '';
}

export function resolveRoomAvatarUrl(
  localAvatarUrl: string | null | undefined,
  roomAvatarUrl: string | null | undefined,
): string {
  return getSafeAvatarUrl(localAvatarUrl) || getSafeAvatarUrl(roomAvatarUrl);
}

export function isSupportedAvatarFile(file: File): boolean {
  return file.type === 'image/jpeg' || file.type === 'image/png';
}

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('图片加载失败'));
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('当前浏览器不支持图片处理');

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    // PNG 保留透明通道；JPG 有损压缩控制体积
    const dataUrl = file.type === 'image/png'
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', 0.85);

    if (dataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
      // 128px 图正常不会超限，兜底再压一档
      const fallback = canvas.toDataURL('image/jpeg', 0.7);
      if (fallback.length > MAX_AVATAR_DATA_URL_LENGTH) throw new Error('图片过大，请换一张');
      return fallback;
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
