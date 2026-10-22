import type { CSSProperties } from 'react';

export interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  /** 完整周期秒数（含停顿），默认 5.5 */
  speed?: number;
  className?: string;
  color?: string;
  shineColor?: string;
  spread?: number;
}

/** React Bits ShinyText — 间歇扫光（有停顿，更高级，避免廉价常驻闪）。 */
export default function ShinyText({
  text,
  disabled = false,
  speed = 5.5,
  className = '',
  color = 'rgba(255,255,255,0.62)',
  shineColor = '#ffffff',
  spread = 110,
}: ShinyTextProps) {
  const style: CSSProperties = {
    backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 46%, ${shineColor} 50%, ${color} 54%, ${color} 100%)`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animationDuration: `${speed}s`,
  };

  return (
    <span
      className={`inline-block ${disabled ? '' : 'rb-shiny-text'} ${className}`.trim()}
      style={disabled ? { color } : style}
    >
      {text}
    </span>
  );
}
