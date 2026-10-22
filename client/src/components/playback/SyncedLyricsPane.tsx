import { memo } from 'react';
import type { LyricLine } from '../../types';
import { useSmoothPlaybackTime } from '../../hooks/useSmoothPlaybackTime';
import Lyrics from '../Lyrics';

interface Props {
  lines: LyricLine[];
  onSeek?: (time: number) => void;
  variant?: 'center' | 'side';
  size?: 'default' | 'large';
  scrollable?: boolean;
  /** TV 大屏降低滚动动画成本 */
  instantScroll?: boolean;
  mobileCentered?: boolean;
  showTranslation?: boolean;
}

function SyncedLyricsPane({
  lines,
  onSeek,
  variant = 'center',
  size = 'default',
  scrollable = false,
  instantScroll = false,
  mobileCentered = false,
  showTranslation,
}: Props) {
  const currentTime = useSmoothPlaybackTime();

  return (
    <Lyrics
      lines={lines}
      currentTime={currentTime}
      onSeek={onSeek}
      variant={variant}
      size={size}
      scrollable={scrollable}
      instantScroll={instantScroll}
      mobileCentered={mobileCentered}
      showTranslation={showTranslation}
    />
  );
}

export default memo(SyncedLyricsPane);
