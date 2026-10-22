export const MIGRATED_FAVORITE_RETENTION_SEC = 30 * 24 * 60 * 60;

export async function expireMigratedFavoriteSource(
  redis,
  keys,
  ttlSec = MIGRATED_FAVORITE_RETENTION_SEC,
) {
  if (!redis?.expire || !Array.isArray(keys)) return false;
  const normalizedKeys = keys.map((key) => String(key || '').trim()).filter(Boolean);
  if (normalizedKeys.length === 0) return false;
  await Promise.all(normalizedKeys.map((key) => redis.expire(key, ttlSec)));
  return true;
}
