// Only the authenticated companion bridge can allocate these requester IDs.
export const COMPANION_PREFIX = 'wx_companion_';
export const isCompanionSong = (song) => String(song?.requestedById || '').startsWith(COMPANION_PREFIX);

export function keepCompanionAtTail(queue) {
  if (!queue.some(isCompanionSong)) return;
  const human = queue.filter((song) => !isCompanionSong(song));
  const companion = queue.filter(isCompanionSong).slice(0, 1);
  queue.splice(0, queue.length, ...human, ...companion);
  if (queue.some((song) => Number.isFinite(song.manualOrder))) {
    queue.forEach((song, index) => { song.manualOrder = index; });
  }
}
