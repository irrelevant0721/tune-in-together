import { fetchWithTimeout } from '../api/http';

export interface WechatUinBinding {
  wechatUin: string;
  boundAt: number;
}

export interface WechatUinStatus {
  enabled: boolean;
  bound: WechatUinBinding | null;
}

export async function fetchWechatUinStatus(roomId?: string): Promise<WechatUinStatus> {
  try {
    const res = await fetchWithTimeout(`/api/auth/wechat-uin/status${roomId ? `?roomId=${encodeURIComponent(roomId)}` : ''}`, {}, 8000);
    if (!res.ok) return { enabled: false, bound: null };
    const data = await res.json().catch(() => ({}));
    return { enabled: Boolean(data.enabled), bound: data.bound ?? null };
  } catch {
    return { enabled: false, bound: null };
  }
}

export async function bindWechatUin(roomId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchWithTimeout('/api/auth/wechat-uin/bind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId }),
    }, 10000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || '微信绑定失败' };
    return { success: true };
  } catch {
    return { success: false, error: '网络错误，微信绑定失败' };
  }
}

export async function recoverWechatUin(roomId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchWithTimeout('/api/auth/wechat-uin/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId }),
    }, 10000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || '微信身份找回失败' };
    return { success: true };
  } catch {
    return { success: false, error: '网络错误，微信身份找回失败' };
  }
}

export async function unbindWechatUin(roomId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchWithTimeout('/api/auth/wechat-uin/unbind', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId }) }, 10000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || '微信解绑失败' };
    return { success: true };
  } catch {
    return { success: false, error: '网络错误，微信解绑失败' };
  }
}
