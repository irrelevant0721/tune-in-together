import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content?: ReactNode;
  side?: TooltipSide;
  delay?: number;
  disabled?: boolean;
  /** 触屏设备点击切换显示（用于截断文本等） */
  tapToShow?: boolean;
  children: ReactElement;
}

function mergeRefs<T>(...refs: Array<((node: T | null) => void) | React.MutableRefObject<T | null> | null | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(node);
      else ref.current = node;
    }
  };
}

function hasTooltipContent(content: ReactNode): boolean {
  if (content == null || content === false) return false;
  if (typeof content === 'string') return content.trim().length > 0;
  return true;
}

function getTooltipStyle(rect: DOMRect, side: TooltipSide): CSSProperties {
  const gap = 8;
  switch (side) {
    case 'top':
      return {
        position: 'fixed',
        top: rect.top - gap,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, -100%)',
      };
    case 'bottom':
      return {
        position: 'fixed',
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, 0)',
      };
    case 'left':
      return {
        position: 'fixed',
        top: rect.top + rect.height / 2,
        left: rect.left - gap,
        transform: 'translate(-100%, -50%)',
      };
    case 'right':
      return {
        position: 'fixed',
        top: rect.top + rect.height / 2,
        left: rect.right + gap,
        transform: 'translate(0, -50%)',
      };
    default:
      return { position: 'fixed', top: rect.top, left: rect.left };
  }
}

const VIEWPORT_PAD = 12;
const TOOLTIP_GAP = 8;

function clampTooltipPosition(
  anchor: DOMRect,
  side: TooltipSide,
  tipWidth: number,
  tipHeight: number,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampH = (left: number) => Math.min(Math.max(left, VIEWPORT_PAD), vw - tipWidth - VIEWPORT_PAD);
  const clampV = (top: number) => Math.min(Math.max(top, VIEWPORT_PAD), vh - tipHeight - VIEWPORT_PAD);
  const anchorCx = anchor.left + anchor.width / 2;
  const anchorCy = anchor.top + anchor.height / 2;

  switch (side) {
    case 'top': {
      let top = anchor.top - TOOLTIP_GAP - tipHeight;
      const left = anchorCx - tipWidth / 2;
      if (top < VIEWPORT_PAD) top = anchor.bottom + TOOLTIP_GAP;
      return { top: clampV(top), left: clampH(left) };
    }
    case 'bottom': {
      let top = anchor.bottom + TOOLTIP_GAP;
      const left = anchorCx - tipWidth / 2;
      if (top + tipHeight > vh - VIEWPORT_PAD) top = anchor.top - TOOLTIP_GAP - tipHeight;
      return { top: clampV(top), left: clampH(left) };
    }
    case 'left': {
      let left = anchor.left - TOOLTIP_GAP - tipWidth;
      const top = anchorCy - tipHeight / 2;
      if (left < VIEWPORT_PAD) left = anchor.right + TOOLTIP_GAP;
      return { top: clampV(top), left: clampH(left) };
    }
    case 'right': {
      let left = anchor.right + TOOLTIP_GAP;
      const top = anchorCy - tipHeight / 2;
      if (left + tipWidth > vw - VIEWPORT_PAD) left = anchor.left - TOOLTIP_GAP - tipWidth;
      return { top: clampV(top), left: clampH(left) };
    }
    default:
      return { top: anchor.top, left: anchor.left };
  }
}

function getClampedTooltipStyle(
  anchorRect: DOMRect,
  tipWidth: number,
  tipHeight: number,
  side: TooltipSide,
): CSSProperties {
  const pos = clampTooltipPosition(anchorRect, side, tipWidth, tipHeight);
  return {
    position: 'fixed',
    top: pos.top,
    left: pos.left,
  };
}

function getPrefersHover(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function usePrefersHover() {
  const [prefersHover, setPrefersHover] = useState(getPrefersHover);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setPrefersHover(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return prefersHover;
}

export default function Tooltip({
  content,
  side = 'top',
  delay = 320,
  disabled = false,
  tapToShow = false,
  children,
}: TooltipProps) {
  const tipId = useId();
  const anchorRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', top: 0, left: 0 });
  const prefersHover = usePrefersHover();

  const enabled = !disabled && hasTooltipContent(content);

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const anchorRect = el.getBoundingClientRect();
    const tipEl = tipRef.current;
    if (tipEl) {
      const tipRect = tipEl.getBoundingClientRect();
      setStyle(getClampedTooltipStyle(anchorRect, tipRect.width, tipRect.height, side));
      return;
    }
    setStyle(getTooltipStyle(anchorRect, side));
  }, [side]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, content, updatePosition]);

  const show = useCallback((immediate = false) => {
    if (!enabled) return;
    clearTimeout(timerRef.current);
    if (immediate) {
      updatePosition();
      setOpen(true);
      return;
    }
    timerRef.current = setTimeout(() => {
      updatePosition();
      setOpen(true);
    }, delay);
  }, [delay, enabled, updatePosition]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setOpen(false);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (!open) return;
    const handle = () => updatePosition();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const dismiss = (event: Event) => {
      const anchor = anchorRef.current;
      if (anchor && event.target instanceof Node && anchor.contains(event.target)) return;
      hide();
    };

    const dismissOnScroll = () => hide();

    document.addEventListener('touchstart', dismiss, { passive: true, capture: true });
    document.addEventListener('pointerdown', dismiss, { capture: true });
    document.addEventListener('scroll', dismissOnScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('touchstart', dismiss, true);
      document.removeEventListener('pointerdown', dismiss, true);
      document.removeEventListener('scroll', dismissOnScroll, true);
    };
  }, [open, hide]);

  if (!isValidElement(children)) return children;

  const child = children as ReactElement<Record<string, unknown>>;
  const childRef = (child as { ref?: React.Ref<HTMLElement> }).ref;

  const wrapped = cloneElement(child, {
    ref: mergeRefs<HTMLElement>((node) => { anchorRef.current = node; }, childRef),
    onMouseEnter: (event: MouseEvent<HTMLElement>) => {
      (child.props.onMouseEnter as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(event);
      if (prefersHover) show();
    },
    onMouseLeave: (event: MouseEvent<HTMLElement>) => {
      (child.props.onMouseLeave as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(event);
      if (prefersHover) hide();
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      (child.props.onFocus as ((e: FocusEvent<HTMLElement>) => void) | undefined)?.(event);
      if (event.target instanceof HTMLElement && event.target.matches(':focus-visible')) {
        show();
      }
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      (child.props.onBlur as ((e: FocusEvent<HTMLElement>) => void) | undefined)?.(event);
      hide();
    },
    onClick: (event: MouseEvent<HTMLElement>) => {
      (child.props.onClick as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(event);
      if (tapToShow && !prefersHover && enabled) {
        if (open) hide();
        else show(true);
      }
    },
    'aria-describedby': open && enabled ? tipId : undefined,
    title: undefined,
  });

  return (
    <>
      {wrapped}
      {open && enabled && createPortal(
        <div
          ref={tipRef}
          id={tipId}
          role="tooltip"
          style={style}
          className="pointer-events-none z-[220] max-w-[min(280px,calc(100vw-24px))] animate-fade-in rounded-lg border border-white/10 bg-[#1a1a1a]/95 px-2.5 py-1.5 text-xs leading-snug text-white/90 shadow-xl backdrop-blur-md"
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
}
