import { memo } from 'react';
import { formatDuration } from '../../api/music';
import type { QueueItem } from '../../types';
import { useSmoothPlaybackTime } from '../../hooks/useSmoothPlaybackTime';
import { useTrackDuration, clampPlaybackTime } from '../../hooks/useTrackDuration';
import ProgressBar from '../ProgressBar';

const noopSeek = () => {};

interface Props {
  song: QueueItem;
  isPlaying: boolean;
}

function TvProgressFooter({ song, isPlaying }: Props) {
  const currentTime = useSmoothPlaybackTime();
  const duration = useTrackDuration(song);
  const displayTime = clampPlaybackTime(currentTime, duration);
  const progress = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;

  return (
    <footer className="relative z-10 px-8 pb-8 pt-3 flex-shrink-0">
      <div className="mb-2 flex justify-between text-xs lg:text-sm text-white/50">
        <span>{formatDuration(displayTime)}</span>
        <span className="flex items-center gap-2">
          {!isPlaying && <span className="text-amber-400/80">已暂停</span>}
          {duration > 0 ? formatDuration(duration) : '--:--'}
        </span>
      </div>
      <div className="py-2 -my-2">
        <ProgressBar
          progress={progress}
          duration={duration}
          onSeek={noopSeek}
          disabled
          className="h-1"
          trackClassName="bg-white/20"
          fillClassName="bg-white"
        />
      </div>
    </footer>
  );
}

export default memo(TvProgressFooter);
