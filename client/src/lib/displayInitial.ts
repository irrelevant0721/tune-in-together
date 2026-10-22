/** 取用于头像占位的首个可见字形（兼容表情、合字序列） */
export function getDisplayInitial(name: string, fallback = '?'): string {
  const text = String(name || '').trim();
  if (!text) return fallback;

  let first = '';
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const iter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      .segment(text)[Symbol.iterator]();
    first = iter.next().value?.segment || '';
  } else {
    // 按码点拆分，比 charAt 好；复杂合字表情可能仍不完美
    first = Array.from(text)[0] || '';
  }

  if (!first) return fallback;
  // 仅对单字母做大写，避免破坏表情/中文
  if (first.length === 1 && /[a-z]/i.test(first)) return first.toUpperCase();
  return first;
}
