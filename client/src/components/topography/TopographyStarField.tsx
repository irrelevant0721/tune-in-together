import { useEffect, useMemo } from 'react';

import GalaxyBackgroundStarRiver from '../galaxy/GalaxyBackgroundStarRiver';
import { makeDotTexture } from '../galaxy/lib/dotTexture';

/**
 * WE 地形的背景星河：地形本体在 iframe 里，场景没有主粒子层，
 * 星空只能靠 Mineradio 那条 1400 点的背景星河（SONIC_WORKSHOP → 0.28）。
 */
export default function TopographyStarField() {
  const dotTexture = useMemo(() => makeDotTexture(), []);
  useEffect(() => () => dotTexture.dispose(), [dotTexture]);
  return <GalaxyBackgroundStarRiver preset={6} dotTexture={dotTexture} workshop />;
}
