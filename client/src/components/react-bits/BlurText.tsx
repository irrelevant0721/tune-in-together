import { useEffect, useMemo, useState, type CSSProperties } from 'react';

export interface BlurTextProps {
  text: string;
  className?: string;
  /** 每个字符/词的延迟（ms） */
  delay?: number;
  animateBy?: 'chars' | 'words';
  direction?: 'top' | 'bottom';
  /** 整体开场延迟（ms） */
  startDelay?: number;
  /** 附加到每个字符的 class（如 hover 抬升） */
  charClassName?: string;
}

/**
 * React Bits BlurText — 模糊→清晰的交错入场。
 * 仅播一次；尊重 prefers-reduced-motion。
 */
export default function BlurText({
  text,
  className = '',
  delay = 48,
  animateBy = 'chars',
  direction = 'top',
  startDelay = 0,
  charClassName = '',
}: BlurTextProps) {
  const [ready, setReady] = useState(false);
  const [reduce, setReduce] = useState(false);

  const segments = useMemo(
    () => (animateBy === 'words' ? text.split(/(\s+)/) : text.split('')),
    [animateBy, text],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    if (mq.matches) {
      setReady(true);
      return;
    }
    const id = window.setTimeout(() => setReady(true), Math.max(0, startDelay));
    return () => window.clearTimeout(id);
  }, [startDelay]);

  const fromY = direction === 'top' ? '14px' : '-14px';

  return (
    <span className={`inline ${className}`.trim()} aria-label={text}>
      {segments.map((seg, i) => {
        const isSpace = /^\s+$/.test(seg);
        if (isSpace) {
          return <span key={`s-${i}`}>{seg}</span>;
        }
        const style: CSSProperties | undefined = reduce
          ? undefined
          : {
              ['--rb-blur-from-y' as string]: fromY,
              transitionDelay: ready ? `${i * delay}ms` : '0ms',
            };

        return (
          <span
            key={`${seg}-${i}`}
            aria-hidden
            className={`rb-blur-char inline-block will-change-[transform,filter,opacity] ${
              ready ? 'rb-blur-char--in' : 'rb-blur-char--out'
            } ${charClassName}`.trim()}
            style={style}
          >
            {seg}
          </span>
        );
      })}
    </span>
  );
}
