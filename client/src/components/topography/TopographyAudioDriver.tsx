import { useFrame } from '@react-three/fiber';
import { roomVisualFxLive } from '../../lib/roomVisualFxLive';
import { readGalaxyAudioBands } from '../galaxy/lib/galaxyAudio';
import { topographyEngine } from './lib/topographyEngine';

/** 推进 galaxy 频谱 + sonic 八频段分析 / 节拍触发 */
export default function TopographyAudioDriver() {
  useFrame((_, delta) => {
    const fx = roomVisualFxLive.current;
    readGalaxyAudioBands(delta, { preset: 6, intensity: fx.intensity });
    topographyEngine.getAudioData();
  }, -1);

  return null;
}
