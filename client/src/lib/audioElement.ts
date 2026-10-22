import { configureInlineAudio } from './audioUnlock';
import { useAudioStore } from '../stores/audioStore';
import { getAudioController } from './audioController';
import { clearAudioQueueBinding } from './audioTrackBinding';
import { resetGalaxyAudioWireIfLoaded } from './galaxyAudioBridge';

let sharedAudio: HTMLAudioElement | null = null;
let loudnessMultiplier = 1;
let output: { audio: HTMLAudioElement; context: AudioContext; source: MediaElementAudioSourceNode; gain: GainNode } | null = null;

/** 通知 useAudioPlayer：共享 audio 已替换，需重新绑定事件 */
export let sharedAudioGeneration = 0;

export function applyAudioVolume(volume: number): void {
  const audio = sharedAudio;
  if (!audio) return;
  const userVolume = Math.min(1, Math.max(0, volume));
  audio.volume = output?.audio === audio ? userVolume : Math.min(1, userVolume * loudnessMultiplier);
}

export function hasSharedAudioOutput(): boolean {
  return output?.audio === sharedAudio;
}

export function resumeSharedAudioOutput(): void {
  if (output?.audio === sharedAudio && output.context.state !== 'running') {
    void output.context.resume();
  }
}

export function getSharedAudioOutputSource(): { context: AudioContext; source: MediaElementAudioSourceNode } | null {
  const audio = getSharedAudio();
  if (output?.audio === audio) return output;
  if (typeof AudioContext === 'undefined') return null;
  let context: AudioContext;
  try {
    context = new AudioContext();
  } catch {
    return null;
  }
  try {
    const gain = context.createGain();
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    gain.connect(limiter);
    limiter.connect(context.destination);
    const source = context.createMediaElementSource(audio);
    source.connect(gain);
    output = { audio, context, source, gain };
    gain.gain.value = loudnessMultiplier;
    applyAudioVolume(useAudioStore.getState().volume);
    audio.addEventListener('play', resumeSharedAudioOutput);
    audio.addEventListener('playing', resumeSharedAudioOutput);
    return output;
  } catch {
    void context.close();
    return null;
  }
}

export function applyTrackLoudness(
  loudness?: { gain?: number; peak?: number; lra?: number } | null,
): void {
  const gain = Number(loudness?.gain);
  const safeGainDb = Number.isFinite(gain) ? Math.min(12, Math.max(-24, gain)) : 0;
  const gainMultiplier = 10 ** (safeGainDb / 20);
  loudnessMultiplier = gainMultiplier;
  if (output?.audio === sharedAudio) output.gain.gain.value = loudnessMultiplier;
  applyAudioVolume(useAudioStore.getState().volume);
}

function closeSharedAudioOutput(): void {
  if (!output) return;
  void output.context.close();
  output = null;
}

export function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    configureInlineAudio(sharedAudio);
    applyAudioVolume(useAudioStore.getState().volume);
  }
  return sharedAudio;
}

/**
 * 释放 Web Audio 劫持并重建共享 audio 元素。
 * 在离开房间或从频谱/代理模式切回直链播放时必须调用，否则可能永久无声。
 */
export function resetSharedAudioElement(): HTMLAudioElement {
  getAudioController().clearQueue();
  return replaceSharedAudioElement();
}

export function replaceSharedAudioElement(): HTMLAudioElement {
  if (sharedAudio) {
    sharedAudio.pause();
    clearAudioQueueBinding(sharedAudio);
  }
  resetGalaxyAudioWireIfLoaded();
  closeSharedAudioOutput();
  sharedAudio = new Audio();
  sharedAudioGeneration += 1;
  configureInlineAudio(sharedAudio);
  applyAudioVolume(useAudioStore.getState().volume);
  return sharedAudio;
}

export function stopSharedAudio(): void {
  getAudioController().clearQueue();
  if (sharedAudio) {
    sharedAudio.pause();
    clearAudioQueueBinding(sharedAudio);
  }
  resetGalaxyAudioWireIfLoaded();
  closeSharedAudioOutput();
  loudnessMultiplier = 1;
  sharedAudio = null;
  sharedAudioGeneration += 1;
}
