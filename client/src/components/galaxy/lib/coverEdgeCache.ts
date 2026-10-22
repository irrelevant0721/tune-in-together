/** Mineradio coverDepthCache：边缘/深度图算一次就留着，回听同一首不用再摊平重算 */
const CACHE_LIMIT = 18;
const cache = new Map<string, HTMLCanvasElement>();

export function getCoverEdgeCanvas(key: string | null | undefined): HTMLCanvasElement | null {
  if (!key) return null;
  const canvas = cache.get(key);
  if (!canvas) return null;
  cache.delete(key);
  cache.set(key, canvas);
  return canvas;
}

export function setCoverEdgeCanvas(
  key: string | null | undefined,
  canvas: HTMLCanvasElement,
): void {
  if (!key || !canvas.width) return;
  cache.delete(key);
  cache.set(key, canvas);
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}
