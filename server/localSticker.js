const LOCAL_STICKER_PREFIX = 'local-sticker:';
const MAX_DATA_URL_BYTES = 5 * 1024 * 1024;

function formatStickerSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
const ALLOWED_MIME = new Set(['image/gif', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export function isLocalStickerImageKey(imageKey) {
  return String(imageKey || '').startsWith(LOCAL_STICKER_PREFIX);
}

function stickerIdFromKey(imageKey) {
  return String(imageKey || '').slice(LOCAL_STICKER_PREFIX.length).trim();
}

function parseDataUrl(imageUrl) {
  const url = String(imageUrl || '').trim();
  if (!url.startsWith('data:image/')) {
    return { error: '无效的表情图片' };
  }
  const comma = url.indexOf(',');
  if (comma < 0) return { error: '无效的表情图片' };

  const header = url.slice(0, comma);
  const body = url.slice(comma + 1);
  const mime = header.slice(5).split(';')[0].toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return { error: '不支持的表情格式' };
  }

  let bytes = 0;
  if (header.includes(';base64')) {
    const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
    bytes = Math.floor((body.length * 3) / 4) - padding;
  } else {
    bytes = decodeURIComponent(body).length;
  }

  if (bytes <= 0) {
    return { error: '无效的表情图片' };
  }
  if (bytes > MAX_DATA_URL_BYTES) {
    return { error: `表情图片过大（当前 ${formatStickerSize(bytes)}，限制 ${formatStickerSize(MAX_DATA_URL_BYTES)}）` };
  }

  return { ok: true, mime };
}

export function validateLocalStickerImage(imageUrl, imageKey) {
  const key = String(imageKey || '').trim();
  if (!isLocalStickerImageKey(key)) {
    return { error: '无效的表情标识' };
  }
  const stickerId = stickerIdFromKey(key);
  if (!stickerId || stickerId.length > 80) {
    return { error: '无效的表情标识' };
  }
  return parseDataUrl(imageUrl);
}

export function localStickerImageKey(stickerId) {
  const safe = String(stickerId || '').replace(/[^\w\-]/g, '_').slice(0, 80);
  return `${LOCAL_STICKER_PREFIX}${safe}`;
}
