import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import {
  applyParticleSpinDrag,
  particlePointerSpin,
  particleSpin,
  recenterGalaxyView,
  resetParticleRotationTarget,
} from './lib/galaxyGestureRotation';
import {
  clearGalaxyParticlePointer,
  deactivateGalaxyParticlePointer,
  isGalaxyPointerOverUi,
  queueGalaxyParticlePointer,
} from './lib/galaxyParticlePointer';
import {
  galaxyOrbitRef,
  unlockGalaxyOrbitCenter,
  zoomGalaxyOrbit,
} from './lib/galaxyOrbit';
const CLICK_THRESHOLD = 6;

interface Props {
  preset: import('../../lib/roomVisualPreset').RoomVisualPresetId;
}

/** Mineradio 指针拖拽旋转粒子 + 滚轮缩放 + 双击回正 */
export default function GalaxyOrbitControls({ preset }: Props) {
  const { gl } = useThree();
  const presetRef = useRef(preset);
  const mouseDownAt = useRef({ x: 0, y: 0, hadDrag: false });

  useEffect(() => {
    presetRef.current = preset;
  }, [preset]);

  useEffect(() => {
    const canvas = gl.domElement;
    const orbit = galaxyOrbitRef.current;

    const beginDrag = (e: PointerEvent) => {
      if (e.button === 2) return;
      if (isGalaxyPointerOverUi(e.clientX, e.clientY)) return;
      orbit.rotating = true;
      orbit.last.x = e.clientX;
      orbit.last.y = e.clientY;
      particlePointerSpin.active = true;
      particlePointerSpin.lastX = e.clientX;
      particlePointerSpin.lastY = e.clientY;
      particlePointerSpin.lastT = performance.now();
      particleSpin.vx = 0;
      particleSpin.vy = 0;
      mouseDownAt.current = { x: e.clientX, y: e.clientY, hadDrag: false };
      const wasLocked = orbit.centerLocked;
      unlockGalaxyOrbitCenter(orbit);
      if (wasLocked) resetParticleRotationTarget(true);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isGalaxyPointerOverUi(e.clientX, e.clientY) && !orbit.rotating) {
        deactivateGalaxyParticlePointer();
        return;
      }
      if (orbit.rotating) {
        const dx = e.clientX - orbit.last.x;
        const dy = e.clientY - orbit.last.y;
        if (particlePointerSpin.active) {
          const nowSpin = performance.now();
          const spinDt = Math.max(
            1 / 120,
            Math.min(0.08, (nowSpin - particlePointerSpin.lastT) / 1000 || 1 / 60),
          );
          applyParticleSpinDrag(dx, dy, spinDt);
          particlePointerSpin.lastX = e.clientX;
          particlePointerSpin.lastY = e.clientY;
          particlePointerSpin.lastT = nowSpin;
        }
        orbit.last.x = e.clientX;
        orbit.last.y = e.clientY;
        const totalDx = e.clientX - mouseDownAt.current.x;
        const totalDy = e.clientY - mouseDownAt.current.y;
        if (Math.sqrt(totalDx * totalDx + totalDy * totalDy) > CLICK_THRESHOLD) {
          mouseDownAt.current.hadDrag = true;
        }
        if (orbit.recentering) orbit.recentering = false;
      }
      queueGalaxyParticlePointer(e.clientX, e.clientY, canvas);
    };

    const endDrag = () => {
      orbit.rotating = false;
      particlePointerSpin.active = false;
    };

    const onPointerLeave = () => {
      endDrag();
      clearGalaxyParticlePointer();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const wasLocked = orbit.centerLocked;
      unlockGalaxyOrbitCenter(orbit);
      if (wasLocked) resetParticleRotationTarget(true);
      zoomGalaxyOrbit(orbit, e.deltaY);
    };

    const onDblClick = (e: MouseEvent) => {
      e.preventDefault();
      recenterGalaxyView();
    };

    canvas.addEventListener('pointerdown', beginDrag);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDblClick);

    return () => {
      canvas.removeEventListener('pointerdown', beginDrag);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDblClick);
    };
  }, [gl]);

  return null;
}
