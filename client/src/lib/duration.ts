/**
 * 统一歌曲时长单位为毫秒。
 * 部分 Meting/汽水接口返回秒，旧房间和其它音源则返回毫秒。
 */
export function normalizeDurationMs(value: unknown): number | undefined {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0) return undefined;
  return Math.round(duration < 10_000 ? duration * 1000 : duration);
}
