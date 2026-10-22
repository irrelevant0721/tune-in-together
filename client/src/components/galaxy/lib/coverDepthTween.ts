/** 封面深度渐入（对齐 Mineradio setCoverDepthState） */
export function tweenCoverDepthUniforms(
  uniforms: { uHasDepth: { value: number }; uAiBoost: { value: number } },
  depthTo: number,
  aiTo: number,
  durationMs = 360,
): () => void {
  const depthFrom = uniforms.uHasDepth.value || 0;
  const aiFrom = uniforms.uAiBoost.value || 0;
  let raf = 0;
  const start = performance.now();

  const cancel = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  if (durationMs <= 1) {
    uniforms.uHasDepth.value = depthTo;
    uniforms.uAiBoost.value = aiTo;
    return cancel;
  }

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = t * t * (3 - 2 * t);
    uniforms.uHasDepth.value = depthFrom + (depthTo - depthFrom) * eased;
    uniforms.uAiBoost.value = aiFrom + (aiTo - aiFrom) * eased;
    if (t < 1) raf = requestAnimationFrame(step);
    else raf = 0;
  };

  raf = requestAnimationFrame(step);
  return cancel;
}
