import { useEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import {
  getParticleRootGroup,
  registerParticleRootGroup,
  syncParticleGroupRotation,
} from '../galaxy/lib/galaxyGestureRotation';
import { galaxyOrbitRef } from '../galaxy/lib/galaxyOrbit';

/**
 * 对应 Mineradio 主场景里的 particles 组：歌词、歌单架、星河都挂在这里，
 * 拖拽旋转作用在它身上，地形则复制它的 rotation（bindVisualRotation）。
 */
export default function TopographyVisualRoot({ children }: { children: ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const group = groupRef.current;
    registerParticleRootGroup(group);
    // 切预设时新画布可能先挂载，别把别人刚注册的组清掉
    return () => {
      if (getParticleRootGroup() === group) registerParticleRootGroup(null);
    };
  }, []);

  useFrame((_state, rawDelta) => {
    syncParticleGroupRotation(Math.min(rawDelta, 1 / 20), galaxyOrbitRef.current.centerLocked);
  });

  return <group ref={groupRef}>{children}</group>;
}
