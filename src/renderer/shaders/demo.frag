#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform float uBeat;
uniform vec2  uResolution;
uniform float uIntensity;
uniform float uSpeed;
uniform float uHue;
uniform float uAmplitude;
uniform float uBass;
uniform float uBrightness;

// --- Utility ---

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

// --- Main ---

void main() {
  vec2 uv = vUv;
  vec2 p = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);

  float t = uTime * uSpeed;

  // Concentric rings — ring density modulated by bass
  float d = length(p);
  float ringFreq = 20.0 + uBass * 15.0;
  float rings = sin(d * ringFreq - t * 4.0) * 0.5 + 0.5;
  rings *= smoothstep(1.2 + uAmplitude * 0.3, 0.0, d);

  // Beat pulse — amplitude drives the kick
  float pulse = 1.0 + 0.4 * uAmplitude + 0.3 * sin(uBeat * 3.14159 * 2.0);
  rings *= pulse;

  // Color — brightness shifts saturation, bass shifts hue spread
  float hue = uHue + d * (0.3 + uBass * 0.4) + t * 0.05;
  float sat = 0.5 + uBrightness * 0.4;
  vec3 col = hsv2rgb(vec3(hue, sat, rings * uIntensity));

  // Vignette — loosens with amplitude
  float vig = 1.0 - dot(p, p) * (0.8 - uAmplitude * 0.3);
  col *= vig;

  fragColor = vec4(col, 1.0);
}
