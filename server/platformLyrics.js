import { createMetingResponseCache } from './metingCache.js';
import { incrementMetric } from './logger.js';

const cache = createMetingResponseCache({ ttlMs: 5 * 60_000, maxEntries: 512 });
const MAX_BYTES = 512 * 1024;
const TIME_TAG = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

function decodeEntities(text) {
  return text.replace(/&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi, (match, number, name) => {
    if (number) {
      const value = number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number);
      return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : match;
    }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[name.toLowerCase()];
  });
}

function timedLines(raw) {
  const text = decodeEntities(typeof raw === 'string' ? raw : '');
  const offset = Number(text.match(/^\s*\[offset\s*:\s*([+-]?\d+)\s*\]\s*$/im)?.[1] || 0);
  const shift = Number.isSafeInteger(offset) ? offset : 0;
  return text.split('\n').flatMap((line) => {
    const tags = [...line.matchAll(TIME_TAG)];
    if (!tags.length) return [];
    const last = tags[tags.length - 1];
    const content = line.slice(last.index + last[0].length).trim();
    return tags.filter((tag) => Number(tag[1]) < 90 && Number(tag[2]) < 60).map((tag) => ({
      time: Math.max(0, Number(tag[1]) * 60000 + Number(tag[2]) * 1000
        + Number((tag[3] || '').padEnd(3, '0')) - shift),
      text: content,
    }));
  }).sort((a, b) => a.time - b.time);
}

/** 独立处理两条时间轴的 offset；仅合并唯一的近时间戳译文，不按行号拼接。 */
export function combinePlatformLyrics(original, translation) {
  const lines = timedLines(original);
  if (!lines.some((line) => line.text)) return '';
  const translations = timedLines(translation).filter((line) => line.text);
  const paired = new Map();
  for (const translated of translations) {
    const matches = lines.map((line, index) => ({ index, distance: Math.abs(line.time - translated.time) }))
      .filter((match) => match.distance <= 80).sort((a, b) => a.distance - b.distance);
    if (!matches.length || (matches[1] && matches[0].distance === matches[1].distance)) continue;
    const index = matches[0].index;
    if (!lines[index].text) continue;
    const group = paired.get(index) || [];
    group.push(translated.text);
    paired.set(index, group);
  }
  return lines.map((line, index) => {
    const tag = `[${String(Math.floor(line.time / 60000)).padStart(2, '0')}:${((line.time % 60000) / 1000).toFixed(3).padStart(6, '0')}]`;
    const group = paired.get(index);
    const translated = group?.length === 1 && group[0] !== line.text ? group[0] : '';
    return `${tag}${line.text}${translated ? `\n${tag}${translated}` : ''}`;
  }).join('\n');
}

export function platformLyricsUrl(source, id) {
  if (source === 'netease' && /^\d{1,20}$/.test(id)) {
    return `https://music.163.com/api/song/lyric?${new URLSearchParams({ id, lv: '-1', kv: '-1', tv: '-1' })}`;
  }
  if (source === 'tencent' && /^[a-zA-Z0-9]{1,32}$/.test(id)) {
    const key = /^\d+$/.test(id) ? 'musicid' : 'songmid';
    return `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?${new URLSearchParams({ [key]: id, format: 'json', nobase64: '1', g_tk: '5381' })}`;
  }
  return '';
}

export async function fetchPlatformLyrics(source, id) {
  const url = platformLyricsUrl(source, id);
  if (!url) return '';
  try {
    return await cache.get(`${source}:${id}`, async () => {
      const response = await fetch(url, {
        redirect: 'error', signal: AbortSignal.timeout(4500),
        headers: { Referer: source === 'netease' ? 'https://music.163.com/' : 'https://y.qq.com/', 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      });
      if (!response.ok || Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Invalid lyric response');
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > MAX_BYTES) throw new Error('Lyric response too large');
          chunks.push(Buffer.from(value));
        }
      } finally {
        await reader.cancel();
        reader.releaseLock();
      }
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (source === 'netease' ? payload.code !== 200 : payload.code !== 0) throw new Error('Lyric unavailable');
      const lrc = source === 'netease'
        ? combinePlatformLyrics(payload.lrc?.lyric, payload.tlyric?.lyric)
        : combinePlatformLyrics(payload.lyric, payload.trans);
      if (!lrc) throw new Error('Empty lyric');
      incrementMetric(`platform_lyrics_${source}_success_total`);
      return lrc;
    });
  } catch {
    incrementMetric(`platform_lyrics_${source}_fallback_total`);
    return '';
  }
}
