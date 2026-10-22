import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { useRoomStore } from '../stores/roomStore';
import { useSocket } from '../hooks/useSocket';
import {
  nextPlayMode,
  normalizePlayMode,
  PLAY_MODE_META,
  PLAY_MODE_ORDER,
  resolvePlayModeSelection,
  shouldOpenPlayModeMenu,
  type PlayMode,
} from '../lib/playMode';
import { isMobileDevice } from '../lib/audioUnlock';
import Tooltip from './Tooltip';

interface Props {
  className?: string;
  iconClassName?: string;
}

type MenuPosition = { left: number; top: number };

const PLAY_MODE_MENU_WIDTH = 240;
const PLAY_MODE_MENU_HEIGHT = 320;
const PLAY_MODE_MENU_GAP = 8;
const MOBILE_DOUBLE_CLICK_DELAY = 280;

function clampMenuPosition(left: number, top: number): MenuPosition {
  const maxLeft = Math.max(PLAY_MODE_MENU_GAP, window.innerWidth - PLAY_MODE_MENU_WIDTH - PLAY_MODE_MENU_GAP);
  const maxTop = Math.max(PLAY_MODE_MENU_GAP, window.innerHeight - PLAY_MODE_MENU_HEIGHT - PLAY_MODE_MENU_GAP);
  return {
    left: Math.min(Math.max(left, PLAY_MODE_MENU_GAP), maxLeft),
    top: Math.min(Math.max(top, PLAY_MODE_MENU_GAP), maxTop),
  };
}

function getMenuPositionAtPoint(x: number, y: number): MenuPosition {
  const top = y + PLAY_MODE_MENU_HEIGHT + PLAY_MODE_MENU_GAP > window.innerHeight - PLAY_MODE_MENU_GAP
    ? y - PLAY_MODE_MENU_HEIGHT - PLAY_MODE_MENU_GAP
    : y + PLAY_MODE_MENU_GAP;
  return clampMenuPosition(x, top);
}

function getMenuPositionForButton(button: HTMLButtonElement): MenuPosition {
  const rect = button.getBoundingClientRect();
  const left = rect.left + rect.width / 2 - PLAY_MODE_MENU_WIDTH / 2;
  const below = rect.bottom + PLAY_MODE_MENU_GAP;
  const above = rect.top - PLAY_MODE_MENU_HEIGHT - PLAY_MODE_MENU_GAP;
  const top = below + PLAY_MODE_MENU_HEIGHT <= window.innerHeight - PLAY_MODE_MENU_GAP
    ? below
    : above;
  return clampMenuPosition(left, top);
}

function showPlayModeToast(message: string, type: 'success' | 'error'): void {
  window.dispatchEvent(new CustomEvent('openmusic:visual-toast', {
    detail: { message, type },
  }));
}

