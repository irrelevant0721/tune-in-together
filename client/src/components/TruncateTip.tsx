import { createElement, useEffect, useRef, useState, type ElementType } from 'react';
import Tooltip, { type TooltipSide } from './Tooltip';

interface Props {
  text: string;
  className?: string;
  as?: ElementType;
  side?: TooltipSide;
}

export default function TruncateTip({
  text,
  className,
  as: Tag = 'span',
  side = 'bottom',
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setTruncated(el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, className]);

  return (
    <Tooltip content={text} side={side} disabled={!truncated} tapToShow>
      {createElement(Tag, { ref, className }, text)}
    </Tooltip>
  );
}
