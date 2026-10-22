import {
  fetchDjHotRadios,
  searchDjRadios,
  type DjRadioItem,
} from '../api/music/djRadio';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export type DjRadiosData = {
  hot: DjRadioItem[];
  recommend: DjRadioItem[];
};

let cache: { data: DjRadiosData; expires: number } | null = null;
let inflight: Promise<DjRadiosData> | null = null;

async function loadDjRadios(): Promise<DjRadiosData> {
  const [hot, recommend] = await Promise.all([
    fetchDjHotRadios('hot').catch(() => [] as DjRadioItem[]),
    fetchDjHotRadios('recommend').catch(() => [] as DjRadioItem[]),
  ]);
  return { hot, recommend };
}

export function peekDjRadios(): DjRadiosData | null {
  if (cache && Date.now() < cache.expires) return cache.data;
  return null;
}

export async function getDjRadios(): Promise<DjRadiosData> {
  const hit = peekDjRadios();
  if (hit) return hit;
  if (inflight) return inflight;

  inflight = loadDjRadios()
    .then((data) => {
      cache = { data, expires: Date.now() + CACHE_TTL_MS };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export async function searchDjRadiosCached(keyword: string): Promise<DjRadioItem[]> {
  return searchDjRadios(keyword);
}
