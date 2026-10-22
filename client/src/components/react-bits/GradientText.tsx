import type { CSSProperties, ReactNode } from 'react';

export interface GradientTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
  direction?: 'horizontal' | 'vertical' | 'diagonal';
}

/** React Bits GradientText — ease 往返流光，更柔。 */
export default function GradientText({
  children,
  className = '',
  colors = ['#ff4d55', '#fb7185', '#e17ce8', '#ff4d55'],
  animationSpeed = 9,
  showBorder = false,
  direction = 'horizontal',
}: GradientTextProps) {
  const gradientAngle =
    direction === 'horizontal' ? 'to right' : direction === 'vertical' ? 'to bottom' : '135deg';
  const gradientColors = [...colors, colors[0]].join(', ');

  const gradientStyle: CSSProperties = {
    backgroundImage: `linear-gradient(${gradientAngle}, ${gradientColors})`,
    backgroundSize:
      direction === 'horizontal' ? '280% 100%' : direction === 'vertical' ? '100% 280%' : '280% 280%',
    animationDuration: `${animationSpeed}s`,
  };

  return (
    <span
      className={`relative inline-flex max-w-fit items-center justify-center overflow-hidden ${showBorder ? 'rounded-[1.25rem] px-2 py-1' : ''} ${className}`.trim()}
    >
      {showBorder && (
        <span
          aria-hidden
          className="rb-gradient-text-flow pointer-events-none absolute inset-0 rounded-[1.25rem] opacity-40"
          style={gradientStyle}
        />
      )}
      <span
        className="rb-gradient-text-flow relative z-[1] inline-block bg-clip-text text-transparent"
        style={{
          ...gradientStyle,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {children}
      </span>
    </span>
  );
}
