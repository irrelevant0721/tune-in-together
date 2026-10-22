import type { ReactNode } from 'react';
import type { RoomMemberTier } from '../types';
import { getMemberFrameStyle } from '../lib/memberTierPresets';

interface Props {
  tier: Pick<RoomMemberTier, 'borderColor'>;
  /** queue：播放队列细边框；preview：弹窗预览加粗效果 */
  variant?: 'queue' | 'preview';
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}

export default function MemberQueueFrame({
  tier,
  variant = 'queue',
  className = '',
  innerClassName = '',
  children,
}: Props) {
  const variantClass = variant === 'preview' ? 'member-frame-preview' : 'member-queue-compact';

  return (
    <div
      className={`member-queue-shell ${variantClass} ${className}`}
      style={getMemberFrameStyle(tier.borderColor)}
    >
      <div className={`member-queue-inner ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
}
