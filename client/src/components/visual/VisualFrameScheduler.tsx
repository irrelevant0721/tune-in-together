import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export default function VisualFrameScheduler({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (fps <= 0) return;
    let frame = 0;
    let last = 0;
    const interval = 1000 / fps;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < interval) return;
      last = now - ((now - last) % interval);
      invalidate();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fps, invalidate]);

  return null;
}
