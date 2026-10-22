import { useSyncExternalStore } from 'react';

export const LOADING_QUOTE_FALLBACK = '永远相信，美好的事情即将发生';
const LOCAL_LOADING_QUOTES = [
  '永远相信，美好的事情即将发生',
  '没有一个冬天不可逾越，没有一个春天不会来临',
  '愿你被这个世界温柔以待',
  '花会沿路盛开，你也会',
  '所有的失去，都会以另一种方式归来',
  '生活明朗，万物可爱',
  '人间值得，未来可期',
  '慢慢来，好事正在发生',
  '所有的努力，都会有回响',
  '愿你眼里有光，心中有梦',
  '愿你心中有光，脚下有路',
  '不必着急，好事需要一点时间发生',
  '你走过的路，每一步都算数',
  '你值得所有美好和温柔',
  '总有一天，你会感谢那个没有放弃的自己',
  '未来一定会有惊喜，在路上等你',
  '你比自己想象中更强大',
  '每一次低谷，都是重新出发的机会',
  '愿你保持热爱，奔赴山海',
  '愿你未来胜过往昔',
];

let quote = LOADING_QUOTE_FALLBACK;
let request: Promise<string> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getLoadingQuote() {
  return quote;
}

export function nextLoadingQuote() {
  if (LOCAL_LOADING_QUOTES.length < 2) return quote;
  let next = quote;
  while (next === quote) {
    next = LOCAL_LOADING_QUOTES[Math.floor(Math.random() * LOCAL_LOADING_QUOTES.length)] || LOADING_QUOTE_FALLBACK;
  }
  quote = next;
  notify();
  return quote;
}

export function prefetchLoadingQuote(): Promise<string> {
  if (request) return request;

  request = Promise.resolve().then(() => {
    quote = LOCAL_LOADING_QUOTES[Math.floor(Math.random() * LOCAL_LOADING_QUOTES.length)] || LOADING_QUOTE_FALLBACK;
    notify();
    return quote;
  }).finally(() => {
    request = null;
  });

  return request;
}

export function useLoadingQuote() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getLoadingQuote,
    () => LOADING_QUOTE_FALLBACK,
  );
}
