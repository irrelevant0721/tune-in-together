import { memo } from 'react';
import { getSourceShortLabel } from '../lib/sourceLabels';
import type { MusicSource } from '../types';
import PlaybackQualityTag from './PlaybackQualityTag';

interface Props {
  name: string;
  artist: string;
  source?: MusicSource;
  requestedBy?: string;
  qualityLabel?: string | null;
  size?: 'default' | 'large';
  mobileCentered?: boolean;
}

function SongInfoPanel({
  name,
  artist,
  source = 'netease',
  requestedBy,
  qualityLabel,
  size = 'default',
  mobileCentered = false,
}: Props) {
  const large = size === 'large';
  const metaParts = [
    `歌手：${artist}`,
    getSourceShortLabel(source),
    requestedBy ? `${requestedBy} 点的歌` : '',
  ].filter(Boolean);

  return (
    <div className={`flex-shrink-0 px-1 ${large ? 'pt-2 sm:pt-4 lg:pt-10 2xl:pt-14' : 'pt-4 lg:pt-10'} pb-2 sm:pb-4`}>
      <div className={`flex min-w-0 items-center gap-2 2xl:gap-3 ${mobileCentered ? 'justify-center lg:justify-start' : ''}`}>
        <h2 className={`min-w-0 truncate font-semibold ${large ? 'text-xl lg:text-2xl 2xl:text-4xl 3xl:text-5xl' : 'text-xl lg:text-2xl 2xl:text-3xl'}`}>{name}</h2>
        <PlaybackQualityTag
          label={qualityLabel}
          source={source}
          className={large ? 'text-[11px] 2xl:text-sm px-2 py-1' : undefined}
        />
      </div>
      <p className={`mt-2 truncate text-white/65 ${mobileCentered ? 'text-center lg:text-left' : ''} ${large ? 'text-sm 2xl:text-xl 3xl:text-2xl' : 'text-sm 2xl:text-base'}`}>
        {metaParts.join(' · ')}
      </p>
    </div>
  );
}

export default memo(SongInfoPanel);
