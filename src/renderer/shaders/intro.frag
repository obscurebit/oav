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

// Intro: slow emergence from darkness — expanding circle with soft glow
void main() {
  vec2 p = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed * 0.5;

  // Expanding radius tied to scene progress
  float radius = uProgress * 1.5;
  float d = length(p);

  // Soft circle edge
  float circle = smoothstep(radius, radius - 0.3, d);

  // Gentle pulsing glow
  float glow = exp(-d * 3.0) * (0.5 + 0.5 * sin(t * 2.0));
  glow *= 1.0 + uAmplitude * 0.5;

  // Slow rotating hue
  float angle = atan(p.y, p.x);
  float hue = uHue + angle / 6.283 + t * 0.02;

  float val = (circle * 0.6 + glow * 0.4) * uIntensity;
  vec3 col = hsv2rgb(vec3(hue, 0.3 + uBrightness * 0.3, val));

  // Fade in from black at start of scene
  float fadeIn = smoothstep(0.0, 0.15, uProgress);
  col *= fadeIn;

  fragColor = vec4(col, 1.0);
}
