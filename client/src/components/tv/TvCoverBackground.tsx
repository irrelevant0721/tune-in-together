import { memo } from 'react';
import { useSignedApiUrl } from '../../lib/signedApiUrl';

interface Props {
  coverUrl: string;
  loaded: boolean;
}

function TvCoverBackground({ coverUrl, loaded }: Props) {
  const signedCover = useSignedApiUrl(coverUrl);
  const displayUrl = signedCover || '';
  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center scale-110 contain-strict"
        style={{
          backgroundImage: loaded && displayUrl ? `url(${displayUrl})` : undefined,
          filter: 'blur(36px) brightness(0.35)',
          willChange: loaded ? 'auto' : 'opacity',
        }}
      />
      <img
        src={displayUrl}
        alt=""
        className="hidden"
        loading="eager"
        decoding="async"
        {...{ fetchpriority: 'high' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
    </>
  );
}

export default memo(TvCoverBackground);
