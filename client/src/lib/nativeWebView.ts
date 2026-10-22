type NativeHandler = (name: string, payload?: unknown) => Promise<unknown>;

declare global {
  interface Window {
    flutter_inappwebview?: { callHandler: NativeHandler };
    __OPENMUSIC_NATIVE_BRIDGE_TOKEN__?: string;
  }
}

function nativeBridge(): { callHandler: NativeHandler } | null {
  return window.flutter_inappwebview ?? null;
}

export function getNativeBridgeToken(): string | null {
  const token = window.__OPENMUSIC_NATIVE_BRIDGE_TOKEN__;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

async function callNativeHandler(
  name: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const bridge = nativeBridge();
  const bridgeToken = getNativeBridgeToken();
  if (!bridge || !bridgeToken) return false;
  await bridge.callHandler(name, { ...payload, bridgeToken });
  return true;
}

export async function shareWithNative(text: string): Promise<boolean> {
  if (!text.trim()) return false;
  try {
    return await callNativeHandler('omNative', { action: 'share', text });
  } catch {
    return false;
  }
}

export async function vibrateWithNative(): Promise<boolean> {
  try {
    return await callNativeHandler('omNative', { action: 'vibrate' });
  } catch {
    return false;
  }
}

export async function openWithNativeBrowser(rawUrl: string): Promise<boolean> {
  try {
    const url = new URL(rawUrl, window.location.href);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return await callNativeHandler('omNative', {
      action: 'openExternal',
      url: url.toString(),
    });
  } catch {
    return false;
  }
}
