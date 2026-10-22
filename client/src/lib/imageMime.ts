/** 从文件头识别常见图片 MIME（IndexedDB/blob 常无正确 type） */
export function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }
  if (
    bytes.length >= 4
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

/** 规范化为上传/校验用的标准 MIME；无法识别则返回 null */
export function normalizeAllowedImageMime(raw: string | null | undefined): string | null {
  const type = String(raw || '').trim().toLowerCase();
  if (type === 'image/jpg') return 'image/jpeg';
  if (ALLOWED_IMAGE_MIME.has(type)) {
    return type === 'image/jpg' ? 'image/jpeg' : type;
  }
  return null;
}

export function imageMimeToExt(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

/** 纠正空 type / octet-stream 等错误类型，按内容嗅探 */
export async function ensureImageFile(file: Blob, nameHint = 'image'): Promise<File | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const sniffed = sniffImageMime(head);
  const normalized = normalizeAllowedImageMime(sniffed || file.type);
  if (!normalized) return null;

  const base = nameHint.replace(/\.[^.]+$/, '').trim() || 'image';
  const ext = imageMimeToExt(normalized);
  if (file instanceof File && normalizeAllowedImageMime(file.type) === normalized) {
    return file;
  }
  return new File([file], `${base.slice(0, 48)}.${ext}`, {
    type: normalized,
    lastModified: file instanceof File ? file.lastModified : Date.now(),
  });
}
