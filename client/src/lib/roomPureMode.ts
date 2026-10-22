const PURE_MODE_KEY = 'openmusic:room-pure-mode';
const LEGACY_FOCUS_MODE_KEY = 'openmusic:room-focus-mode';

/** 浏览器标签页伪装标题（与页面 UI 无关） */
const DISGUISE_TITLES = [
  '工作台',
  '内部系统',
  'OA门户',
  '企业邮箱',
  '文档中心',
  '项目管理',
] as const;

const DISGUISE_FAVICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="#9ca3af" width="32" height="32" rx="4"/><rect fill="#f3f4f6" x="8" y="6" width="16" height="20" rx="1"/><line x1="11" y1="11" x2="21" y2="11" stroke="#d1d5db" stroke-width="1.5"/><line x1="11" y1="15" x2="21" y2="15" stroke="#d1d5db" stroke-width="1.5"/><line x1="11" y1="19" x2="17" y2="19" stroke="#d1d5db" stroke-width="1.5"/></svg>',
)}`;

const DISGUISE_THEME_COLOR = '#6b7280';

interface DisguiseSnapshot {
  title: string;
  favicon: string;
  themeColor: string;
}

let disguiseSnapshot: DisguiseSnapshot | null = null;
let disguiseActive = false;

export function isPureModeDisguiseActive(): boolean {
  return disguiseActive;
}

function pickDisguiseTitle(): string {
  const index = Math.floor(Math.random() * DISGUISE_TITLES.length);
  return DISGUISE_TITLES[index] ?? DISGUISE_TITLES[0];
}

function getFaviconLink(): HTMLLinkElement | null {
  return document.head.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
}

function getThemeColorMeta(): HTMLMetaElement | null {
  return document.head.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
}

export function readRoomPureMode(): boolean {
  try {
    if (localStorage.getItem(PURE_MODE_KEY) === '1') return true;
    if (localStorage.getItem(LEGACY_FOCUS_MODE_KEY) === '1') {
      localStorage.setItem(PURE_MODE_KEY, '1');
      localStorage.removeItem(LEGACY_FOCUS_MODE_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function writeRoomPureMode(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(PURE_MODE_KEY, '1');
    } else {
      localStorage.removeItem(PURE_MODE_KEY);
      localStorage.removeItem(LEGACY_FOCUS_MODE_KEY);
    }
  } catch {
    // localStorage may be unavailable.
  }
}

/** 仅伪装浏览器标签页图标与标题，不改动页面 UI */
export function applyPureModeDisguise(): void {
  if (typeof document === 'undefined') return;

  if (!disguiseSnapshot) {
    const favicon = getFaviconLink();
    const themeMeta = getThemeColorMeta();
    disguiseSnapshot = {
      title: document.title,
      favicon: favicon?.href || '/favicon.svg',
      themeColor: themeMeta?.content || '#ec4141',
    };
  }

  document.title = pickDisguiseTitle();

  const favicon = getFaviconLink();
  if (favicon) favicon.href = DISGUISE_FAVICON;

  const themeMeta = getThemeColorMeta();
  if (themeMeta) themeMeta.content = DISGUISE_THEME_COLOR;

  disguiseActive = true;
}

export function clearPureModeDisguise(restoreTitle?: string): void {
  if (typeof document === 'undefined' || !disguiseSnapshot) {
    disguiseActive = false;
    return;
  }

  document.title = restoreTitle ?? disguiseSnapshot.title;

  const favicon = getFaviconLink();
  if (favicon) favicon.href = disguiseSnapshot.favicon;

  const themeMeta = getThemeColorMeta();
  if (themeMeta) themeMeta.content = disguiseSnapshot.themeColor;

  disguiseSnapshot = null;
  disguiseActive = false;
}
