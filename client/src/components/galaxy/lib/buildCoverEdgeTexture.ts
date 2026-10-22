/** 从封面生成边缘/深度贴图（R=depth, G=edge, B=fgMask, A=lum），对齐 Mineradio */
export function buildCoverEdgeTexture(source: CanvasImageSource): HTMLCanvasElement {
  const W = 256;
  const H = 256;
  const N = W * H;

  const normalized = document.createElement('canvas');
  normalized.width = W;
  normalized.height = H;
  const sctx = normalized.getContext('2d', { willReadFrequently: true });
  if (!sctx) return normalized;
  sctx.drawImage(source, 0, 0, W, H);

  const src = sctx.getImageData(0, 0, W, H).data;
  const lum = new Float32Array(N);
  const blur = new Float32Array(N);
  const tmp = new Float32Array(N);

  for (let i = 0; i < N; i += 1) {
    const di = i * 4;
    lum[i] = (src[di] * 0.299 + src[di + 1] * 0.587 + src[di + 2] * 0.114) / 255;
  }

  function blurH(s: Float32Array, d: Float32Array, r: number) {
    for (let y = 0; y < H; y += 1) {
      let sum = 0;
      for (let x = -r; x <= r; x += 1) {
        sum += s[y * W + Math.max(0, Math.min(W - 1, x))];
      }
      for (let x = 0; x < W; x += 1) {
        d[y * W + x] = sum / (2 * r + 1);
        const xR = Math.min(W - 1, x + r + 1);
        const xL = Math.max(0, x - r);
        sum += s[y * W + xR] - s[y * W + xL];
      }
    }
  }

  function blurV(s: Float32Array, d: Float32Array, r: number) {
    for (let x = 0; x < W; x += 1) {
      let sum = 0;
      for (let y = -r; y <= r; y += 1) {
        sum += s[Math.max(0, Math.min(H - 1, y)) * W + x];
      }
      for (let y = 0; y < H; y += 1) {
        d[y * W + x] = sum / (2 * r + 1);
        const yD = Math.min(H - 1, y + r + 1);
        const yU = Math.max(0, y - r);
        sum += s[yD * W + x] - s[yU * W + x];
      }
    }
  }

  blurH(lum, tmp, 4);
  blurV(tmp, blur, 4);

  const edge = new Float32Array(N);
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const gx =
        -blur[(y - 1) * W + (x - 1)] - 2 * blur[y * W + (x - 1)] - blur[(y + 1) * W + (x - 1)]
        + blur[(y - 1) * W + (x + 1)] + 2 * blur[y * W + (x + 1)] + blur[(y + 1) * W + (x + 1)];
      const gy =
        -blur[(y - 1) * W + (x - 1)] - 2 * blur[(y - 1) * W + x] - blur[(y - 1) * W + (x + 1)]
        + blur[(y + 1) * W + (x - 1)] + 2 * blur[(y + 1) * W + x] + blur[(y + 1) * W + (x + 1)];
      edge[y * W + x] = Math.min(1.0, Math.sqrt(gx * gx + gy * gy) * 1.4);
    }
  }

  const depth = new Float32Array(N);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = y * W + x;
      const cx = (x / (W - 1) - 0.5) * 2.0;
      const cy = (y / (H - 1) - 0.5) * 2.0;
      const rr = Math.sqrt(cx * cx + cy * cy);
      const centerBias = 1.0 - Math.min(1, rr * 0.75);
      const raw = blur[i] * 0.45 + centerBias * 0.55;
      depth[i] = Math.min(1.0, Math.max(0, 0.5 + (raw - 0.5) * 1.28));
    }
  }

  const fg = new Float32Array(N);
  for (let i = 0; i < N; i += 1) {
    fg[i] = Math.min(1.0, depth[i] * 0.6 + edge[i] * 0.5);
  }

  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const octx = out.getContext('2d');
  if (!octx) return out;
  const imgOut = octx.createImageData(W, H);
  for (let i = 0; i < N; i += 1) {
    const di = i * 4;
    imgOut.data[di] = Math.round(depth[i] * 255);
    imgOut.data[di + 1] = Math.round(edge[i] * 255);
    imgOut.data[di + 2] = Math.round(fg[i] * 255);
    imgOut.data[di + 3] = Math.round(lum[i] * 255);
  }
  octx.putImageData(imgOut, 0, 0);
  return out;
}
