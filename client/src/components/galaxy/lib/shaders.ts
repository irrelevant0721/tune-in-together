import { PARTICLE_VERTEX_SHADER } from './visualVertexShader';

export const PARTICLE_FRAGMENT_SHADER = `
precision highp float;
uniform sampler2D uDotTex;
uniform float uAlpha, uPreset, uParticleDim;
varying vec3 vColor;
varying float vBright, vRipple, vEdgeBoost, vAlpha, vSourceLum;

void main(){
 vec4 tex = texture2D(uDotTex, gl_PointCoord);
 if (tex.a < 0.02) discard;
 vec3 col = vColor * vBright;
 col = mix(col, col * 1.3 + vec3(0.05), vEdgeBoost * 0.35);
 col = mix(col, col * 1.2, vRipple * 0.4);
 float keepBlack = 1.0 - smoothstep(0.025, 0.115, vSourceLum);
 float nonBlack = 1.0 - keepBlack;
 float dotDist = length(gl_PointCoord - vec2(0.5)) * 2.0;
 float readableRim = smoothstep(0.44, 0.94, dotDist) * (1.0 - smoothstep(0.94, 1.08, dotDist)) * tex.a;
 float outLum = dot(col, vec3(0.299, 0.587, 0.114));
 float lightParticle = smoothstep(0.50, 0.82, outLum) * nonBlack;
 float darkParticle = (1.0 - smoothstep(0.20, 0.50, outLum)) * nonBlack;
 col = mix(col, vec3(0.0), readableRim * lightParticle * 0.38);
 col = mix(col, vec3(1.0), readableRim * darkParticle * 0.20);
 col = clamp(col, vec3(0.0), vec3(1.6));
 gl_FragColor = vec4(col, tex.a * uAlpha * uParticleDim * vAlpha);
}
`;

export const PARTICLE_BLOOM_FRAGMENT_SHADER = `
precision highp float;
uniform sampler2D uDotTex;
uniform float uAlpha, uBloomStrength, uPreset, uParticleDim;
varying vec3 vColor;
varying float vBright, vRipple, vEdgeBoost, vAlpha, vSourceLum;

void main(){
 vec4 tex = texture2D(uDotTex, gl_PointCoord);
 if (tex.a < 0.01) discard;
 float soft = tex.a * tex.a;
 vec3 col = vColor * (0.55 + vBright * 0.62);
 col = mix(col, col + vec3(0.22, 0.18, 0.10), vEdgeBoost * 0.35);
 col = clamp(col, vec3(0.0), vec3(1.8));
 float pulse = 1.0 + vRipple * 0.65;
 float keepBlack = 1.0 - smoothstep(0.025, 0.115, vSourceLum);
 float bloomKeep = 1.0 - keepBlack * 0.92;
 gl_FragColor = vec4(col, soft * uAlpha * uBloomStrength * uParticleDim * pulse * 0.55 * vAlpha * bloomKeep);
}
`;

export const PARTICLE_BLOOM_VERTEX_SHADER = PARTICLE_VERTEX_SHADER
  .replace(
    'uniform float uMouseActive, uPixel, uColorMixT, uLoading;',
    'uniform float uMouseActive, uPixel, uColorMixT, uLoading, uBloomSize;',
  )
  .replace(
    'gl_PointSize = sz * uPixel * uPointScale;',
    'gl_PointSize = sz * uPixel * uPointScale * uBloomSize;',
  );

export const GALAXY_VERTEX_SHADER = PARTICLE_VERTEX_SHADER;
export const GALAXY_FRAGMENT_SHADER = PARTICLE_FRAGMENT_SHADER;
export const GALAXY_BLOOM_FRAGMENT_SHADER = PARTICLE_BLOOM_FRAGMENT_SHADER;
export const GALAXY_BLOOM_VERTEX_SHADER = PARTICLE_BLOOM_VERTEX_SHADER;
