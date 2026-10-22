import * as THREE from 'three';
import type { RoomVisualPresetId } from '../../../lib/roomVisualPreset';
import type { BeatCameraKick } from './galaxyCinema';

const BASE_FOV = 45;
/** 相机中心的默认落点，只读不改 */
const ORBIT_ORIGIN = new THREE.Vector3(0, 0, 0);

export const GALAXY_PRESET_CAMERA: Record<
  RoomVisualPresetId,
  { radius: number; phi: number; theta: number }
> = {
  0: { radius: 6.6, phi: 0.08, theta: 0 },
  1: { radius: 6.2, phi: 0.03, theta: 0 },
  2: { radius: 7.0, phi: 0.15, theta: 0 },
  3: { radius: 8.0, phi: 0.05, theta: 0 },
  4: { radius: 6.5, phi: 0.04, theta: 0 },
  5: { radius: 6.6, phi: 0.08, theta: 0 },
  6: { radius: 7.4, phi: 0.1, theta: 0.18 },
};

function clampRange(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export type GalaxyOrbitState = {
  userTheta: number;
  userPhi: number;
  userRadius: number;
  cineTheta: number;
  cinePhi: number;
  cineRadius: number;
  theta: number;
  phi: number;
  radius: number;
  baselineTheta: number;
  baselinePhi: number;
  baselineRadius: number;
  minPhi: number;
  maxPhi: number;
  minRadius: number;
  maxRadius: number;
  rotating: boolean;
  last: { x: number; y: number };
  recentering: boolean;
  centerLocked: boolean;
  lookAt: THREE.Vector3;
  focusZone: {
    /** 退出时 type 先留着，好让歌单架继续用「镜头退出速度」滑回去（Mineradio orbit.focus.type） */
    type: 'none' | 'queue' | 'cardHover';
    active: boolean;
    theta: number;
    phi: number;
    radius: number;
    lookAt: THREE.Vector3;
    /** 仅歌单架用：进/出镜头速度倍率，乘在基础缓动上 */
    speed: number;
  };
};

export function createGalaxyOrbitState(
  preset: RoomVisualPresetId = 0,
): GalaxyOrbitState {
  const base = GALAXY_PRESET_CAMERA[preset];
  return {
    userTheta: base.theta,
    userPhi: base.phi,
    userRadius: base.radius,
    cineTheta: 0,
    cinePhi: 0,
    cineRadius: 0,
    theta: base.theta,
    phi: base.phi,
    radius: base.radius,
    baselineTheta: base.theta,
    baselinePhi: base.phi,
    baselineRadius: base.radius,
    minPhi: -Math.PI * 0.45,
    maxPhi: Math.PI * 0.45,
    minRadius: 2.4,
    maxRadius: 14.0,
    rotating: false,
    last: { x: 0, y: 0 },
    recentering: false,
    centerLocked: false,
    lookAt: new THREE.Vector3(0, 0, 0),
    focusZone: {
      type: 'none',
      active: false,
      theta: base.theta,
      phi: base.phi,
      radius: base.radius,
      lookAt: new THREE.Vector3(0, 0, 0),
      speed: 1,
    },
  };
}

export function setGalaxyOrbitPreset(orbit: GalaxyOrbitState, preset: RoomVisualPresetId): void {
  if (preset === 5) return;
  const base = GALAXY_PRESET_CAMERA[preset];
  orbit.userTheta = base.theta;
  orbit.userPhi = base.phi;
  orbit.userRadius = base.radius;
  orbit.baselineTheta = base.theta;
  orbit.baselinePhi = base.phi;
  orbit.baselineRadius = base.radius;
}

export function unlockGalaxyOrbitCenter(orbit: GalaxyOrbitState): void {
  orbit.centerLocked = false;
}

export function recenterGalaxyOrbit(orbit: GalaxyOrbitState): void {
  orbit.centerLocked = true;
  orbit.recentering = true;
}

export function setGalaxyOrbitFocusZone(
  orbit: GalaxyOrbitState,
  type: GalaxyOrbitState['focusZone']['type'],
  config?: Partial<Omit<GalaxyOrbitState['focusZone'], 'type' | 'active'>>,
): void {
  if (type === 'none') {
    // 只熄灭 active：type 留到镜头真的滑回原位再清，否则退出这一段拿不到退出速度
    orbit.focusZone.active = false;
    if (config?.speed !== undefined) orbit.focusZone.speed = config.speed;
    return;
  }
  orbit.focusZone.type = type;
  orbit.focusZone.active = true;
  if (config?.theta !== undefined) orbit.focusZone.theta = config.theta;
  if (config?.phi !== undefined) orbit.focusZone.phi = config.phi;
  if (config?.radius !== undefined) orbit.focusZone.radius = config.radius;
  if (config?.lookAt) orbit.focusZone.lookAt.copy(config.lookAt);
  if (config?.speed !== undefined) orbit.focusZone.speed = config.speed;
}

/** Mineradio updateCinema → orbit.cine* */
export function applyGalaxyOrbitCinema(
  orbit: GalaxyOrbitState,
  cinemaT: number,
  kick: BeatCameraKick,
  cinemaShake: number,
): void {
  const shake = clampRange(cinemaShake, 0, 1.8);
  const beatDamp = orbit.focusZone.active ? 0.55 * shake : shake;
  const idleDamp = (orbit.rotating ? 0.25 : 1) * shake;
  orbit.cineTheta = Math.sin(cinemaT * 0.08) * 0.012 * idleDamp + kick.thetaKick * beatDamp;
  orbit.cinePhi = Math.sin(cinemaT * 0.06 + 1.0) * 0.01 * idleDamp + kick.phiKick * beatDamp;
  orbit.cineRadius =
    Math.sin(cinemaT * 0.04 + 2.0) * 0.08 * idleDamp - kick.radiusKick * beatDamp * 1.18;
}

/** Mineradio updateCamera（不含 freeCamera / shelf focus） */
export function updateGalaxyOrbitCamera(
  camera: THREE.PerspectiveCamera,
  orbit: GalaxyOrbitState,
  kick: BeatCameraKick,
  cinemaShake: number,
  cameraDistanceMul = 1,
): void {
  if (orbit.recentering) {
    orbit.userTheta += (orbit.baselineTheta - orbit.userTheta) * 0.04;
    orbit.userPhi += (orbit.baselinePhi - orbit.userPhi) * 0.04;
    orbit.userRadius += (orbit.baselineRadius - orbit.userRadius) * 0.04;
    if (
      Math.abs(orbit.userTheta - orbit.baselineTheta) < 0.005 &&
      Math.abs(orbit.userPhi - orbit.baselinePhi) < 0.005 &&
      Math.abs(orbit.userRadius - orbit.baselineRadius) < 0.05
    ) {
      orbit.userTheta = orbit.baselineTheta;
      orbit.userPhi = orbit.baselinePhi;
      orbit.userRadius = orbit.baselineRadius;
      orbit.recentering = false;
    }
  }

  let targetTheta: number;
  let targetPhi: number;
  let targetRadius: number;
  // 非聚焦状态一律回原点（Mineradio ZERO_VEC）。之前这里退回 orbit.lookAt 自己，
  // 等于永远插值到当前值，歌单架跟拍偏出去的中心点就再也回不来了。
  let tLookAt = ORBIT_ORIGIN;

  if (orbit.focusZone.active) {
    targetTheta = orbit.focusZone.theta;
    targetPhi = clampRange(orbit.focusZone.phi, orbit.minPhi, orbit.maxPhi);
    targetRadius = clampRange(orbit.focusZone.radius, orbit.minRadius, orbit.maxRadius);
    tLookAt = orbit.focusZone.lookAt;
  } else if (orbit.centerLocked) {
    targetTheta = orbit.baselineTheta + orbit.cineTheta;
    targetPhi = clampRange(orbit.baselinePhi + orbit.cinePhi, orbit.minPhi, orbit.maxPhi);
    targetRadius = clampRange(
      orbit.baselineRadius * cameraDistanceMul + orbit.cineRadius,
      orbit.minRadius,
      orbit.maxRadius,
    );
  } else {
    targetTheta = orbit.userTheta + orbit.cineTheta;
    targetPhi = clampRange(orbit.userPhi + orbit.cinePhi, orbit.minPhi, orbit.maxPhi);
    targetRadius = clampRange(
      orbit.userRadius * cameraDistanceMul + orbit.cineRadius,
      orbit.minRadius,
      orbit.maxRadius,
    );
  }

  // Mineradio：线性 lerp 自带「快→慢」的缓出，聚焦时略快、回位时略慢
  const focused = orbit.focusZone.active;
  let focusEase = focused ? 0.16 : 0.1;
  let radiusEase = focused ? 0.12 : 0.07;
  if (kick.punch > 0.01) {
    focusEase = Math.max(focusEase, 0.12 + kick.punch * 0.12);
    radiusEase = Math.max(radiusEase, 0.09 + kick.punch * 0.12);
  }
  // 歌单架的进/出速度是倍率，不是缓动本身：0.24 档要把 0.16 压到 0.038 才是 Mineradio 那种慢慢贴近
  const shelfFocus = orbit.focusZone.type === 'cardHover';
  if (shelfFocus) {
    const speed = orbit.focusZone.speed || 1;
    focusEase = clampRange(focusEase * speed, 0.018, 0.42);
    radiusEase = clampRange(radiusEase * speed, 0.014, 0.36);
  }

  orbit.theta += (targetTheta - orbit.theta) * focusEase;
  orbit.phi += (targetPhi - orbit.phi) * focusEase;
  orbit.radius += (targetRadius - orbit.radius) * radiusEase;
  orbit.lookAt.x += (tLookAt.x - orbit.lookAt.x) * focusEase;
  orbit.lookAt.y += (tLookAt.y - orbit.lookAt.y) * focusEase;
  orbit.lookAt.z += (tLookAt.z - orbit.lookAt.z) * focusEase;

  // 滑回原位后再把 type 清掉，之后的常规运镜就不该再被歌单架速度拖慢
  if (shelfFocus && !focused) {
    const lookDx = tLookAt.x - orbit.lookAt.x;
    const lookDy = tLookAt.y - orbit.lookAt.y;
    const lookDz = tLookAt.z - orbit.lookAt.z;
    if (
      Math.abs(targetTheta - orbit.theta) < 0.003 &&
      Math.abs(targetPhi - orbit.phi) < 0.003 &&
      Math.abs(targetRadius - orbit.radius) < 0.03 &&
      lookDx * lookDx + lookDy * lookDy + lookDz * lookDz < 0.0009
    ) {
      orbit.focusZone.type = 'none';
    }
  }

  const cy = Math.cos(orbit.phi);
  const sy = Math.sin(orbit.phi);
  const ct = Math.cos(orbit.theta);
  const st = Math.sin(orbit.theta);
  camera.position.set(
    orbit.lookAt.x + orbit.radius * cy * st,
    orbit.lookAt.y + orbit.radius * sy,
    orbit.lookAt.z + orbit.radius * cy * ct,
  );
  camera.lookAt(orbit.lookAt);
  camera.rotation.z += kick.rollKick * clampRange(cinemaShake, 0, 1.8);

  const shake = clampRange(cinemaShake, 0, 1.8);
  const cameraPunch = (kick.punch * 0.54 + kick.radiusKick * 0.16) * shake;
  const targetFov = BASE_FOV - cameraPunch * 2.35;
  const fovEase = targetFov < camera.fov ? 0.24 : 0.12;
  camera.fov += (targetFov - camera.fov) * fovEase;
  camera.updateProjectionMatrix();
}

export function zoomGalaxyOrbit(orbit: GalaxyOrbitState, deltaY: number): void {
  orbit.userRadius = clampRange(
    orbit.userRadius + deltaY * 0.005,
    orbit.minRadius,
    orbit.maxRadius,
  );
  if (orbit.recentering) orbit.recentering = false;
}

export const galaxyOrbitRef: { current: GalaxyOrbitState } = {
  current: createGalaxyOrbitState(0),
};
