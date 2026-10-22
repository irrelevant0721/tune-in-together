import * as THREE from 'three';

/** Mineradio makeDotTexture — 干净圆点 */
export function makeDotTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(cv);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  g.addColorStop(0.0, 'rgba(255,255,255,0.96)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.78)');
  g.addColorStop(0.72, 'rgba(255,255,255,0.22)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}
