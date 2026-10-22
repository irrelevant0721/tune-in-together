/** Mineradio gestureRotation / particleSpin — 拖拽旋转粒子层 */

import type * as THREE from 'three';
import { galaxyOrbitRef, recenterGalaxyOrbit } from './galaxyOrbit';

const PARTICLE_POINTER_SPIN_X = 0.0032;
const PARTICLE_POINTER_SPIN_Y = 0.0034;
const PARTICLE_SPIN_MAX = 6.2;
const PARTICLE_SPIN_DAMPING = 0.9;

export const gestureRotation = { x: 0, y: 0 };

export const particleSpin = { vx: 0, vy: 0 };

export const particlePointerSpin = {
  active: false,
  lastX: 0,
  lastY: 0,
  lastT: 0,
};

export const galaxyPointerField = {
  active: false,
  x: -999,
  y: -999,
};

export function releaseGalaxyPointerInteraction(): void {
  galaxyOrbitRef.current.rotating = false;
  particlePointerSpin.active = false;
  particleSpin.vx = 0;
  particleSpin.vy = 0;
}

export function setGalaxyPointerField(active: boolean, x: number, y: number): void {
  galaxyPointerField.active = active;
  galaxyPointerField.x = x;
  galaxyPointerField.y = y;
}

function clampParticleSpinVelocity(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-PARTICLE_SPIN_MAX, Math.min(PARTICLE_SPIN_MAX, v));
}

export function applyParticleSpinDrag(dx: number, dy: number, dt: number): void {
  const rx = dy * PARTICLE_POINTER_SPIN_X;
  const ry = dx * PARTICLE_POINTER_SPIN_Y;
  gestureRotation.x += rx;
  gestureRotation.y += ry;
  if (dt > 0) {
    particleSpin.vx = clampParticleSpinVelocity(rx / dt * 0.46);
    particleSpin.vy = clampParticleSpinVelocity(ry / dt * 0.46);
  }
}

export function resetParticleRotationTarget(syncVisual = false): void {
  gestureRotation.x = 0;
  gestureRotation.y = 0;
  particleSpin.vx = 0;
  particleSpin.vy = 0;
  particlePointerSpin.active = false;
  if (syncVisual && particleRootGroup) {
    particleRootGroup.rotation.set(0, 0, 0);
  }
}

/** Mineradio recenterCamera — 镜头回正并清空拖拽旋转残留 */
export function recenterGalaxyView(): void {
  recenterGalaxyOrbit(galaxyOrbitRef.current);
  resetParticleRotationTarget(true);
}

let particleRootGroup: THREE.Object3D | null = null;

export function registerParticleRootGroup(group: THREE.Object3D | null): void {
  particleRootGroup = group;
}

export function getParticleRootGroup(): THREE.Object3D | null {
  return particleRootGroup;
}

function rebaseParticleRotationAxis(axis: 'x' | 'y'): void {
  const limit = Math.PI * 10;
  if (Math.abs(gestureRotation[axis]) < limit) return;
  const offset = Math.round(gestureRotation[axis] / (Math.PI * 2)) * Math.PI * 2;
  gestureRotation[axis] -= offset;
  if (particleRootGroup) particleRootGroup.rotation[axis] -= offset;
}

function rebaseParticleRotationIfNeeded(): void {
  rebaseParticleRotationAxis('x');
  rebaseParticleRotationAxis('y');
}

/** Mineradio tickGestureRotation */
export function tickGestureRotation(dt: number): void {
  if (Math.abs(particleSpin.vx) > 0.0001 || Math.abs(particleSpin.vy) > 0.0001) {
    const rx = particleSpin.vx * dt;
    const ry = particleSpin.vy * dt;
    gestureRotation.x += rx;
    gestureRotation.y += ry;
    rebaseParticleRotationIfNeeded();
  }
  particleSpin.vx *= Math.pow(PARTICLE_SPIN_DAMPING, dt * 60);
  particleSpin.vy *= Math.pow(PARTICLE_SPIN_DAMPING, dt * 60);
  if (Math.abs(particleSpin.vx) < 0.01) particleSpin.vx = 0;
  if (Math.abs(particleSpin.vy) < 0.01) particleSpin.vy = 0;
}

/** Mineradio 主循环：粒子组 rotation 跟随 gestureRotation */
export function syncParticleGroupRotation(dt: number, centerLocked = false): void {
  if (!particleRootGroup) return;
  tickGestureRotation(dt);
  const targetRotY = centerLocked ? 0 : gestureRotation.y;
  const targetRotX = centerLocked ? 0 : gestureRotation.x;
  particleRootGroup.rotation.y += (targetRotY - particleRootGroup.rotation.y) * 0.055;
  particleRootGroup.rotation.x += (targetRotX - particleRootGroup.rotation.x) * 0.055;
}
