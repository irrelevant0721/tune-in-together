export const MUSIC_SOURCE_IDS = ['netease', 'tencent', 'kugou', 'qishui'];

export const DEFAULT_MUSIC_SOURCES_ENABLED = {
  netease: true,
  tencent: true,
  kugou: true,
  qishui: true,
};

export function normalizeMusicSourcesEnabled(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(MUSIC_SOURCE_IDS.map((source) => [
    source,
    input[source] === undefined ? DEFAULT_MUSIC_SOURCES_ENABLED[source] : Boolean(input[source]),
  ]));
}

export function isMusicSourceEnabled(source, enabled = DEFAULT_MUSIC_SOURCES_ENABLED) {
  const key = String(source || '').trim().toLowerCase();
  return MUSIC_SOURCE_IDS.includes(key) && normalizeMusicSourcesEnabled(enabled)[key] === true;
}