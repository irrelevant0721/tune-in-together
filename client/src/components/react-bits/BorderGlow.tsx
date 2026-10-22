import {
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEventHandler,
  type ReactNode,
} from 'react';

export interface BorderGlowProps {
  children: ReactNode;
  className?: string;
  /** 主光色 */
  color?: string;
  /** 辅光色 */
  colorSecondary?: string;
  /** 旋转一圈秒数 */
  duration?: number;
  /** 外发光峰值强度 0–1 */
  bloom?: number;
  borderRadius?: string;
  /**
   * 仅当鼠标靠近边缘时才显示描边/外发光。
   * 默认开启（适合房间卡片）。
   */
  edgeProximity?: boolean;
  /** 边缘感应宽度（px） */
  edgeZone?: number;
  disabled?: boolean;
}

/**
 * Border Glow — 柔和旋转描边 + 外发光。
 * edgeProximity：外发光只在鼠标快到边上时出现。
 */
export default function BorderGlow({
  children,
  className = '',
  color = '#ff4d55',
  colorSecondary = '#c084fc',
  duration = 7,
  bloom = 0.55,
  borderRadius,
  edgeProximity = true,
  edgeZone = 52,
  disabled = false,
}: BorderGlowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const strengthRef = useRef(0);

  const paint = (strength: number, xPct: number, yPct: number) => {
    const el = rootRef.current;
    if (!el) return;
    strengthRef.current = strength;
    el.style.setProperty('--bg-glow-strength', String(strength));
    el.style.setProperty('--bg-glow-x', `${xPct}%`);
    el.style.setProperty('--bg-glow-y', `${yPct}%`);
  };

  const handleMove: MouseEventHandler<HTMLDivElement> = (e) => {
    if (disabled || !edgeProximity || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dist = Math.min(x, y, rect.width - x, rect.height - y);
    const raw = dist <= edgeZone ? 1 - dist / edgeZone : 0;
    // ease-out 让边缘更亮
    const strength = raw * raw;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      paint(strength, (x / rect.width) * 100, (y / rect.height) * 100);
    });
  };

  const handleLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    paint(0, 50, 50);
  };

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (disabled) paint(0, 50, 50);
  }, [disabled]);

  const style = {
    ['--bg-glow-a' as string]: color,
    ['--bg-glow-b' as string]: colorSecondary,
    ['--bg-glow-duration' as string]: `${duration}s`,
    ['--bg-glow-bloom' as string]: String(bloom),
    ['--bg-glow-strength' as string]: edgeProximity ? '0' : '1',
    ['--bg-glow-x' as string]: '50%',
    ['--bg-glow-y' as string]: '50%',
    ...(borderRadius ? { borderRadius } : null),
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={`rb-border-glow ${edgeProximity ? 'rb-border-glow--edge' : ''} ${className}`.trim()}
      style={style}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div aria-hidden className="rb-border-glow__ring" />
      <div aria-hidden className="rb-border-glow__bloom" />
      <div className="rb-border-glow__inner relative z-[1] h-full w-full rounded-[inherit]">
        {children}
      </div>
    </div>
  );
}
