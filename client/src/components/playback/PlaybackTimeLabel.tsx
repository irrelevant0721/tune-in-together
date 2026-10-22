import { memo } from 'react';
import { formatDuration } from '../../api/music';
import type { QueueItem, Song } from '../../types';
import { useSmoothPlaybackTime } from '../../hooks/useSmoothPlaybackTime';
import { useTrackDuration, clampPlaybackTime } from '../../hooks/useTrackDuration';

type TrackLike = Pick<QueueItem, 'duration' | 'id' | 'source' | 'queueId'> | Pick<Song, 'duration' | 'id' | 'source'> | null;

interface Props {
  song: TrackLike;
  className?: string;
  showDuration?: boolean;
  mode?: 'both' | 'elapsed' | 'duration';
}

function PlaybackTimeLabel({
  song,
  className = '',
  showDuration = true,
  mode,
}: Props) {
  const currentTime = useSmoothPlaybackTime();
  const duration = useTrackDuration(song);
  const displayTime = clampPlaybackTime(currentTime, duration);
  const resolvedMode = mode ?? (showDuration ? 'both' : 'elapsed');

  if (resolvedMode === 'elapsed') {
    return <span className={className}>{formatDuration(displayTime)}</span>;
  }
  if (resolvedMode === 'duration') {
    return <span className={className}>{duration > 0 ? formatDuration(duration) : '--:--'}</span>;
  }

  return (
    <span className={className}>
      {formatDuration(displayTime)}
      {duration > 0 ? ` / ${formatDuration(duration)}` : ''}
    </span>
  );
}

export default memo(PlaybackTimeLabel);
