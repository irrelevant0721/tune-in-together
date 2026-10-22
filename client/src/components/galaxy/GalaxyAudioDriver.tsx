import { useFrame } from '@react-three/fiber';
import { roomVisualFxLive } from '../../lib/roomVisualFxLive';
import type { RoomVisualPresetId } from '../../lib/roomVisualPreset';
import { readGalaxyAudioBands } from './lib/galaxyAudio';

interface Props {
  preset: RoomVisualPresetId;
}

/** 每帧统一推进音频分析/节拍调度（须在 Particles、CameraRig 之前执行） */
export default function GalaxyAudioDriver({ preset }: Props) {
  useFrame((_, delta) => {
    const fx = roomVisualFxLive.current;
    readGalaxyAudioBands(delta, { preset, intensity: fx.intensity });
  }, -1);

  return null;
}
