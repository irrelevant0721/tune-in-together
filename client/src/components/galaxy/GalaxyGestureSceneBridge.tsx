import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { registerGalaxyGestureCamera } from './lib/galaxyHandGesture';

/** 向手势模块注册 Three 相机（用于手掌射线投射） */
export default function GalaxyGestureSceneBridge() {
  const { camera } = useThree();
  useEffect(() => {
    registerGalaxyGestureCamera(camera);
    return () => registerGalaxyGestureCamera(null);
  }, [camera]);
  return null;
}
