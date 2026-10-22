const BUCKET_LABELS = ['0-50ms', '50-100ms', '100-200ms', '200-500ms', '500+ms'] as const;
const BUCKET_MAX_MS = [50, 100, 200, 500, Number.POSITIVE_INFINITY];

const counts = [0, 0, 0, 0, 0];
let totalSamples = 0;

function bucketIndex(absMs: number): number {
  for (let i = 0; i < BUCKET_MAX_MS.length; i += 1) {
    if (absMs < BUCKET_MAX_MS[i]) return i;
  }
  return BUCKET_MAX_MS.length - 1;
}

/** 记录一次 applyFollowerSync 的 target - audio 偏差（秒） */
export function recordDriftSample(diffSec: number): void {
  if (!Number.isFinite(diffSec)) return;
  const absMs = Math.abs(diffSec) * 1000;
  counts[bucketIndex(absMs)] += 1;
  totalSamples += 1;
}

export function getDriftHistogramTotal(): number {
  return totalSamples;
}

export function resetDriftHistogram(): void {
  for (let i = 0; i < counts.length; i += 1) counts[i] = 0;
  totalSamples = 0;
}

/** 文本直方图，便于整段复制 */
export function formatDriftHistogram(): string {
  if (totalSamples === 0) {
    return 'drift_histogram total=0 (no samples yet)';
  }
  const max = Math.max(...counts, 1);
  const barWidth = 20;
  const lines = [`drift_histogram total=${totalSamples}`];
  for (let i = 0; i < BUCKET_LABELS.length; i += 1) {
    const n = counts[i];
    const filled = Math.round((n / max) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    lines.push(`${BUCKET_LABELS[i].padEnd(10)} ${bar} ${n}`);
  }
  return lines.join('\n');
}
