import { useRef, useEffect, type MouseEventHandler, type ReactNode } from 'react';

export interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}

/** React Bits SpotlightCard — RAF 平滑跟随的聚光卡片。 */
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(255, 77, 85, 0.18)',
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const posRef = useRef({ x: 0, y: 0, opacity: 0 });

  const paint = () => {
    const spot = spotRef.current;
    const border = borderRef.current;
    if (!spot) return;
    const { x, y, opacity } = posRef.current;
    spot.style.opacity = String(opacity);
    spot.style.background = `radial-gradient(520px circle at ${x}px ${y}px, ${spotlightColor}, transparent 55%)`;
    if (border) {
      border.style.opacity = String(opacity * 0.9);
      border.style.background = `radial-gradient(420px circle at ${x}px ${y}px, rgba(255,255,255,0.55), transparent 55%) border-box`;
    }
  };

  const handleMouseMove: MouseEventHandler<HTMLDivElement> = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    posRef.current.x = e.clientX - rect.left;
    posRef.current.y = e.clientY - rect.top;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(paint);
  };

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => {
        posRef.current.opacity = 1;
        paint();
      }}
      onMouseLeave={() => {
        posRef.current.opacity = 0;
        paint();
      }}
      className={`relative border border-white/10 ${className}`.trim()}
    >
      <div
        ref={spotRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-[inherit] transition-opacity duration-500 ease-out"
        style={{ opacity: 0 }}
      />
      {/* 边框跟随高光：1px border + mask，避免 padding 圆角厚薄不均 */}
      <div
        ref={borderRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] transition-opacity duration-500 ease-out"
        style={{
          opacity: 0,
          boxSizing: 'border-box',
          border: '1px solid transparent',
          background:
            'radial-gradient(420px circle at 50% 50%, rgba(255,255,255,0.55), transparent 55%) border-box',
          WebkitMask:
            'linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)',
          maskComposite: 'exclude',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
      <div className="relative z-[2]">{children}</div>
    </div>
  );
}
