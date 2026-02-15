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

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Climax: intense radial burst with kaleidoscope symmetry
void main() {
  vec2 p = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed;

  float d = length(p);
  float angle = atan(p.y, p.x);

  // Kaleidoscope fold — more segments with progress
  float segments = 4.0 + floor(uProgress * 8.0);
  float ka = mod(angle, 6.283 / segments);
  ka = abs(ka - 3.14159 / segments);

  // Radial pattern
  float pattern = sin(d * 30.0 - t * 6.0 + uBass * 10.0);
  pattern *= sin(ka * segments * 2.0 + t * 2.0);
  pattern = pattern * 0.5 + 0.5;

  // Strobe on beat
  float strobe = 1.0 + uAmplitude * 1.5;
  pattern *= strobe;

  // Aggressive color
  float hue = uHue + angle / 6.283 + d * 0.5 + t * 0.1;
  float sat = 0.7 + uBrightness * 0.3;
  vec3 col = hsv2rgb(vec3(hue, sat, pattern * uIntensity));

  // Radial glow
  col += hsv2rgb(vec3(hue + 0.5, 0.8, exp(-d * 2.0) * uAmplitude * 0.5));

  // Tight vignette
  float vig = 1.0 - d * d * 0.6;
  col *= max(vig, 0.0);

  fragColor = vec4(col, 1.0);
}
