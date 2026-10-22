import type { CSSProperties } from 'react';

/** Linux.do 品牌色图标（黑 / 白 / 黄三色圆标） */
export function LinuxDoIcon({ style }: { style?: CSSProperties } = {}) {
  return (
    <span
      role="img"
      aria-hidden
      className="anticon"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        lineHeight: 0,
        ...style,
      }}
    >
      <svg viewBox="5 5 90 90" width="1em" height="1em" focusable="false">
        <circle fill="#efefef" cx="50" cy="50" r="45" />
        <path
          fill="#feb005"
          d="M50,92.3c16.64,0,31.03-9.61,37.94-23.57H12.06c6.91,13.97,21.3,23.57,37.94,23.57Z"
        />
        <path
          fill="#1e1e20"
          d="M50,7.7c-16.64,0-31.03,9.61-37.94,23.57h75.88c-6.91-13.97-21.3-23.57-37.94-23.57Z"
        />
      </svg>
    </span>
  );
}