export default function PlayModeButton({
  className = '',
  iconClassName = 'h-4 w-4',
}: Props) {
  const playMode = useRoomStore((s) => normalizePlayMode(s.room?.playMode));
  const canControl = useRoomStore((s) => s.canControlPlayback);
  const { setRoomPlayMode } = useSocket();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingClickRef = useRef<number | null>(null);
  const isMobile = isMobileDevice();
  const meta = PLAY_MODE_META[playMode];
  const nextMode = nextPlayMode(playMode);
  const nextMeta = PLAY_MODE_META[nextMode];
  const Icon = meta.Icon;

  const clearPendingClick = useCallback(() => {
    if (pendingClickRef.current === null) return;
    window.clearTimeout(pendingClickRef.current);
    pendingClickRef.current = null;
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuPosition(null);
  }, []);

  const openMenuAtPoint = useCallback((x: number, y: number) => {
    if (busy) return;
    setMenuPosition(getMenuPositionAtPoint(x, y));
    setMenuOpen(true);
  }, [busy]);

  const openMenuForButton = useCallback(() => {
    if (busy || !buttonRef.current) return;
    setMenuPosition(getMenuPositionForButton(buttonRef.current));
    setMenuOpen(true);
  }, [busy]);

  const selectPlayMode = useCallback(async (value: unknown) => {
    const mode = resolvePlayModeSelection(value);
    if (!mode || !canControl || busy) return;

    setMenuOpen(false);
    setMenuPosition(null);
    setBusy(true);
    try {
      const res = await setRoomPlayMode(mode);
      if (!res.success) {
        showPlayModeToast(res.error || '切换失败', 'error');
      } else {
        showPlayModeToast(PLAY_MODE_META[mode].label, 'success');
      }
    } catch {
      showPlayModeToast('切换失败，请稍后重试', 'error');
    } finally {
      setBusy(false);
    }
  }, [busy, canControl, setRoomPlayMode]);

  const handleCycle = useCallback(() => {
    void selectPlayMode(nextMode);
  }, [nextMode, selectPlayMode]);

  const handleClick = useCallback(() => {
    if (!isMobile) {
      handleCycle();
      return;
    }

    if (pendingClickRef.current !== null) {
      clearPendingClick();
      openMenuForButton();
      return;
    }

    pendingClickRef.current = window.setTimeout(() => {
      pendingClickRef.current = null;
      handleCycle();
    }, MOBILE_DOUBLE_CLICK_DELAY);
  }, [clearPendingClick, handleCycle, isMobile, openMenuForButton]);

  const handleContextMenu = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!shouldOpenPlayModeMenu('contextmenu', isMobile)) return;
    openMenuAtPoint(event.clientX, event.clientY);
  }, [isMobile, openMenuAtPoint]);

  const handleDoubleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (!shouldOpenPlayModeMenu('doubleclick', isMobile)) return;
    event.preventDefault();
    clearPendingClick();
    openMenuForButton();
  }, [clearPendingClick, isMobile, openMenuForButton]);

  useEffect(() => () => clearPendingClick(), [clearPendingClick]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      closeMenu();
    };
    const onViewportChange = () => closeMenu();

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [closeMenu, menuOpen]);

  const tip = canControl
    ? `当前：${meta.label}，点击切换为${nextMeta.label}；${isMobile ? '双击展开选项' : '右键展开选项'}`
    : `当前：${meta.label}（仅房主或管理员可切换）`;

  return (
    <>
      <Tooltip content={tip} tapToShow={!canControl}>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onDoubleClick={handleDoubleClick}
          disabled={busy}
          className={`inline-flex min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-[color,background-color,opacity,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-netease-red/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-wait disabled:opacity-50 ${
            !canControl ? 'cursor-not-allowed opacity-50' : 'active:scale-95'
          } ${
            playMode === 'order'
              ? 'text-netease-muted hover:bg-white/10 hover:text-white'
              : 'text-netease-red hover:bg-netease-red/15'
          } ${className}`}
          aria-label={tip}
          aria-disabled={!canControl || busy}
          aria-busy={busy}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          data-play-mode={playMode}
        >
          <Icon className={iconClassName} />
        </button>
      </Tooltip>

      {menuOpen && menuPosition && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="播放顺序选项"
          tabIndex={-1}
          className="fixed z-[230] max-h-[calc(100vh-16px)] w-[240px] max-w-[calc(100vw-16px)] overflow-y-auto rounded-xl border border-white/10 bg-[#17191f]/[.98] p-1.5 text-white shadow-2xl shadow-black/40 backdrop-blur-xl animate-fade-in"
          style={{ left: menuPosition.left, top: menuPosition.top }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="border-b border-white/10 px-2.5 pb-2 pt-1">
            <p className="text-[13px] font-medium text-white/95">播放顺序</p>
            <p className="mt-0.5 text-[11px] text-white/45">
              {canControl ? `当前：${meta.label}` : '仅房主或管理员可切换'}
            </p>
          </div>
          <div className="mt-1 space-y-0.5">
            {PLAY_MODE_ORDER.map((mode: PlayMode) => {
              const option = PLAY_MODE_META[mode];
              const OptionIcon = option.Icon;
              const active = mode === playMode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  disabled={!canControl || busy}
                  className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                    active
                      ? 'bg-netease-red/15 text-white'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => void selectPlayMode(mode)}
                >
                  <OptionIcon className={`h-4 w-4 shrink-0 ${active ? 'text-netease-red' : 'text-white/50'}`} />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {active && <Check className="h-4 w-4 shrink-0 text-netease-red" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
