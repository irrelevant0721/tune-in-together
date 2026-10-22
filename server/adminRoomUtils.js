function resolveAdminOwnerLastJoinedAt(room) {
  const ownerId = room?.ownerId || room?.creatorId;
  if (!ownerId) return null;

  const recorded = Number(room?.ownerLastJoinedAtByUserId?.get?.(ownerId)) || 0;
  if (recorded > 0) return recorded;

  const online = room?.users?.get?.(ownerId);
  const joinedAt = Number(online?.joinedAt) || 0;
  return joinedAt > 0 ? joinedAt : null;
}

export { resolveAdminOwnerLastJoinedAt };
