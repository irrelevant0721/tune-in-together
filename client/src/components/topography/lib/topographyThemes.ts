import * as THREE from 'three';

/** Adapted from sonic-topography built-in themes */
export interface TopographyThemeColors {
  name: string;
  id: string;
  uBaseColor1: THREE.Color;
  uBaseColor2: THREE.Color;
  uFogColor: THREE.Color;
  uCoolCore: THREE.Color;
  uCoolEdge: THREE.Color;
  uWarmCore: THREE.Color;
  uWarmEdge: THREE.Color;
  uRippleColor: THREE.Color;
  uGlowIntensity: number;
}

export const TOPOGRAPHY_THEMES: Record<string, TopographyThemeColors> = {
  nocturnal: {
    name: 'Nocturnal',
    id: 'nocturnal',
    uBaseColor1: new THREE.Color(0.01, 0.02, 0.04),
    uBaseColor2: new THREE.Color(0.03, 0.05, 0.09),
    uFogColor: new THREE.Color(0.01, 0.02, 0.04),
    uCoolCore: new THREE.Color(0.0, 0.3, 1.0),
    uCoolEdge: new THREE.Color(0.6, 0.2, 1.0),
    uWarmCore: new THREE.Color(1.0, 0.2, 0.1),
    uWarmEdge: new THREE.Color(1.0, 0.6, 0.0),
    uRippleColor: new THREE.Color(0.2, 0.9, 1.0),
    uGlowIntensity: 1.0,
  },
  'ink-wash': {
    name: 'Ink Wash',
    id: 'ink-wash',
    uBaseColor1: new THREE.Color(1.0, 1.0, 1.0),
    uBaseColor2: new THREE.Color(1.0, 1.0, 1.0).lerp(new THREE.Color(0xffffff), 0.12),
    uFogColor: new THREE.Color(1.0, 1.0, 1.0),
    uCoolCore: new THREE.Color(0.0, 0.0, 0.0),
    uCoolEdge: new THREE.Color(0.0, 0.0, 0.0).lerp(new THREE.Color(1.0, 1.0, 1.0), 0.35),
    uWarmCore: new THREE.Color(0.0, 0.0, 0.0),
    uWarmEdge: new THREE.Color(0.0, 0.0, 0.0).lerp(new THREE.Color(1.0, 1.0, 1.0), 0.35),
    uRippleColor: new THREE.Color(0.66, 0.74, 0.76),
    uGlowIntensity: 1.1,
  },
};

export const DEFAULT_TOPOGRAPHY_THEME = TOPOGRAPHY_THEMES.nocturnal;
