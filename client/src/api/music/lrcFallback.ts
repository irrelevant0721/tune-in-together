const LRC_LINE_RE = /\[\d{2}:\d{2}/;

export function hasValidLrc(text: string): boolean {
  const trimmed = text?.trim() || '';
  if (!trimmed) return false;
  if (/暂无歌词|无歌词|not found|404/i.test(trimmed)) return false;
  return LRC_LINE_RE.test(trimmed);
}
