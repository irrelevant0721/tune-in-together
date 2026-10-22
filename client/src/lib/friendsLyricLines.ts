import type { LyricLine } from '../types';

/** 部分平台把中文译文放在原文末尾括号内，保留嵌套括号并拆成上下两行。 */
export function withChineseTranslation(line: LyricLine): LyricLine {
  if (line.translation) return line;
  const text = line.text.trim();
  if (!/[)）]$/.test(text)) return line;
  let depth = 0;
  for (let i = text.length - 1; i >= 0; i--) {
    if (/[)）]/.test(text[i])) depth++;
    if (/[（(]/.test(text[i])) depth--;
    if (depth !== 0) continue;
    const original = text.slice(0, i).trim();
    const translation = text.slice(i + 1, -1).trim();
    if (original && /[a-zA-Z\u3040-\u30ff\uac00-\ud7af]/.test(original)
      && /\p{Script=Han}/u.test(translation) && !/[\u3040-\u30ff\uac00-\ud7af]/.test(translation)) {
      return { ...line, text: original, translation };
    }
    break;
  }
  return line;
}

const foreignText = /[a-zA-Z\u3040-\u30ff\uac00-\ud7af]/;
const isChinese = (text: string) => /\p{Script=Han}/u.test(text) && !/[\u3040-\u30ff\uac00-\ud7af]/.test(text);
const lyricKey = (text: string) => text.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export function needsChineseTranslation(lines: LyricLine[]): boolean {
  const foreign = lines.map(withChineseTranslation).filter((line) => foreignText.test(line.text) && !isChinese(line.text));
  return foreign.length >= Math.max(1, lines.length / 2)
    && foreign.filter((line) => !line.translation || !isChinese(line.translation)).length > foreign.length / 5;
}

/** 原文必须完全匹配（忽略标点和大小写），避免相似句子被误译；保留播放版本时间轴。 */
export function mergeChineseLyricLines(original: LyricLine[], translated: LyricLine[]): LyricLine[] {
  const translatedLines = translated.map(withChineseTranslation).filter((line) => line.translation && isChinese(line.translation));
  // 现场版或不同发行版可能有整体时间偏移。仅用双方都只出现一次的原文作为锚点。
  const sourceKeys = original.map((line) => lyricKey(withChineseTranslation(line).text));
  const targetKeys = translatedLines.map((line) => lyricKey(line.text));
  const offsets = original.flatMap((line, i) => {
    const key = sourceKeys[i];
    const j = targetKeys.indexOf(key);
    return key.length >= 5 && j >= 0 && sourceKeys.lastIndexOf(key) === i && targetKeys.lastIndexOf(key) === j
      ? [translatedLines[j].time - line.time] : [];
  }).sort((a, b) => a - b);
  const offset = offsets.length >= 3 ? offsets[Math.floor(offsets.length / 2)] : 0;
  const candidates = translatedLines.flatMap((line, i) => {
    const next = translatedLines[i + 1];
    // 两个平台常把同一句拆成不同数量的行，允许相邻的两段一起对齐。
    return next && next.time - line.time <= 6
      ? [line, { ...line, text: `${line.text}${next.text}`, translation: `${line.translation}，${next.translation}` }]
      : [line];
  });
  return original.map(withChineseTranslation).map((line) => {
    if (line.translation || !foreignText.test(line.text) || isChinese(line.text)) return line;
    const key = lyricKey(line.text);
    let best: LyricLine | undefined;
    for (const candidate of candidates) {
      if (Math.abs(candidate.time - line.time - offset) > 6) continue;
      if (!key || key !== lyricKey(candidate.text)) continue;
      if (!best || Math.abs(candidate.time - line.time - offset) < Math.abs(best.time - line.time - offset)) {
        best = candidate;
      }
    }
    return best ? { ...line, translation: best.translation } : line;
  });
}
