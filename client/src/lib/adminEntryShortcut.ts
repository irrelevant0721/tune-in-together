const STORAGE_KEY = 'openmusic:admin-entry-path';

/**
 * 只存在本机浏览器的 localStorage，不上传服务器、不出现在页面 HTML 里。
 * 别人访问首页时这里读到的永远是空，不会泄露真实管理入口路径。
 */
export function rememberAdminEntryPath(path: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, path);
  } catch {
    // localStorage 不可用（隐私模式等）时静默跳过，不影响后台本身可用
  }
}

export function getRememberedAdminEntryPath(): string | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value && value.startsWith('/') ? value : null;
  } catch {
    return null;
  }
}
