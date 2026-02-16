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

#include "noise.glsl"
#include "post.glsl"

// Intro: emergence from the void — nebula coalescing from darkness
void main() {
  vec2 uv = vUv;
  vec2 p = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed * 0.3;

  // Apply coordinate transforms (zoom, rotation, mirror, symmetry, etc.)
  p = applyTransforms(p, t);
  float d = length(p);

  // Domain-warped noise field — organic, cloudy shapes
  float warpStr = (0.6 + uProgress * 0.4) * uWarp * 2.0;
  vec2 warped = warp(p * uNoiseScale * 0.67, t, warpStr);
  float n1 = fbm(warped, int(uOctaves));
  float n2 = fbm(warped + vec2(3.7, 1.2) + t * 0.05, max(int(uOctaves) - 1, 2));

  // Expanding reveal radius
  float radius = uProgress * 1.8;
  float reveal = smoothstep(radius, radius - 0.5, d);

  // Central glow — breathes with amplitude
  float glow = exp(-d * (3.0 - uProgress * 1.5)) * (0.6 + 0.4 * sin(t * 1.5));
  glow *= 1.0 + uAmplitude * 0.8;

  // Nebula color — deep blues and purples emerging
  vec3 col1 = palette(n1 * 0.5 + uHue,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 0.7, 0.4),
    vec3(0.0, 0.15, 0.2)
  );

  vec3 col2 = palette(n2 * 0.5 + uHue + 0.3,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.3),
    vec3(1.0, 1.0, 1.0),
    vec3(0.0, 0.1, 0.2)
  );

  // Mix noise layers
  float shape = n1 * 0.6 + n2 * 0.4;
  shape = shape * 0.5 + 0.5;
  shape *= reveal;

  vec3 col = mix(col1, col2, n2 * 0.5 + 0.5);
  col *= (shape * 0.7 + glow * 0.5) * uIntensity;

  // Bass adds subtle pulse to brightness
  col *= 1.0 + uBass * 0.3;

  // Click pulse — expanding shockwave ring
  float pulseRing = abs(d - (1.0 - uPulse) * 1.5);
  float pulseGlow = smoothstep(0.15, 0.0, pulseRing) * uPulse * 0.6;
  col += vec3(0.4, 0.5, 0.7) * pulseGlow;

  // Fade in from black
  col *= smoothstep(0.0, 0.15, uProgress);

  // Apply all post-processing (saturation, contrast, grain, bloom, glitch, etc.)
  col = applyPost(col, uv, p, t);

  fragColor = vec4(col, 1.0);
}
