#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform float uBeat;
uniform float uProgress;
uniform vec2  uResolution;
uniform float uIntensity;
uniform float uSpeed;
uniform float uHue;
uniform float uAmplitude;
uniform float uBass;
uniform float uBrightness;
uniform float uPulse;

// Color Palette Uniforms
uniform float uHue2;
uniform float uHue3;
uniform float uColorSplit;
uniform float uPaletteShift;

#include "noise.glsl"
#include "post.glsl"

// Climax: fractal kaleidoscope storm — intense, overwhelming, beautiful
void main() {
  vec2 uv = vUv;
  vec2 p = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed * 0.6;

  p = applyTransforms(p, t);
  float d = length(p);
  float angle = atan(p.y, p.x);

  // Kaleidoscope fold — segments increase with progress
  // (uSymmetry handled in applyTransforms, but climax has its own too)
  float segments = 5.0 + floor(uProgress * 7.0);
  if (uSymmetry < 2.0) {
    float segAngle = 6.28318 / segments;
    float ka = mod(angle + t * 0.3, segAngle);
    ka = abs(ka - segAngle * 0.5);
    p = vec2(cos(ka), sin(ka)) * d;
  }

  float ka = atan(p.y, p.x);

  // Warped noise in kaleidoscope space
  float warpStr = (0.5 + uBass * 0.5) * uWarp * 2.0;
  vec2 warped = warp(p * uNoiseScale * 1.33, t * 1.5, warpStr);
  float n = fbm(warped, int(uOctaves));

  // Radial energy rings
  float rings = sin(d * 25.0 - t * 5.0 + n * 4.0 + uBass * 8.0);
  rings = rings * 0.5 + 0.5;
  rings = pow(rings, 1.5 - uAmplitude * 0.5);

  // Angular pattern
  float angular = sin(ka * segments * 3.0 + t * 3.0 + n * 2.0);
  angular = angular * 0.5 + 0.5;

  float pattern = rings * 0.6 + angular * 0.3 + n * 0.3;
  pattern *= 1.0 + uAmplitude * 1.2;

  // Vivid color — two competing palettes
  vec3 col1 = palette(angle / 6.28318 + d * 0.3 + uHue + t * 0.05,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 0.7, 0.4),
    vec3(0.0, 0.15, 0.2)
  );

  vec3 col2 = palette(n * 0.5 + uHue + 0.5,
    vec3(0.8, 0.5, 0.4),
    vec3(0.2, 0.4, 0.2),
    vec3(2.0, 1.0, 1.0),
    vec3(0.0, 0.25, 0.25)
  );

  vec3 col = mix(col1, col2, rings);
  col *= pattern * uIntensity;

  // Hot center glow
  float centerGlow = exp(-d * 2.5) * (0.5 + uAmplitude * 0.8);
  col += palette(t * 0.1 + uHue,
    vec3(0.8, 0.3, 0.2),
    vec3(0.3, 0.3, 0.3),
    vec3(1.0, 1.0, 1.0),
    vec3(0.0, 0.0, 0.0)
  ) * centerGlow;

  // Click pulse — intense flash + ring
  float pulseRing = abs(d - (1.0 - uPulse) * 2.0);
  float pulseGlow = smoothstep(0.2, 0.0, pulseRing) * uPulse * 0.8;
  col += vec3(1.0, 0.8, 0.6) * pulseGlow;
  col *= 1.0 + uPulse * 0.3;

  col = applyPost(col, uv, p, t);

  fragColor = vec4(col, 1.0);
}
