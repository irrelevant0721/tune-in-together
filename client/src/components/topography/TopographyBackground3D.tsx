import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import type { QueueItem } from '../../types';
import GalaxyBeatMapDriver from '../galaxy/GalaxyBeatMapDriver';
import GalaxyGestureSceneBridge from '../galaxy/GalaxyGestureSceneBridge';
import GalaxyOrbitControls from '../galaxy/GalaxyOrbitControls';
import GalaxyParticles from '../galaxy/GalaxyParticles';
import GestureHudOverlay from '../galaxy/GestureHudOverlay';
import TopographyAudioDriver from './TopographyAudioDriver';
import TopographyCameraRig, { TOPOGRAPHY_ORBIT_BASELINE } from './TopographyCameraRig';
import TopographyMapScene from './TopographyMapScene';
import { useVisualRenderPolicy } from '../../hooks/useVisualRenderPolicy';
import VisualFrameScheduler from '../visual/VisualFrameScheduler';

interface Props {
  className?: string;
  coverUrl?: string | null;
  isPlaying: boolean;
  song?: Pick<QueueItem, 'queueId' | 'id' | 'source' | 'url'> | null;
  transparentBg?: boolean;
}

export default function TopographyBackground3D({
  className = 'absolute inset-0',
  coverUrl,
  isPlaying,
  song,
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
      {/* 地形、歌词、歌单架同处一台相机下，滚轮推拉时三者一起缩放（对齐 Mineradio） */}
      <Canvas
        key={transparentBg ? 'topo-fx-alpha' : 'topo-fx-opaque'}
        className="!absolute inset-0 h-full w-full"
        // 背景层整体 pointer-events:none，画布要自己开回来才收得到滚轮/拖拽
        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'auto' }}
        dpr={[1, 1.5]}
        frameloop={renderPolicy.frameloop}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        camera={{ fov: 45, near: 0.1, far: 200, position: [0, 1.1, TOPOGRAPHY_ORBIT_BASELINE.radius] }}
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
          <TopographyAudioDriver />
          <GalaxyOrbitControls preset={6} />
          <TopographyCameraRig />
          <TopographyMapScene />
          {/* Mineradio 的 SONIC 预设保留主粒子层当星河（backgroundStarRiverTargetAlpha 对
              SONIC_PRESET_INDEX 返回 0），歌词/歌单架也挂在这一组下面跟着拖拽旋转 */}
          <GalaxyParticles
            coverUrl={coverUrl}
            preset={6}
            isPlaying={isPlaying}
            spatialAnchor="topography"
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
