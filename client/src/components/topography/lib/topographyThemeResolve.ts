import * as THREE from 'three';
import type { RoomVisualFxSettings } from '../../../lib/roomVisualPreset';
import { TOPOGRAPHY_THEMES, type TopographyThemeColors } from './topographyThemes';
import { stageLyricPaletteLive } from '../../../lib/stageLyricPaletteLive';

export function resolveTopographyTheme(fx: RoomVisualFxSettings): TopographyThemeColors {
  const base = TOPOGRAPHY_THEMES.nocturnal;
  const theme: TopographyThemeColors = {
    ...base,
    uBaseColor1: base.uBaseColor1.clone(),
    uBaseColor2: base.uBaseColor2.clone(),
    uFogColor: base.uFogColor.clone(),
    uCoolCore: base.uCoolCore.clone(),
    uCoolEdge: base.uCoolEdge.clone(),
    uWarmCore: base.uWarmCore.clone(),
    uWarmEdge: base.uWarmEdge.clone(),
    uRippleColor: base.uRippleColor.clone(),
    uGlowIntensity: base.uGlowIntensity * (0.75 + fx.colorBoost * 0.35),
  };

  if (fx.visualTintMode !== 'custom' && stageLyricPaletteLive.coverPalette) {
    const palette = stageLyricPaletteLive.coverPalette;
    const primary = new THREE.Color(palette.primary);
    const secondary = new THREE.Color(palette.secondary);
    const highlight = new THREE.Color(palette.highlight);
    const shadow = new THREE.Color(palette.shadow);
    theme.uBaseColor1.copy(shadow).multiplyScalar(0.2);
    theme.uFogColor.copy(theme.uBaseColor1);
    theme.uBaseColor2.copy(shadow).lerp(primary, 0.22);
    theme.uCoolCore.copy(primary);
    theme.uCoolEdge.copy(primary).lerp(highlight, 0.35);
    theme.uWarmCore.copy(secondary);
    theme.uWarmEdge.copy(secondary).lerp(highlight, 0.28);
    theme.uRippleColor.copy(highlight);
    theme.uGlowIntensity = 0.2 * (0.75 + fx.colorBoost * 0.35);
  }

  if (fx.visualTintMode === 'custom') {
    const accent = new THREE.Color(fx.visualTintColor);
    theme.uRippleColor.copy(accent);
    theme.uCoolCore.copy(accent);
    theme.uCoolEdge.copy(accent).lerp(new THREE.Color('#ffffff'), 0.35);
  }

  if (fx.backgroundColorMode === 'custom') {
    const bg = new THREE.Color(fx.backgroundColor);
    theme.uBaseColor1.copy(bg);
    theme.uFogColor.copy(bg);
    theme.uBaseColor2.copy(bg).lerp(new THREE.Color('#ffffff'), 0.12);
  }

  return theme;
}
