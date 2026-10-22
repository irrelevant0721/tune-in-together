import { useId } from 'react';

interface Props {
  className?: string;
  title?: string;
}

/** A vinyl record crossed by a live waveform: music shared in sync. */
export default function BrandMark({ className = 'h-9 w-9', title }: Props) {
  const gradientId = `openmusic-brand-${useId().replace(/:/g, '')}`;

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="8" y1="6" x2="41" y2="43" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF746D" />
          <stop offset="0.52" stopColor="#F04455" />
          <stop offset="1" stopColor="#D9274A" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${gradientId})`} />
      <circle cx="24" cy="24" r="14.5" fill="#151417" stroke="#2E2A30" strokeWidth="0.8" />
      <circle cx="24" cy="24" r="11.5" stroke="white" strokeOpacity="0.1" strokeWidth="0.7" />
      <circle cx="24" cy="24" r="8.7" stroke="white" strokeOpacity="0.12" strokeWidth="0.65" />
      <circle cx="24" cy="24" r="6.1" stroke="white" strokeOpacity="0.09" strokeWidth="0.6" />
      <path
        d="M16.3 13.4A12.7 12.7 0 0 1 27.8 11.8"
        stroke="white"
        strokeOpacity="0.2"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path
        d="M10.8 24H15l3-5.9 3.8 11.4 4.1-14.6 3.5 11.6 2.6-4.1h5.2"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="3.6" fill={`url(#${gradientId})`} />
      <circle cx="24" cy="24" r="1.05" fill="white" />
    </svg>
  );
}
