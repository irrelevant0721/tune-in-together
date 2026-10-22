import * as THREE from 'three';

import type { RoomVisualFxSettings } from '../../../lib/roomVisualPreset';
import type { BeatCameraKick } from './galaxyCinema';
import type { LyricMeshGroup } from './galaxyStageLyricMaterial';

const LYRIC_GLOW_COLOR = new THREE.Color('#9cffdf');
const LYRIC_SUN_HOT = new THREE.Color('#fff4cc');

const LYRIC_CAMERA_LOCK_MAX_SCALE = 0.8;
/** 呼吸/节拍缩放余量，避免瞬时放大后边缘被裁切 */
const LYRIC_MESH_PULSE_PAD = 1.08;
const LYRIC_VIEWPORT_FIT_MIN = 0.16;

const lyricTiltEuler = new THREE.Euler();

function clampRange(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

type LyricMotionProfile = {
  style: RoomVisualFxSettings['lyricMotionStyle'];
  enter: number;
  slide: number;
  contextDrift: number;
  edgeBoost: number;
  sweep: number;
  shimmer: number;
  glitch: number;
  glitchSlice: number;
  glitchChroma: number;
  glitchRate: number;
  glitchJitter: number;
  glitchCameraBind: boolean;
  glowLift: number;
  floatAmp: number;
};

function lyricMotionProfile(fx: RoomVisualFxSettings): LyricMotionProfile {
  const soft = clampRange(fx.lyricMotionSoftness, 0.15, 1.2);
  const profile: LyricMotionProfile = {
    style: fx.lyricMotionStyle,
    enter: 0.62,
    slide: 0.38,
    contextDrift: 0.066,
    edgeBoost: 1.18,
    sweep: 0.72,
    shimmer: 0.22,
    glitch: 0,
    glitchSlice: 0,
    glitchChroma: 0,
    glitchRate: 1,
    glitchJitter: 0,
    glitchCameraBind: false,
    glowLift: 1,
    floatAmp: 1,
  };
  if (profile.style === 'smooth') {
    Object.assign(profile, { enter: 0.72, slide: 0.24, contextDrift: 0.03, edgeBoost: 0.62, sweep: 0.18, shimmer: 0.05, glowLift: 0.74, floatAmp: 0.55 });
  } else if (profile.style === 'float') {
    Object.assign(profile, { enter: 0.86, slide: 0.54, contextDrift: 0.12, edgeBoost: 1.04, sweep: 0.36, shimmer: 0.14, glowLift: 1.16, floatAmp: 1.45 });
  } else if (profile.style === 'quick') {
    Object.assign(profile, { enter: 0.36, slide: 0.22, contextDrift: 0.034, edgeBoost: 0.7, sweep: 0.28, shimmer: 0.1, glowLift: 0.86, floatAmp: 0.62 });
  } else if (profile.style === 'shine') {
    Object.assign(profile, { enter: 0.5, slide: 0.34, contextDrift: 0.052, edgeBoost: 1.42, sweep: 1.22, shimmer: 0.34, glowLift: 1.3, floatAmp: 0.82 });
  } else if (profile.style === 'glitch') {
    Object.assign(profile, {
      enter: 0.4,
      slide: 0.3,
      contextDrift: 0.035,
      edgeBoost: 1.18,
      sweep: 0.54,
      shimmer: 0.28,
      glitch: clampRange(fx.lyricGlitchIntensity, 0, 1.5),
      glitchSlice: clampRange(fx.lyricGlitchSlice, 0, 1.4),
      glitchChroma: clampRange(fx.lyricGlitchChroma, 0, 1.6),
      glitchRate: clampRange(fx.lyricGlitchRate, 0.45, 2.2),
      glitchJitter: clampRange(fx.lyricGlitchJitter, 0, 1.8),
      glitchCameraBind: fx.lyricGlitchCameraBind,
      glowLift: 1.08 + clampRange(fx.lyricGlitchIntensity, 0, 1.5) * 0.1,
      floatAmp: 0.7,
    });
  }
  profile.enter *= soft;
  profile.slide *= clampRange(0.8 + soft * 0.35, 0.75, 1.28);
  return profile;
}

/** 行轨道：整叠歌词共用一次视口适配，单行 mesh 的尺寸不能再各算各的 */
export function lyricStackViewportFit(params: {
  camera: THREE.PerspectiveCamera;
  stackWidth: number;
  stackHeight: number;
  layoutScale: number;
  layoutX: number;
  layoutY: number;
  layoutTiltX: number;
  layoutTiltY: number;
  distance: number;
  cameraLocked: boolean;
}): number {
  return fitLyricStack(
    params.camera,
    params.stackWidth * LYRIC_MESH_PULSE_PAD,
    params.stackHeight * LYRIC_MESH_PULSE_PAD,
    params.layoutScale,
    params.layoutX,
    params.layoutY,
    params.layoutTiltX,
    params.layoutTiltY,
    params.distance,
    params.cameraLocked,
  );
}

function lyricMeshScale(mesh: LyricMeshGroup | null): number {
  if (!mesh) return LYRIC_MESH_PULSE_PAD;
  return Math.max(
    mesh.scale?.x && Number.isFinite(mesh.scale.x) ? mesh.scale.x : 1,
    mesh.scale?.y && Number.isFinite(mesh.scale.y) ? mesh.scale.y : 1,
    LYRIC_MESH_PULSE_PAD,
  );
}

function lyricMeshWorldW(mesh: LyricMeshGroup | null): number {
  const d = mesh?.userData?.lyric;
  if (!d) return 5.4;
  return (d.textWorldW || d.worldW || 6.1) * lyricMeshScale(mesh);
}

function lyricMeshWorldH(mesh: LyricMeshGroup | null): number {
  const d = mesh?.userData?.lyric;
  if (!d) return 0.78;
  return (d.textWorldH || d.worldH || 1) * lyricMeshScale(mesh);
}

function fitLyricStack(
  camera: THREE.PerspectiveCamera,
  rawW: number,
  rawH: number,
  layoutScale: number,
  layoutX: number,
  layoutY: number,
  layoutTiltX: number,
  layoutTiltY: number,
  distance: number,
  cameraLocked: boolean,
): number {
  layoutScale = Math.max(0.1, layoutScale || 1);
  const fov = (camera.fov || 45) * (Math.PI / 180);
  const dist = Math.max(1.4, distance || 4.85);
  const visibleH = 2 * Math.tan(fov * 0.5) * dist;
  const visibleW = visibleH * (camera.aspect || window.innerWidth / Math.max(1, window.innerHeight) || 1.78);

  let maxW = rawW || 5.4;
  let maxH = rawH || 0.78;

  // 轻微会增加投影占用宽度，留一点斜向余量
  const tiltPad =
    1 +
    Math.abs(layoutTiltX || 0) * 0.004 +
    Math.abs(layoutTiltY || 0) * 0.006;
  maxW *= tiltPad;
  maxH *= tiltPad;

  const widthBudget = cameraLocked ? 0.84 : 0.9;
  const heightBudget = cameraLocked ? 0.44 : 0.52;
  const safeW = Math.max(visibleW * 0.36, visibleW * widthBudget - Math.abs(layoutX || 0) * 1.22);
  const safeH = Math.max(visibleH * 0.16, visibleH * heightBudget - Math.abs(layoutY || 0) * 0.82);
  const scaledW = Math.max(0.01, maxW * layoutScale);
  const scaledH = Math.max(0.01, maxH * layoutScale);
  const viewportFit = Math.min(1, safeW / scaledW, safeH / scaledH);
  const lockScaleCap = cameraLocked ? Math.min(1, LYRIC_CAMERA_LOCK_MAX_SCALE / layoutScale) : 1;
  return clampRange(Math.min(viewportFit, lockScaleCap), LYRIC_VIEWPORT_FIT_MIN, 1);
}

export type StageLyricsRuntime = {
  highBloom: number;
  beatGlow: number;
  glowFollowX: number;
  glowFollowY: number;
  glowFollowRoll: number;
  lockFitScale: number;
  starRiverWidth: number;
  starRiverHeight: number;
  snapCameraLockFrames: number;
};

export function createStageLyricsRuntime(): StageLyricsRuntime {
  return {
    highBloom: 0,
    beatGlow: 0,
    glowFollowX: 0,
    glowFollowY: 0,
    glowFollowRoll: 0,
    lockFitScale: 1,
    starRiverWidth: 3.4,
    starRiverHeight: 0.58,
    snapCameraLockFrames: 0,
  };
}

export type StageLyricStageRoot = THREE.Group & {
  userData: {
    starRiver?: THREE.Points;
    starRiverMat?: THREE.ShaderMaterial;
  };
};

function tickLyricMesh(
  mesh: LyricMeshGroup,
  dt: number,
  time: number,
  bands: { bass: number; mid: number; beat: number; energy: number },
  runtime: StageLyricsRuntime,
  fx: RoomVisualFxSettings,
  lyricGlowStrength: number,
  glowDrive: number,
  spatialAnchor: 'galaxy' | 'topography' = 'galaxy',
): void {
  mesh.userData.age += dt;
  const motion = lyricMotionProfile(fx);
  const a = Math.min(1, mesh.userData.age / Math.max(0.08, motion.enter));
  const ease = a * a * (3 - 2 * a);
  const data = mesh.userData.lyric;
  const seed = mesh.userData.floatSeed || 0;
  const uniforms = data.textMat.uniforms;
  uniforms.uTime.value = time;
  uniforms.uSweep.value = motion.sweep;
  uniforms.uShimmer.value = motion.shimmer;
  uniforms.uGlitch.value = motion.glitch;
  uniforms.uGlitchSlice.value = motion.glitchSlice;
  uniforms.uGlitchChroma.value = motion.glitchChroma;
  uniforms.uGlitchRate.value = motion.glitchRate;
  uniforms.uEdgeBoost.value = motion.edgeBoost;

  let glitchBurst = mesh.userData.glitchBurst ?? 0;
  if (motion.glitch > 0) {
    const beatDrive = Math.max(bands.beat, runtime.beatGlow);
    if (motion.glitchCameraBind && beatDrive > 0.2) {
      glitchBurst = Math.max(glitchBurst, beatDrive * (0.6 + motion.glitchJitter * 0.16));
      mesh.userData.glitchSeed = Math.random() * 997;
    }
    if (!mesh.userData.glitchNextAt || time >= mesh.userData.glitchNextAt) {
      if (!motion.glitchCameraBind || beatDrive > 0.28) {
        glitchBurst = Math.max(glitchBurst, 0.12 + Math.random() * 0.64);
        mesh.userData.glitchSeed = Math.random() * 997;
      }
      mesh.userData.glitchNextAt = time + (0.08 + Math.random() * 0.52) / (0.58 + motion.glitchRate * 0.46);
    }
    glitchBurst *= Math.pow(0.018, dt);
  } else {
    glitchBurst = 0;
  }
  mesh.userData.glitchBurst = glitchBurst;
  uniforms.uGlitchBurst.value = clampRange(glitchBurst * motion.glitch, 0, 1.95);
  uniforms.uGlitchSeed.value = mesh.userData.glitchSeed ?? seed;

  const glowX = runtime.glowFollowX;
  const glowY = runtime.glowFollowY;
  const glowRoll = runtime.glowFollowRoll;

  if (data.glow) {
    data.glow.position.set(glowX * 0.14, glowY * 0.12, -0.006);
    data.glow.rotation.z = glowRoll * 0.3;
  }
  if (data.sun) {
    data.sun.position.set(glowX * 0.42, 0.02 + glowY * 0.34, -0.035);
    data.sun.rotation.z = glowRoll * 0.36;
  }
  if (data.sparks) {
    data.sparks.position.set(glowX * 0.24, glowY * 0.22, 0.01);
    data.sparks.rotation.z = glowRoll * 0.22;
  }

  const solar = runtime.highBloom;
  const opacityTarget = 0.96;
  const currentOpacity = data.textMat.uniforms.uOpacity.value as number;
  const opacityEase = spatialAnchor === 'topography' ? 0.28 : 0.16;
  const opacity =
    currentOpacity + (opacityTarget - currentOpacity) * opacityEase;
  data.textMat.uniforms.uOpacity.value = opacity;

  // 该纹理是歌词可读性遮罩，不应成为肉眼可见的第二层白色歌词。
  if (data.readabilityMat) {
    const readabilityTarget = opacity * clampRange(fx.lyricBackgroundAdapt, 0, 1) * 0.08;
    data.readabilityMat.opacity += (readabilityTarget - data.readabilityMat.opacity) * 0.12;
  }

  const solarTarget = runtime.highBloom;
  const curSolar = data.textMat.uniforms.uSolar.value as number;
  data.textMat.uniforms.uSolar.value = curSolar + (solarTarget - curSolar) * 0.12;

  // Mineradio 14-stage-lyrics-rendering.js glowTarget 原值
  const glowTarget =
    lyricGlowStrength > 0
      ? Math.min(
          0.88,
          (0.075 + solar * 0.34 + runtime.beatGlow * 0.16) * Math.min(3, glowDrive) * motion.glowLift,
        )
      : 0;
  if (data.glowMat) {
    data.glowMat.opacity +=
      (glowTarget - data.glowMat.opacity) *
      (glowTarget > data.glowMat.opacity ? 0.095 : 0.055);
    const warmth = Math.max(0, Math.min(1, solar * 1.1));
    data.glowMat.color.copy(LYRIC_GLOW_COLOR).lerp(LYRIC_SUN_HOT, warmth);
  }

  if (data.sparkMat) {
    const sparkTarget =
      lyricGlowStrength > 0 && fx.lyricGlowParticles
        ? Math.min(0.42, (0.1 + solar * 0.14 + runtime.beatGlow * 0.1) * Math.min(1.6, glowDrive))
        : 0;
    const sparkOpacity = data.sparkMat.uniforms.uOpacity.value as number;
    data.sparkMat.uniforms.uOpacity.value +=
      (sparkTarget - sparkOpacity) * (sparkTarget > sparkOpacity ? 0.13 : 0.075);
    const sparkSizeTarget = fx.lyricGlowParticles
      ? 0.05 + solar * 0.016 + runtime.beatGlow * 0.026 + bands.bass * 0.008
      : 0.035;
    const curSize = data.sparkMat.uniforms.uSize.value as number;
    data.sparkMat.uniforms.uSize.value = curSize + (sparkSizeTarget - curSize) * 0.12;
  }

  // Mineradio sunTarget 原值（shine 运动风格 ×1.18）
  const sunTarget =
    lyricGlowStrength > 0
      ? Math.min(
          0.88,
          (Math.pow(Math.min(1.35, solar), 1.08) * 0.28 + runtime.beatGlow * 0.2) *
            Math.min(2.4, glowDrive) *
            (fx.lyricMotionStyle === 'shine' ? 1.18 : 1),
        )
      : 0;
  if (data.sunMat) data.sunMat.opacity += (sunTarget - data.sunMat.opacity) * 0.055;

  if (data.sun) {
    const sunPulse = solar;
    const beatScale = fx.lyricGlowBeat ? runtime.beatGlow * 0.24 : 0;
    data.sun.scale.set(
      0.82 + sunPulse * 0.36 + beatScale + Math.sin(time * 1.6) * sunPulse * 0.018,
      0.6 + sunPulse * 0.34 + beatScale * 0.72 + Math.cos(time * 1.25) * sunPulse * 0.02,
      1,
    );
    data.sun.rotation.z += Math.sin(time * 0.32 + seed) * 0.01 * sunPulse;
  }

  // 浮动 / 呼吸 / 侧摆都挪到 stageRoot 上了（Mineradio 也挂在承载所有行的根 mesh 上）。
  // 留在这里只会让播放中的那一行从整叠歌词里飘出来。
  const beatPulse = bands.beat;
  const jitterDrive = uniforms.uGlitchBurst.value as number;
  const jitterX = jitterDrive * Math.sin(time * (61 + motion.glitchRate * 26) + seed) * (0.008 + motion.glitchSlice * 0.014) * (0.5 + motion.glitchJitter * 0.62);
  const jitterY = jitterDrive * Math.cos(time * (37 + motion.glitchRate * 15) + seed) * (0.002 + motion.glitchSlice * 0.004);
  mesh.scale.setScalar(0.96 + ease * 0.055 + bands.bass * 0.038 + beatPulse * 0.014);
  mesh.position.x += (jitterX - mesh.position.x) * (jitterDrive > 0.01 ? 0.7 : 0.12);
  if (mesh.userData.trackAnchorY != null) {
    // 行轨道接管纵向：当前行与上下文行必须共用同一条滚动相位，否则又变成两块各走各的
    mesh.position.y = mesh.userData.trackAnchorY + jitterY;
  } else {
    mesh.position.y += (0.18 + jitterY - mesh.position.y) * 0.075;
  }
  mesh.position.z += (1.48 - mesh.position.z) * 0.08;
  mesh.rotation.z = 0;

  if (data.sparks && data.sparkMat) {
    data.sparks.visible =
      fx.lyricGlowParticles || (data.sparkMat.uniforms.uOpacity.value as number) > 0.015;
  }
  if (data.sparks && data.basePositions) {
    const pos = data.sparks.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const base = data.basePositions;
    data.sparks.rotation.z +=
      ((fx.lyricGlowParticles ? 0.0009 : 0.00025) + runtime.beatGlow * 0.0007) * (dt * 60);
    data.sparks.rotation.x = Math.sin(time * 0.12 + seed) * 0.012;
    for (let si = 0; si < arr.length / 3; si++) {
      const s = si * 12.989 + seed;
      const particleBeat = fx.lyricGlowParticles ? runtime.beatGlow : 0;
      const dustBreath = fx.lyricGlowParticles
        ? 0.62 + 0.38 * Math.sin(time * (0.32 + (si % 7) * 0.025) + s)
        : 0.18;
      const drift = fx.lyricGlowParticles ? 1 : 0.3;
      arr[si * 3] =
        base[si * 3] +
        Math.sin(time * (0.18 + (si % 5) * 0.025) + s) *
          (0.045 + bands.bass * 0.03 + particleBeat * 0.052) *
          drift +
        Math.cos(time * 0.11 + s) * 0.018 * dustBreath;
      arr[si * 3 + 1] =
        base[si * 3 + 1] +
        Math.cos(time * (0.16 + (si % 6) * 0.024) + s) *
          (0.042 + bands.mid * 0.026 + particleBeat * 0.046) *
          drift +
        Math.sin(time * 0.13 + s) * 0.016 * dustBreath;
      arr[si * 3 + 2] =
        base[si * 3 + 2] +
        Math.sin(time * (0.24 + (si % 4) * 0.035) + s) * (0.036 + particleBeat * 0.028) * drift;
    }
    pos.needsUpdate = true;
  }
}

function updateLyricStarRiver(
  stageRoot: StageLyricStageRoot,
  currentMesh: LyricMeshGroup | null,
  dt: number,
  time: number,
  runtime: StageLyricsRuntime,
  fx: RoomVisualFxSettings,
  stackWidth?: number,
  stackHeight?: number,
): void {
  const river = stageRoot.userData.starRiver;
  const u = stageRoot.userData.starRiverMat?.uniforms;
  if (!river || !u) return;

  const data = currentMesh?.userData?.lyric;
  // 星河带罩的是整叠歌词；只按当前行算的话会缩成一条压在当前句上的亮带
  const spanW = stackWidth || data?.textWorldW || data?.worldW || 0;
  const spanH = stackHeight || data?.textWorldH || data?.worldH || 0;
  const targetW = spanW ? clampRange(spanW * 1.12 + 0.8, 2.25, 7.2) : 3.4;
  const targetH = spanH ? clampRange(spanH * 1.85 + 0.18, 0.52, 1.35) : 0.58;
  runtime.starRiverWidth += (targetW - runtime.starRiverWidth) * Math.min(1, dt * 5.2);
  runtime.starRiverHeight += (targetH - runtime.starRiverHeight) * Math.min(1, dt * 4.6);
  u.uWidth.value = runtime.starRiverWidth;
  u.uHeight.value = runtime.starRiverHeight;

  const lyricGlowStrength = fx.lyricGlow
    ? Math.min(0.85, Math.max(0, fx.lyricGlowStrength))
    : 0;
  // 只看「歌词光粒」：Mineradio 的这条带子属于歌词自身，
  // 和全局背景星河层（backgroundStarRiver）是两回事，之前串在一起了
  const targetOpacity =
    currentMesh && fx.lyricGlowParticles
      ? clampRange(
          0.22 + lyricGlowStrength * 0.58 + runtime.highBloom * 0.16 + runtime.beatGlow * 0.12,
          0.16,
          0.86,
        )
      : 0;
  u.uOpacity.value +=
    (targetOpacity - u.uOpacity.value) * (targetOpacity > u.uOpacity.value ? 0.1 : 0.055);
  u.uTime.value = time;
  river.visible = (u.uOpacity.value as number) > 0.01 || !!currentMesh;
  river.position.y +=
    (0.18 + Math.sin(time * 0.44) * 0.035 + Math.sin(time * 0.91 + 1.7) * 0.018 - river.position.y) *
    0.08;
  river.position.z += (1.54 + Math.cos(time * 0.31) * 0.06 - river.position.z) * 0.08;
  river.rotation.z = Math.sin(time * 0.22) * 0.012;
}

/** Mineradio updateStageLyrics3D */
export function updateStageLyrics3D(params: {
  stageRoot: StageLyricStageRoot;
  currentMesh: LyricMeshGroup | null;
  camera: THREE.Camera;
  dt: number;
  time: number;
  bands: { bass: number; mid: number; beat: number; energy: number };
  kick: BeatCameraKick;
  fx: RoomVisualFxSettings;
  runtime: StageLyricsRuntime;
  spatialAnchor?: 'galaxy' | 'topography';
  cameraLockDistance?: number;
  /** 行轨道自己算好的整叠适配比例；给了就不再按单行 mesh 估算 */
  fitOverride?: number | null;
  /** 可见歌词整叠的世界尺寸，星河带按它铺开 */
  stackWidth?: number;
  stackHeight?: number;
}): void {
  const {
    stageRoot,
    currentMesh,
    camera,
    dt,
    time,
    bands,
    kick,
    fx,
    runtime,
    spatialAnchor = 'galaxy',
    cameraLockDistance,
    fitOverride,
    stackWidth,
    stackHeight,
  } = params;
  if (!stageRoot) return;

  const lyricGlowStrength = fx.lyricGlow
    ? Math.min(0.85, Math.max(0, fx.lyricGlowStrength))
    : 0;
  const glowDrive = Math.min(1.7, Math.max(0, lyricGlowStrength / 0.5));
  const glowBreath = lyricGlowStrength > 0 ? 0.5 + 0.5 * Math.sin(time * 1.05) : 0;
  const musicBloom = Math.max(bands.beat * 0.06, bands.energy * 0.22);
  const cameraBeat = Math.max(kick.punch, kick.radiusKick * 2.1);
  const beatGlowRaw =
    fx.lyricGlowBeat && lyricGlowStrength > 0
      ? cameraBeat > 0.16
        ? Math.min(1.35, cameraBeat * 0.96)
        : 0
      : 0;
  const beatGlowRate = beatGlowRaw > runtime.beatGlow ? 18 : 5.6;
  runtime.beatGlow += (beatGlowRaw - runtime.beatGlow) * (1 - Math.exp(-beatGlowRate * dt));

  const solarBloom = lyricGlowStrength > 0
    ? (0.18 + glowBreath * 0.16 + musicBloom * 0.9 + runtime.beatGlow * 1.18 + Math.sin(time * 0.37 + 1.2) * 0.035) *
      glowDrive
    : 0;
  runtime.highBloom +=
    (Math.min(1.45, solarBloom) - runtime.highBloom) *
    (1 - Math.exp(-(solarBloom > runtime.highBloom ? 5.2 : 3.1) * dt));

  updateLyricStarRiver(stageRoot, currentMesh, dt, time, runtime, fx, stackWidth, stackHeight);

  const followDrive = fx.lyricGlowBeat && lyricGlowStrength > 0 ? Math.min(1.35, runtime.beatGlow) : 0;
  const followXTarget = followDrive * (kick.thetaKick * 34 + kick.rollKick * 8);
  const followYTarget = followDrive * (kick.phiKick * 42 - kick.radiusKick * 0.48);
  const followRollTarget = followDrive * (kick.rollKick * 22 + kick.thetaKick * 10);
  runtime.glowFollowX += (followXTarget - runtime.glowFollowX) * 0.26;
  runtime.glowFollowY += (followYTarget - runtime.glowFollowY) * 0.24;
  runtime.glowFollowRoll += (followRollTarget - runtime.glowFollowRoll) * 0.22;
  runtime.glowFollowX *= 0.92;
  runtime.glowFollowY *= 0.92;
  runtime.glowFollowRoll *= 0.9;

  const layoutScale = clampRange(fx.lyricScale || 1, 0.35, 1.65);
  const layoutX = clampRange(fx.lyricOffsetX || 0, -2, 2);
  const layoutY = clampRange(fx.lyricOffsetY || 0, -1.2, 1.35);
  const layoutZ = clampRange(fx.lyricOffsetZ || 0, -1.6, 1.6);
  const layoutTiltX = clampRange(fx.lyricTiltX || 0, -42, 42);
  const layoutTiltY = clampRange(fx.lyricTiltY || 0, -42, 42);

  const persp = camera as THREE.PerspectiveCamera;
  const lockDistance = cameraLockDistance ?? 4.85 + layoutZ;
  const useCameraLock = spatialAnchor === 'galaxy' && fx.lyricCameraLock;
  // 无论是否开启镜头锁定，都做视口安全缩放，避免长歌词（含翻译）横向裁切
  const lockFit = fitOverride != null && Number.isFinite(fitOverride)
    ? clampRange(fitOverride, LYRIC_VIEWPORT_FIT_MIN, 1)
    : persp.isPerspectiveCamera
      ? fitLyricStack(
          persp,
          lyricMeshWorldW(currentMesh),
          lyricMeshWorldH(currentMesh),
          layoutScale,
          layoutX,
          layoutY,
          layoutTiltX,
          layoutTiltY,
          lockDistance,
          useCameraLock,
        )
      : 1;
  const fitEase = lockFit < runtime.lockFitScale ? 0.28 : 0.14;
  runtime.lockFitScale += (lockFit - runtime.lockFitScale) * fitEase;
  if (runtime.snapCameraLockFrames > 0) {
    runtime.lockFitScale = lockFit;
    runtime.snapCameraLockFrames -= 1;
  }
  // 上下浮动 / 呼吸 / 侧摆整叠一起走：Mineradio 把它们挂在承载所有行的根 mesh 上，
  // 只作用在当前行的话，播放行会自己飘出这一叠。
  const motion = lyricMotionProfile(fx);
  const floatAmp = fx.lyricVerticalFloat ? motion.floatAmp || 1 : 0;
  const breathe =
    (Math.sin(time * 0.92) * 0.05 + Math.sin(time * 0.41) * 0.028) * floatAmp;
  // 地形预设不锁镜头，推拉相机时这一叠歌词自然跟着地形一起缩放（Mineradio 世界锚定）
  const rootScale = layoutScale * runtime.lockFitScale * (1 + breathe);
  stageRoot.scale.setScalar(rootScale);

  // 浮动幅度按根缩放走，歌词缩小时不该还在原地大幅晃
  const floatY =
    (Math.sin(time * 0.55) * 0.046 + Math.sin(time * 1.35) * 0.012) * floatAmp * rootScale;
  const floatZ = Math.cos(time * 0.48) * 0.07 * floatAmp * rootScale;
  // stageRoot 与地形共处同一台相机下，位置只受歌词自身的布局偏移影响。
  stageRoot.position.set(layoutX, layoutY + floatY, layoutZ + floatZ);
  const rollAmp =
    motion.style === 'smooth' ? 0.006 : motion.style === 'float' ? 0.026 : 0.018;
  lyricTiltEuler.set(
    (layoutTiltX || 0) * (Math.PI / 180),
    (layoutTiltY || 0) * (Math.PI / 180),
    Math.sin(time * 0.34) * rollAmp,
    'YXZ',
  );
  stageRoot.quaternion.setFromEuler(lyricTiltEuler);

  if (currentMesh) {
    tickLyricMesh(currentMesh, dt, time, bands, runtime, fx, lyricGlowStrength, glowDrive, spatialAnchor);
  } else if (stageRoot.userData.starRiverMat) {
    stageRoot.userData.starRiverMat.uniforms.uOpacity.value = 0;
  }
}

export function snapStageLyricCameraLock(runtime: StageLyricsRuntime): void {
  runtime.snapCameraLockFrames = 3;
}
