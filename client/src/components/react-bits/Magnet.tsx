import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEventHandler,
  type ReactNode,
} from 'react';

export interface MagnetProps {
  children: ReactNode;
  className?: string;
  /** 磁吸强度，0–1，默认 0.35 */
  strength?: number;
  /** 最大位移 px */
  maxOffset?: number;
  disabled?: boolean;
}

/** React Bits Magnet — 指针靠近时按钮被轻柔吸过去。 */
export default function Magnet({
  children,
  className = '',
  strength = 0.32,
  maxOffset = 10,
  disabled = false,
}: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const reduceRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    reduceRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    el.style.setProperty('--mx', '0px');
    el.style.setProperty('--my', '0px');
  }, []);

  const onMove: MouseEventHandler<HTMLDivElement> = (e) => {
    if (disabled || reduceRef.current) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const tx = Math.max(-maxOffset, Math.min(maxOffset, dx * strength));
    const ty = Math.max(-maxOffset, Math.min(maxOffset, dy * strength));
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.setProperty('--mx', `${tx.toFixed(2)}px`);
      el.style.setProperty('--my', `${ty.toFixed(2)}px`);
    });
  };

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const style: CSSProperties | undefined = disabled
    ? undefined
    : {
        transform: 'translate3d(var(--mx, 0px), var(--my, 0px), 0)',
        transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
      };

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={reset}
    >
      {children}
    </div>
  );
}
