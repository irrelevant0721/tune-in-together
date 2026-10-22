/**
 * 弱播放设备检测：教育平板 / 低配 Android WebView 等解码 FLAC·母带易掉速。
 * 结果按会话缓存（UA / 硬件指标不变）。
 */

const WEAK_DEVICE_UA =
  /Readboy|iFLYTEK|Iflytek|Youxuepai|优学派|Seewo|HiteVision|步步高|BBK|学习机|HippoTuring|LenovoTB|HuaweiWGR|SM-T[0-9]{3}/i;

export type DeviceProbe = {
  userAgent: string;
  language: string;
  platform: string;
  vendor: string;
  isMobile: boolean;
  isAndroid: boolean;
  isAndroidWebView: boolean;
  isIOS: boolean;
  isWeChat: boolean;
  weakUaMatch: boolean;
  deviceMemoryGb: number | null;
  hardwareConcurrency: number | null;
  maxTouchPoints: number | null;
  cookieEnabled: boolean | null;
};

let cachedWeak: boolean | null = null;
let cachedProbe: DeviceProbe | null = null;

function readDeviceMemoryGb(): number | null {
  if (typeof navigator === 'undefined') return null;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof memory === 'number' && Number.isFinite(memory) && memory > 0
    ? memory
    : null;
}

export function getDeviceProbe(): DeviceProbe {
  if (cachedProbe) return cachedProbe;
  if (typeof navigator === 'undefined') {
    cachedProbe = {
      userAgent: '',
      language: '',
      platform: '',
      vendor: '',
      isMobile: false,
      isAndroid: false,
      isAndroidWebView: false,
      isIOS: false,
      isWeChat: false,
      weakUaMatch: false,
      deviceMemoryGb: null,
      hardwareConcurrency: null,
      maxTouchPoints: null,
      cookieEnabled: null,
    };
    return cachedProbe;
  }

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  cachedProbe = {
    userAgent: ua,
    language: navigator.language || '',
    platform: navigator.platform || '',
    vendor: navigator.vendor || '',
    isMobile: /Android|iPhone|iPad|iPod/i.test(ua),
    isAndroid,
    isAndroidWebView: isAndroid && /; wv\)/i.test(ua),
    isIOS: /iPhone|iPad|iPod/i.test(ua),
    isWeChat: /MicroMessenger/i.test(ua),
    weakUaMatch: WEAK_DEVICE_UA.test(ua),
    deviceMemoryGb: readDeviceMemoryGb(),
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    maxTouchPoints: typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : null,
    cookieEnabled: typeof navigator.cookieEnabled === 'boolean' ? navigator.cookieEnabled : null,
  };
  return cachedProbe;
}

function detectWeakPlaybackDevice(): boolean {
  const probe = getDeviceProbe();
  if (probe.weakUaMatch) return true;
  if (!probe.isMobile) return false;

  const memoryGb = probe.deviceMemoryGb;
  const cores = probe.hardwareConcurrency || 0;

  if (typeof memoryGb === 'number' && memoryGb <= 2) return true;
  if (cores > 0 && cores <= 2) return true;

  if (probe.isAndroidWebView) {
    if (typeof memoryGb === 'number') return memoryGb <= 4;
    if (cores > 0) return cores <= 4;
    return true;
  }

  return false;
}

/** 本机是否应按弱设备音质上限取链（仅影响本机播放地址，不改房间设置） */
export function isWeakPlaybackDevice(): boolean {
  if (cachedWeak !== null) return cachedWeak;
  cachedWeak = detectWeakPlaybackDevice();
  return cachedWeak;
}

/** 测试用：重置会话缓存 */
export function resetWeakPlaybackDeviceCache(): void {
  cachedWeak = null;
  cachedProbe = null;
}
