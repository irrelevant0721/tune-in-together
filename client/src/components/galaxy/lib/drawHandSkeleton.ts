/** Mineradio drawHandSkeleton — 手掌光晕 / 指尖光束 / 捏合高亮 */

type Landmark = { x: number; y: number; z?: number };

function clampRange(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function palmCenter(lm: Landmark[]): { x: number; y: number } {
  const px = (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5;
  const py = (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5;
  return { x: px, y: py };
}

export function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  W: number,
  H: number,
  opts: {
    isPinch: boolean;
    isFist: boolean;
    openness: number;
    time?: number;
  },
): void {
  const { isPinch, isFist } = opts;
  const openness = clampRange(opts.openness ?? 1, 0, 1);
  const time = opts.time ?? performance.now() / 1000;
  const palm = palmCenter(lm);
  const px = palm.x * W;
  const py = palm.y * H;
  const primary = isFist
    ? 'rgba(244,210,138,0.92)'
    : isPinch
      ? 'rgba(156,255,223,0.95)'
      : 'rgba(226,247,255,0.92)';
  const soft = isFist
    ? 'rgba(244,210,138,0.18)'
    : isPinch
      ? 'rgba(156,255,223,0.20)'
      : 'rgba(143,233,255,0.18)';
  const coreR = 26 + openness * 34;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const aura = ctx.createRadialGradient(px, py, 0, px, py, coreR * 2.15);
  aura.addColorStop(0, isFist ? 'rgba(244,210,138,0.26)' : 'rgba(255,255,255,0.22)');
  aura.addColorStop(0.28, soft);
  aura.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(px, py, coreR * 2.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ringR = 34 + openness * 48;
  for (let r = 0; r < 3; r += 1) {
    const alpha = 0.18 - r * 0.045 + (isFist ? 0.08 : 0);
    ctx.strokeStyle = primary.replace(/[\d.]+\)$/, `${alpha.toFixed(3)})`);
    ctx.lineWidth = 1.2 + r * 0.55;
    ctx.beginPath();
    ctx.arc(px, py, ringR + r * 13 + Math.sin(time * 1.5 + r) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tips = [4, 8, 12, 16, 20];
  for (const tipIdx of tips) {
    const p = lm[tipIdx];
    const tx = p.x * W;
    const ty = p.y * H;
    const dx = tx - px;
    const dy = ty - py;
    const dist = Math.hypot(dx, dy);
    const beamAlpha = clampRange(0.26 - dist / 720, 0.045, 0.18) * (0.55 + openness * 0.45);
    const grad = ctx.createLinearGradient(px, py, tx, ty);
    grad.addColorStop(0, `rgba(255,255,255,${(beamAlpha * 0.2).toFixed(3)})`);
    grad.addColorStop(0.65, `rgba(255,255,255,${(beamAlpha * 0.42).toFixed(3)})`);
    grad.addColorStop(1, primary.replace(/[\d.]+\)$/, `${Math.min(0.72, beamAlpha + 0.14).toFixed(3)})`));
    ctx.strokeStyle = grad;
    ctx.lineWidth = tipIdx === 8 || tipIdx === 4 ? 1.7 : 1.05;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + dx * 0.42 - dy * 0.05, py + dy * 0.42 + dx * 0.05, tx, ty);
    ctx.stroke();

    const dotR = (tipIdx === 8 || tipIdx === 4 ? 4.2 : 3.0) + (isFist ? 0.8 : 0);
    const dot = ctx.createRadialGradient(tx, ty, 0, tx, ty, dotR * 4.2);
    dot.addColorStop(0, 'rgba(255,255,255,0.92)');
    dot.addColorStop(0.32, primary);
    dot.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = dot;
    ctx.beginPath();
    ctx.arc(tx, ty, dotR * 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(px, py, isFist ? 7.2 : 5.4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${isFist ? 0.82 : 0.62})`;
  ctx.fill();

  if (isPinch) {
    const t1 = lm[4];
    const t2 = lm[8];
    ctx.strokeStyle = 'rgba(220,255,241,0.88)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(126,226,168,0.82)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(t1.x * W, t1.y * H);
    ctx.lineTo(t2.x * W, t2.y * H);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}
