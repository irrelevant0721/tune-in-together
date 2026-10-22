/** 房间自定义封面：居中裁剪正方形，几乎不损清晰度 */

/** 显示端最大约 96px，留足清晰度余量 */
const COVER_SIZE = 512;
/** 接近原图观感，仅去掉极少不可见细节 */
const JPEG_QUALITY = 0.96;
/** 与服务端 MAX_CUSTOM_COVER_DATA_URL_LENGTH 保持一致 */
const MAX_DATA_URL_LENGTH = 800 * 1024;

export function isSupportedRoomCoverFile(file: File): boolean {
  return file.type === 'image/jpeg' || file.type === 'image/png';
}

export async function fileToRoomCoverDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('图片加载失败'));
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = COVER_SIZE;
    canvas.height = COVER_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('当前浏览器不支持图片处理');

    // JPEG 无透明通道：白底避免 PNG 透明区变黑
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, COVER_SIZE, COVER_SIZE);

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, COVER_SIZE, COVER_SIZE);

    let dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

    // 超限时只轻微加压，避免肉眼明显糊掉
    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    }
    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    }
    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      throw new Error('图片过大，请换一张稍小的图');
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
