export type BeatCombo = 'downbeat' | 'push' | 'drop' | 'rebound' | 'accent';

export interface BeatMapEvent {
  time: number;
  strength: number;
  confidence: number;
  impact: number;
  primary?: boolean;
  camera?: boolean;
  pulse?: boolean;
  combo?: BeatCombo;
  low: number;
  body: number;
  snap: number;
  mass?: number;
  sharpness?: number;
  index?: number;
}

export interface BeatMapPulseEvent {
  time: number;
  strength: number;
  impact: number;
  combo?: BeatCombo;
  low?: number;
  body?: number;
  snap?: number;
}

export interface BeatMap {
  kicks: number[];
  beats: BeatMapEvent[];
  pulseBeats: BeatMapPulseEvent[];
  cameraBeats: BeatMapEvent[];
  gridStep: number;
  tempoSource: 'music-tempo' | 'local-grid' | 'local' | 'onset-grid';
  duration: number;
  visualBeatCount: number;
  analyzedAt: number;
}
