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

// Outro: dissolution — the world unraveling into ash and memory
void main() {
  vec2 uv = vUv;
  vec2 p = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed * 0.25;

  p = applyTransforms(p, t);
  float d = length(p);

  // Noise field that slowly tears apart
  float ns = uNoiseScale;
  int oct = int(uOctaves);
  float n1 = fbm(p * ns * 1.33 + t * 0.2, oct);
  float n2 = fbm(p * ns * 2.0 - t * 0.15 + vec2(3.1, 7.4), max(oct - 1, 2));
  float n3 = snoise(p * ns * 2.67 + t * 0.3);

  // Dissolve threshold rises with progress — particles vanish
  float dissolve = 1.0 - uProgress;
  float threshold = dissolve * 1.3;
  float particle = smoothstep(threshold - 0.15, threshold + 0.05, n1 * 0.5 + 0.5);

  // Secondary structure — embers
  float embers = smoothstep(0.3, 0.35, n3 * 0.5 + 0.5) * dissolve;
  embers *= exp(-d * 2.0);

  // Muted, cool palette — ash and deep blue
  vec3 col1 = palette(n1 * 0.3 + uHue + 0.55,
    vec3(0.5, 0.5, 0.5),
    vec3(0.3, 0.3, 0.3),
    vec3(1.0, 1.0, 1.0),
    vec3(0.6, 0.7, 0.8)
  );

  // Warm ember color
  vec3 col2 = palette(n2 * 0.4 + uHue + 0.1,
    vec3(0.5, 0.3, 0.2),
    vec3(0.3, 0.2, 0.1),
    vec3(1.0, 0.5, 0.3),
    vec3(0.0, 0.05, 0.0)
  );

  vec3 col = col1 * particle + col2 * embers * 0.5;
  col *= uIntensity * dissolve;

  // Amplitude adds faint warmth
  col += vec3(0.15, 0.05, 0.0) * uAmplitude * dissolve * 0.3;

  // Click pulse — faint ghostly ring
  float pulseRing = abs(d - (1.0 - uPulse) * 1.5);
  float pulseGlow = smoothstep(0.1, 0.0, pulseRing) * uPulse * 0.3;
  col += vec3(0.3, 0.3, 0.5) * pulseGlow;

  // Fade to black at end
  col *= smoothstep(1.0, 0.65, uProgress);

  col = applyPost(col, uv, p, t);

  fragColor = vec4(col, 1.0);
}
