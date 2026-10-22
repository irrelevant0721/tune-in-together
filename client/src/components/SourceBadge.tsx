import type { MusicSource } from '../types';
import { SOURCE_COLORS, getSourceShortLabel } from '../lib/sourceLabels';

interface Props {
  source?: MusicSource;
  className?: string;
  /** colored：红/绿品牌色；muted：列表用灰色标签 */
  variant?: 'colored' | 'muted';
}

export default function SourceBadge({ source = 'netease', className = '', variant = 'colored' }: Props) {
  const isMuted = variant === 'muted';

  return (
    <span
      className={`inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full border px-1.5 text-[10px] font-semibold tracking-wide flex-shrink-0 ${
        isMuted
          ? 'border-white/8 bg-white/[0.04] text-netease-muted'
          : 'border-white/10 text-white shadow-sm shadow-black/20'
      } ${className}`}
      style={isMuted ? undefined : { backgroundColor: SOURCE_COLORS[source] || SOURCE_COLORS.netease }}
    >
      {getSourceShortLabel(source)}
    </span>
  );
}
