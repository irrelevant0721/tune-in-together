import * as THREE from 'three';

const PLANE_SIZE = 4.8;
const RIPPLE_MAX = 12;
const BASS_THRESHOLD = 0.3;
const RIPPLE_COOLDOWN = 0.32;
/** 与 shader 解码一致：xy∈[-2.5,2.5], age∈[0,2], str∈[0,3] */
const RIPPLE_XY_RANGE = 5;
const RIPPLE_XY_BIAS = 2.5;
const RIPPLE_AGE_MAX = 2;
const RIPPLE_STR_MAX = 3;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function encodeRippleSlot(
  data: Uint8Array,
  slot: number,
  x: number,
  y: number,
  age: number,
  str: number,
): void {
  const off = slot * 4;
  data[off] = Math.round(clamp01((x + RIPPLE_XY_BIAS) / RIPPLE_XY_RANGE) * 255);
  data[off + 1] = Math.round(clamp01((y + RIPPLE_XY_BIAS) / RIPPLE_XY_RANGE) * 255);
  data[off + 2] = Math.round(clamp01(age / RIPPLE_AGE_MAX) * 255);
  data[off + 3] = Math.round(clamp01(str / RIPPLE_STR_MAX) * 255);
}

interface Ripple {
  x: number;
  y: number;
  age: number;
  str: number;
}

const regions = Array.from({ length: 9 }, (_, i) => {
  const rx = i % 3;
  const ry = Math.floor(i / 3);
  return {
    x: (rx / 2 - 0.5) * PLANE_SIZE * 0.72,
    y: (ry / 2 - 0.5) * PLANE_SIZE * 0.72,
  };
});

export interface GalaxyRippleSystem {
  texture: THREE.DataTexture;
  update: (
    dt: number,
    bass: number,
    time: number,
    uniforms: { uRippleCount: { value: number } },
  ) => void;
  reset: () => void;
  burst: (count?: number) => void;
}

export function createGalaxyRippleSystem(): GalaxyRippleSystem {
  const rippleData = new Uint8Array(RIPPLE_MAX * 4);
  const texture = new THREE.DataTexture(
    rippleData,
    1,
    RIPPLE_MAX,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;

  let ripples: Ripple[] = Array.from({ length: RIPPLE_MAX }, () => ({
    x: 0,
    y: 0,
    age: -10,
    str: 0,
  }));
  let rippleIdx = 0;
  let lastRippleAt = 0;
  let lastBassRising = false;

  const triggerRipple = (x: number, y: number, strength: number) => {
    const r = ripples[rippleIdx];
    r.x = x;
    r.y = y;
    r.age = 0;
    r.str = strength;
    rippleIdx = (rippleIdx + 1) % RIPPLE_MAX;
  };

  const update = (
    dt: number,
    bass: number,
    time: number,
    uniforms: { uRippleCount: { value: number } },
  ) => {
    const isBassHit = bass > BASS_THRESHOLD && !lastBassRising;
    lastBassRising = bass > BASS_THRESHOLD * 0.75;

    if (isBassHit && time - lastRippleAt > RIPPLE_COOLDOWN) {
      lastRippleAt = time;
      const count = 2 + (Math.random() < 0.5 ? 0 : 1);
      const used: Record<number, boolean> = {};
      for (let k = 0; k < count; k++) {
        let idx = 0;
        let tries = 0;
        do {
          idx = Math.floor(Math.random() * 9);
          tries++;
        } while (used[idx] && tries < 12);
        used[idx] = true;
        const reg = regions[idx];
        const jx = reg.x + (Math.random() - 0.5) * 0.7;
        const jy = reg.y + (Math.random() - 0.5) * 0.7;
        const str = 0.65 + bass * 1.4 + Math.random() * 0.25;
        triggerRipple(jx, jy, str);
      }
    }

    for (let i = 0; i < RIPPLE_MAX; i++) {
      const r = ripples[i];
      if (r.str > 0.005) {
        r.age += dt;
        if (r.age > 2.0) {
          r.str = 0;
          r.age = -10;
        }
      }
    }

    const activeRipples = ripples.filter((r) => r.str > 0.005);
    const active = activeRipples.length;
    for (let i = 0; i < RIPPLE_MAX; i++) {
      const r =
        i < activeRipples.length
          ? activeRipples[i]
          : { x: 0, y: 0, age: -10, str: 0 };
      encodeRippleSlot(rippleData, i, r.x, r.y, Math.max(0, r.age), r.str);
    }
    texture.needsUpdate = true;
    uniforms.uRippleCount.value = active;
  };

  const reset = () => {
    ripples = Array.from({ length: RIPPLE_MAX }, () => ({
      x: 0,
      y: 0,
      age: -10,
      str: 0,
    }));
    rippleIdx = 0;
    lastRippleAt = 0;
    lastBassRising = false;
    rippleData.fill(0);
    texture.needsUpdate = true;
  };

  const burst = (count = 3) => {
    for (let i = 0; i < count; i++) {
      triggerRipple(
        (Math.random() - 0.5) * 3.4,
        (Math.random() - 0.5) * 3.4,
        0.58 + Math.random() * 0.32,
      );
    }
  };

  return { texture, update, reset, burst };
}
