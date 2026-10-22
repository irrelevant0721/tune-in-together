import { Volume2, VolumeX } from 'lucide-react';
import { useRef } from 'react';
import { useAudioStore } from '../stores/audioStore';

export default function FriendsVolume() {
  const volume = useAudioStore((s) => s.volume);
  const setVolume = useAudioStore((s) => s.setVolume);
  const previous = useRef(volume || 1);
  return <div className="friends-volume"><button type="button" aria-label={volume ? '静音' : '取消静音'} onClick={() => { if (volume) { previous.current = volume; setVolume(0); } else setVolume(previous.current); }}>{volume ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><input type="range" aria-label="音量" min={0} max={100} step={1} value={Math.round(volume * 100)} onChange={(e) => setVolume(Number(e.target.value) / 100)} /><span>{Math.round(volume * 100)}%</span></div>;
}
