import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import type { RoomVisualPresetId } from '../../lib/roomVisualPreset';
import GalaxyBeatMapDriver from './GalaxyBeatMapDriver';
import GalaxyAudioDriver from './GalaxyAudioDriver';
import GalaxyCameraRig from './GalaxyCameraRig';
import GalaxyOrbitControls from './GalaxyOrbitControls';
import GalaxyParticles from './GalaxyParticles';
import GalaxyGestureSceneBridge from './GalaxyGestureSceneBridge';
import GestureHudOverlay from './GestureHudOverlay';
import type { QueueItem } from '../../types';
import { useVisualRenderPolicy } from '../../hooks/useVisualRenderPolicy';
import VisualFrameScheduler from '../visual/VisualFrameScheduler';

interface Props {
  className?: string;
  coverUrl?: string | null;
  preset: RoomVisualPresetId;
  isPlaying: boolean;
  song?: Pick<QueueItem, 'queueId' | 'id' | 'source' | 'url'> | null;
  immersivePanelFocus?: 'search' | 'queue' | 'chat' | null;
  /** 本机背景媒体开启时透明清屏，让图片/视频透出来 */
  transparentBg?: boolean;
}

export default function GalaxyBackground3D({
  className = 'absolute inset-0',
  coverUrl,
  preset,
  isPlaying,
  song,
  immersivePanelFocus = null,
  transparentBg = false,
}: Props) {
  const renderPolicy = useVisualRenderPolicy(isPlaying);
  if (!renderPolicy.mounted) return null;
  return (
    <div
      className={`${className} overflow-hidden${transparentBg ? '' : ' bg-[#08090b]'}`}
      aria-hidden
    >
      <GestureHudOverlay />
      <Canvas
        key={transparentBg ? 'galaxy-fx-alpha' : 'galaxy-fx-opaque'}
        className="!absolute inset-0 h-full w-full"
        // 背景层整体 pointer-events:none，画布要自己开回来才收得到滚轮/拖拽
        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'auto' }}
        dpr={[1, 1.5]}
        frameloop={renderPolicy.frameloop}
        gl={{
          alpha: transparentBg,
          antialias: typeof window !== 'undefined' && window.devicePixelRatio > 1.25,
          powerPreference: 'high-performance',
        }}
        camera={{ fov: 45, near: 0.1, far: 200, position: [0, 3.1, 7.7] }}
        onCreated={({ gl, scene, camera }) => {
          if (transparentBg) gl.setClearColor(0x000000, 0);
          else gl.setClearColor('#08090b', 1);
          gl.compile(scene, camera);
        }}
      >
        {transparentBg ? null : <color attach="background" args={['#08090b']} />}
        <Suspense fallback={null}>
          <VisualFrameScheduler fps={renderPolicy.targetFps} />
          <GalaxyBeatMapDriver song={song} isPlaying={isPlaying} />
          <GalaxyGestureSceneBridge />
          <GalaxyAudioDriver preset={preset} />
          <GalaxyOrbitControls preset={preset} />
          <GalaxyCameraRig preset={preset} immersivePanelFocus={immersivePanelFocus} />
          <GalaxyParticles coverUrl={coverUrl} preset={preset} isPlaying={isPlaying} />
        </Suspense>
      </Canvas>
    </div>
  );
}
