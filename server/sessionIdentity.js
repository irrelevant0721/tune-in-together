export function shouldRefreshRoomIdentity(currentIdentity, roomUserId) {
  return currentIdentity?.userId !== roomUserId;
}

export function shouldIssueGuestHandoff(
  currentIdentity,
  roomUserId,
  hasPreviousAccountSession = false,
  sourceIdentityHasAccountOwner = false,
) {
  if (!currentIdentity?.userId || !roomUserId) return false;
  if (currentIdentity.userId === roomUserId) return true;
  return !hasPreviousAccountSession && !sourceIdentityHasAccountOwner;
}

export function shouldMigrateFavorites(
  currentIdentity,
  roomUserId,
  hasPreviousAccountSession = false,
  sourceIdentityHasAccountOwner = false,
) {
  return Boolean(
    !hasPreviousAccountSession
    && !sourceIdentityHasAccountOwner
    && currentIdentity?.userId
    && roomUserId
    && currentIdentity.userId !== roomUserId,
  );
}
