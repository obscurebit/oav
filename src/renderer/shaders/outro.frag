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

// Outro: dissolving particles fading to black
void main() {
  vec2 p = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed * 0.3;

  // Noise-like pattern from layered sines
  float n = sin(p.x * 12.0 + t) * sin(p.y * 15.0 - t * 0.7)
          + sin(p.x * 7.0 - t * 1.3) * sin(p.y * 9.0 + t * 0.5)
          + sin((p.x + p.y) * 20.0 + t * 0.4) * 0.5;
  n = n / 2.5 * 0.5 + 0.5;

  // Particles dissolve as progress increases
  float dissolve = 1.0 - uProgress;
  float threshold = dissolve * 1.2;
  float particle = smoothstep(threshold - 0.1, threshold, n);

  // Gentle drift
  particle *= 1.0 + uAmplitude * 0.3;

  // Muted, cool color
  float hue = uHue + 0.55 + n * 0.1 + t * 0.01;
  float sat = 0.2 + uBrightness * 0.2;
  vec3 col = hsv2rgb(vec3(hue, sat, particle * uIntensity * dissolve));

  // Soft vignette
  float d = length(p);
  float vig = 1.0 - d * d * 0.4;
  col *= vig;

  // Fade to black at end
  float fadeOut = smoothstep(1.0, 0.7, uProgress);
  col *= fadeOut;

  fragColor = vec4(col, 1.0);
}
