import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { roomVisualFxLive } from '../../lib/roomVisualFxLive';
import { resumeGalaxyAudioContext } from '../galaxy/lib/galaxyAudio';
import { tickGalaxyCinema } from '../galaxy/lib/galaxyCinema';
import {
  applyGalaxyOrbitCinema,
  galaxyOrbitRef,
  updateGalaxyOrbitCamera,
} from '../galaxy/lib/galaxyOrbit';

/**
 * Mineradio 的两套地形都跑在主场景里，跟星河共用同一台相机；
 * 推拉的是相机本身，歌词 / 歌单架 / 星空自然跟着一起缩放。
 */
export const TOPOGRAPHY_ORBIT_BASELINE = { theta: 0.16, phi: 0.14, radius: 7.6 };

interface Props {
  /** 只有真实地形需要更大的拉远余量，WE 那层地形在 iframe 里 */
  maxRadius?: number;
}

export default function TopographyCameraRig({ maxRadius = 20 }: Props) {
  const { camera } = useThree();
  const cinemaTRef = useRef(0);
  const persp = camera as THREE.PerspectiveCamera;

  useEffect(() => {
    const orbit = galaxyOrbitRef.current;
    const prevMin = orbit.minRadius;
    const prevMax = orbit.maxRadius;
    orbit.focusZone.type = 'none';
    orbit.focusZone.active = false;
    orbit.minRadius = 2.8;
    orbit.maxRadius = maxRadius;
    orbit.baselineTheta = TOPOGRAPHY_ORBIT_BASELINE.theta;
    orbit.baselinePhi = TOPOGRAPHY_ORBIT_BASELINE.phi;
    orbit.baselineRadius = TOPOGRAPHY_ORBIT_BASELINE.radius;
    orbit.userTheta = TOPOGRAPHY_ORBIT_BASELINE.theta;
    orbit.userPhi = TOPOGRAPHY_ORBIT_BASELINE.phi;
    orbit.userRadius = TOPOGRAPHY_ORBIT_BASELINE.radius;
    return () => {
      orbit.minRadius = prevMin;
      orbit.maxRadius = prevMax;
    };
  }, [maxRadius]);

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const fx = roomVisualFxLive.current;
    const orbit = galaxyOrbitRef.current;
    cinemaTRef.current += delta;
    resumeGalaxyAudioContext();
    const kick = tickGalaxyCinema(delta);
    applyGalaxyOrbitCinema(orbit, cinemaTRef.current, kick, fx.cinema ? fx.cinemaShake : 0);
    updateGalaxyOrbitCamera(persp, orbit, kick, fx.cinema ? fx.cinemaShake : 0, fx.cameraDistance);
  });

  return null;
}
