import { useEffect, useRef } from 'react';

import { useFrame, useThree } from '@react-three/fiber';

import * as THREE from 'three';

import type { RoomVisualPresetId } from '../../lib/roomVisualPreset';

import { roomVisualFxLive } from '../../lib/roomVisualFxLive';

import { resumeGalaxyAudioContext } from './lib/galaxyAudio';

import { tickGalaxyCinema } from './lib/galaxyCinema';

import {
  applyGalaxyOrbitCinema,
  setGalaxyOrbitFocusZone,
  setGalaxyOrbitPreset,
  updateGalaxyOrbitCamera,
} from './lib/galaxyOrbit';

import { galaxyOrbitRef } from './lib/galaxyOrbit';

interface Props {
  preset: RoomVisualPresetId;
  immersivePanelFocus?: 'search' | 'queue' | 'chat' | null;
}

export default function GalaxyCameraRig({ preset, immersivePanelFocus = null }: Props) {
  const { camera } = useThree();
  const cinemaTRef = useRef(0);
  const persp = camera as THREE.PerspectiveCamera;

  useEffect(() => {
    setGalaxyOrbitPreset(galaxyOrbitRef.current, preset);
  }, [preset]);

  useEffect(() => {
    const orbit = galaxyOrbitRef.current;
    // Mineradio 只给左侧队列面板配了跟拍（activateFocusZone 里就 queue 一个非歌单架分支），
    // 搜索 / 聊天原本不动镜头，之前多加的两个 zone 会让每次开抽屉都把相机拽走。
    if (immersivePanelFocus === 'queue') {
      setGalaxyOrbitFocusZone(orbit, 'queue', {
        theta: 0.4,
        phi: 0.05,
        radius: 5.8,
        lookAt: new THREE.Vector3(-1.2, 0, 0),
      });
    } else {
      setGalaxyOrbitFocusZone(orbit, 'none');
    }
  }, [immersivePanelFocus]);

  useFrame((_state, rawDelta) => {
    // 切歌时封面重建会吃掉一整帧，cinema 时间按原 delta 推进会让镜头直接跳一段
    const delta = Math.min(rawDelta, 1 / 20);
    const fx = roomVisualFxLive.current;
    const orbit = galaxyOrbitRef.current;
    cinemaTRef.current += delta;

    resumeGalaxyAudioContext();
    const kick = tickGalaxyCinema(delta);
    applyGalaxyOrbitCinema(orbit, cinemaTRef.current, kick, fx.cinema ? fx.cinemaShake : 0);

    // 地形（preset 6）现在走 TopographyCameraRig，这里不再有它的固定机位分支
    updateGalaxyOrbitCamera(persp, orbit, kick, fx.cinema ? fx.cinemaShake : 0, fx.cameraDistance);
  });

  return null;
}
