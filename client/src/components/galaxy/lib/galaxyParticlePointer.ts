/** Mineradio queueParticlePointerFrame / particleLocalPointFromNdc — 鼠标射线与粒子平面求交 */

import * as THREE from 'three';
import { getParticleRootGroup, setGalaxyPointerField } from './galaxyGestureRotation';

const particlePointerFrame = { dirty: false, ndcX: 0, ndcY: 0 };
const particlePointerLocalHit = new THREE.Vector3();
const particlePointerRay = new THREE.Raycaster();
const particlePointerNdc = new THREE.Vector2();
const particlePointerPlanePoint = new THREE.Vector3();
const particlePointerPlaneNormal = new THREE.Vector3();
const particlePointerQuat = new THREE.Quaternion();
const particlePointerWorldHit = new THREE.Vector3();
const particlePointerPlane = new THREE.Plane();

const GALAXY_UI_HIT_SELECTOR = [
  '#search-results',
  '#fx-panel',
  '#fx-fab',
  '#fx-fab-hide-btn',
  '#bottom-bar',
  '.mineradio-glass-panel',
  '.mineradio-fx-panel',
  '.modal-mask',
].join(',');

export function particleLocalPointFromNdc(
  ndcX: number,
  ndcY: number,
  out: THREE.Vector3,
  camera: THREE.Camera,
): boolean {
  particlePointerNdc.set(ndcX, ndcY);
  particlePointerRay.setFromCamera(particlePointerNdc, camera);
  const particles = getParticleRootGroup();
  if (particles) {
    particles.updateMatrixWorld(true);
    particles.getWorldPosition(particlePointerPlanePoint);
    particles.getWorldQuaternion(particlePointerQuat);
    particlePointerPlaneNormal.set(0, 0, 1).applyQuaternion(particlePointerQuat).normalize();
    if (Math.abs(particlePointerPlaneNormal.dot(particlePointerRay.ray.direction)) < 0.16) return false;
    particlePointerPlane.setFromNormalAndCoplanarPoint(particlePointerPlaneNormal, particlePointerPlanePoint);
    if (particlePointerRay.ray.intersectPlane(particlePointerPlane, particlePointerWorldHit)) {
      out.copy(particlePointerWorldHit);
      particles.worldToLocal(out);
      return Number.isFinite(out.x) && Number.isFinite(out.y) && Math.abs(out.x) < 8.5 && Math.abs(out.y) < 8.5;
    }
  }
  particlePointerPlaneNormal.set(0, 0, 1);
  particlePointerPlane.set(particlePointerPlaneNormal, 0);
  if (particlePointerRay.ray.intersectPlane(particlePointerPlane, particlePointerWorldHit)) {
    out.copy(particlePointerWorldHit);
    return Number.isFinite(out.x) && Number.isFinite(out.y) && Math.abs(out.x) < 8.5 && Math.abs(out.y) < 8.5;
  }
  return false;
}

export function queueGalaxyParticlePointer(clientX: number, clientY: number, canvas: HTMLElement): void {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  particlePointerFrame.ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  particlePointerFrame.ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
  particlePointerFrame.dirty = true;
}

export function clearGalaxyParticlePointer(): void {
  particlePointerFrame.dirty = false;
  setGalaxyPointerField(false, -999, -999);
}

export function deactivateGalaxyParticlePointer(): void {
  setGalaxyPointerField(false, -999, -999);
}

export function updateGalaxyParticlePointerFrame(camera: THREE.Camera): void {
  if (!particlePointerFrame.dirty) return;
  particlePointerFrame.dirty = false;
  if (particleLocalPointFromNdc(particlePointerFrame.ndcX, particlePointerFrame.ndcY, particlePointerLocalHit, camera)) {
    setGalaxyPointerField(true, particlePointerLocalHit.x, particlePointerLocalHit.y);
  } else {
    setGalaxyPointerField(false, -999, -999);
  }
}

export function isGalaxyPointerOverUi(clientX: number, clientY: number): boolean {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el?.closest) return false;
  return !!el.closest(GALAXY_UI_HIT_SELECTOR);
}
