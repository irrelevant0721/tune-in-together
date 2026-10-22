import { memo } from 'react';
import type { QueueItem, Song } from '../../types';
import { useSmoothPlaybackTime } from '../../hooks/useSmoothPlaybackTime';
import { useTrackDuration, clampPlaybackTime } from '../../hooks/useTrackDuration';
import ProgressBar from '../ProgressBar';

type TrackLike = Pick<QueueItem, 'duration' | 'id' | 'source' | 'queueId'> | Pick<Song, 'duration' | 'id' | 'source'> | null;

interface Props {
  song: TrackLike;
  onSeek: (time: number) => void;
  disabled?: boolean;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
  thumbClassName?: string;
  showThumb?: boolean;
  variant?: 'default' | 'mineradio';
}

function PlaybackProgressBar({
  song,
  onSeek,
  disabled = false,
  className,
  trackClassName,
  fillClassName,
  thumbClassName,
  showThumb,
  variant = 'default',
}: Props) {
  const currentTime = useSmoothPlaybackTime();
  const duration = useTrackDuration(song);
  const displayTime = clampPlaybackTime(currentTime, duration);
  const progress = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;

  return (
    <ProgressBar
      progress={progress}
      duration={duration}
      onSeek={onSeek}
      disabled={disabled}
      className={className}
      trackClassName={trackClassName}
      fillClassName={fillClassName}
      thumbClassName={thumbClassName}
      showThumb={showThumb}
      variant={variant}
    />
  );
}

export default memo(PlaybackProgressBar);
