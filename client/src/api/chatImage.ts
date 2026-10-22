import { prepareChatImageFile } from '../lib/compressChatImage';
import { ensureImageFile, imageMimeToExt, normalizeAllowedImageMime } from '../lib/imageMime';
import { fetchWithTimeout } from './http';

const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024;

/** 聊天列表只加载七牛处理后的缩略图，点击预览仍使用原图。 */
export function getChatImageDisplayUrl(url: string, key?: string | null): string {
  const normalizedUrl = String(url || '').trim();
  const normalizedKey = String(key || '').trim();
  if (!normalizedUrl || !normalizedKey || !normalizedKey.startsWith('openmusic/chat/')) return normalizedUrl;
  return `${normalizedUrl}${normalizedUrl.includes('?') ? '&' : '?'}imageView2/2/w/440/interlace/1`;
}


export interface ChatImageUploadToken {
  token: string;
  key: string;
  uploadUrl: string;
  url: string;
}

export interface ChatImageUploadResult {
  url: string;
  key: string;
  previewUrl: string;
}

export function validateChatImageFile(file: File): string | null {
  if (!normalizeAllowedImageMime(file.type)) {
    return '仅支持 JPG、PNG、GIF、WebP 图片';
  }
  if (file.size > MAX_CHAT_IMAGE_BYTES) {
    return '图片不能超过 5MB';
  }
  return null;
}

export async function fetchChatUploadEnabled(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout('/api/chat/upload-config');
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.enabled);
  } catch {
    return false;
  }
}

async function requestChatImageUploadToken(roomId: string, ext: string): Promise<ChatImageUploadToken> {
  const res = await fetchWithTimeout('/api/chat/upload-token', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, ext }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || '获取上传凭证失败');
  }
  return data as ChatImageUploadToken;
}

export async function uploadChatImage(roomId: string, file: File): Promise<ChatImageUploadResult> {
  const typed = await ensureImageFile(file, file.name || 'image');
  if (!typed) {
    throw new Error('仅支持 JPG、PNG、GIF、WebP 图片');
  }

  const prepared = await prepareChatImageFile(typed);
  const validationError = validateChatImageFile(prepared);
  if (validationError) {
    throw new Error(validationError);
  }

  const ext = imageMimeToExt(prepared.type);
  const tokenData = await requestChatImageUploadToken(roomId, ext);

  const formData = new FormData();
  formData.append('file', prepared);
  formData.append('token', tokenData.token);
  formData.append('key', tokenData.key);

  const uploadRes = await fetchWithTimeout(tokenData.uploadUrl, {
    method: 'POST',
    body: formData,
  }, 60000);

  if (!uploadRes.ok) {
    throw new Error('图片上传失败');
  }

  return {
    url: tokenData.url,
    key: tokenData.key,
    previewUrl: URL.createObjectURL(prepared),
  };
}
