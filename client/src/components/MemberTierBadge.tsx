import type { RoomMemberTier } from '../types';
import { getMemberBadgeStyle, normalizeBadgeColor } from '../lib/memberTierPresets';
import { usePureModeStore } from '../stores/pureModeStore';

interface Props {
  tier: Pick<RoomMemberTier, 'badgeLabel' | 'badgeColor'>;
  className?: string;
}

export default function MemberTierBadge({ tier, className = '' }: Props) {
  const plain = usePureModeStore((s) => s.enabled);
  const color = normalizeBadgeColor(tier.badgeColor);
  const label = tier.badgeLabel.trim() || '贵宾';

  if (plain) {
    return (
      <span className={`inline-flex flex-shrink-0 text-[10px] leading-4 text-netease-muted/65 ${className}`}>
        {label}
      </span>
    );
  }

  return (
    <span
      className={`member-badge-shine inline-flex flex-shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-4 tracking-wide antialiased ${className}`}
      style={getMemberBadgeStyle(color)}
    >
      <span className="relative z-[2]">{label}</span>
    </span>
  );
}
