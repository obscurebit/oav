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

// Build: organic complexity — domain-warped flow fields gaining structure
void main() {
  vec2 uv = vUv;
  vec2 p = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed * 0.4;

  p = applyTransforms(p, t);
  float d = length(p);

  // Progressive domain warping — more layers as scene builds
  float warpStrength = (0.4 + uProgress * 0.8) * uWarp * 2.0;
  float ns = uNoiseScale;
  int oct = int(uOctaves);
  vec2 q = vec2(
    fbm(p * ns + t * 0.15, oct - 1),
    fbm(p * ns + vec2(5.2, 1.3) + t * 0.12, oct - 1)
  );
  vec2 r = vec2(
    fbm(p * ns + q * warpStrength + vec2(1.7, 9.2) + t * 0.08, oct),
    fbm(p * ns + q * warpStrength + vec2(8.3, 2.8) + t * 0.1, oct)
  );

  // The main pattern — double-warped noise
  float f = fbm(p * ns + r * warpStrength, oct);

  // Layered sine structure that grows with progress
  float structure = 0.0;
  float layers = 2.0 + uProgress * 5.0;
  for (float i = 1.0; i <= 7.0; i += 1.0) {
    if (i > layers) break;
    float freq = i * 2.5 + uBass * 3.0;
    structure += sin(f * freq + t * (0.3 + i * 0.2)) / (i * 1.5);
  }
  structure = structure * 0.5 + 0.5;

  // Color — warm to cool gradient driven by warp field
  vec3 col1 = palette(f * 0.5 + uHue + t * 0.02,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(2.0, 1.0, 0.0),
    vec3(0.5, 0.2, 0.25)
  );

  vec3 col2 = palette(length(r) * 0.8 + uHue + 0.5,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 1.0, 0.5),
    vec3(0.8, 0.9, 0.3)
  );

  vec3 col = mix(col1, col2, structure);

  // Brightness from combined fields
  float brightness = (f * 0.5 + 0.5) * structure * 1.4 + 0.15;
  brightness *= 1.0 + uAmplitude * 0.6;
  col *= brightness * uIntensity;

  // Bass pulses the saturation
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 0.7 + uBass * 0.5);

  // Click pulse — radial distortion wave
  float pulseRing = abs(d - (1.0 - uPulse) * 1.5);
  float pulseGlow = smoothstep(0.12, 0.0, pulseRing) * uPulse * 0.5;
  col += vec3(0.5, 0.4, 0.3) * pulseGlow;
  col *= 1.0 + uPulse * 0.15;

  col = applyPost(col, uv, p, t);

  fragColor = vec4(col, 1.0);
}
