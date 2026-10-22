import { applyAudioVolume } from './audioElement';
import { applyPreviewVolume } from './songPreviewPlayer';
import { applyChatCardVolume } from './chatCardPlayer';

export function applyAllAudioVolume(volume: number): void {
  const clamped = Math.min(1, Math.max(0, volume));
  applyAudioVolume(clamped);
  applyPreviewVolume(clamped);
  applyChatCardVolume(clamped);
}
