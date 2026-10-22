import { visualEase } from './coverCanvas';

/** Mineradio startColorMixTween */
export function startCoverColorMixTween(
  uniforms: { uColorMixT: { value: number } },
  durationMs: number,
): () => void {
  let raf = 0;
  const start = performance.now();
  uniforms.uColorMixT.value = 0;

  const cancel = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const step = (now: number) => {
    const t = visualEase(Math.min(1, (now - start) / Math.max(1, durationMs)));
    uniforms.uColorMixT.value = t;
    if (t < 1) raf = requestAnimationFrame(step);
    else raf = 0;
  };

  raf = requestAnimationFrame(step);
  return cancel;
}
