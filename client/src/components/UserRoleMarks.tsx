import type { RoomMemberTier } from '../types';
import MemberTierBadge from './MemberTierBadge';
import RoleBadge from './RoleBadge';

interface Props {
  isOwner?: boolean;
  isAdmin?: boolean;
  memberTier?: Pick<RoomMemberTier, 'badgeLabel' | 'badgeColor'> | null;
  className?: string;
  badgeClassName?: string;
}

/** 有贵宾标时优先展示贵宾，房主/管理仅保留皇冠/盾牌图标；无贵宾时展示完整角色角标 */
export default function UserRoleMarks({
  isOwner = false,
  isAdmin = false,
  memberTier,
  className = '',
  badgeClassName = '',
}: Props) {
  if (memberTier) {
    return (
      <span className={`inline-flex flex-shrink-0 items-center gap-1 ${className}`}>
        <MemberTierBadge tier={memberTier} className={badgeClassName} />
        {isOwner && <RoleBadge role="owner" variant="icon" />}
        {!isOwner && isAdmin && <RoleBadge role="admin" variant="icon" />}
      </span>
    );
  }

  if (isOwner) return <RoleBadge role="owner" className={`${badgeClassName} ${className}`.trim()} />;
  if (isAdmin) return <RoleBadge role="admin" className={`${badgeClassName} ${className}`.trim()} />;
  return null;
}
