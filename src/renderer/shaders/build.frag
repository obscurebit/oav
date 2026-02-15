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

// Build: layered sine waves — increasing complexity with progress
void main() {
  vec2 p = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed;

  // Number of wave layers increases with progress
  float layers = 2.0 + uProgress * 6.0;
  float val = 0.0;

  for (float i = 1.0; i <= 8.0; i += 1.0) {
    if (i > layers) break;
    float freq = i * 3.0 + uBass * 5.0;
    float phase = t * (0.5 + i * 0.3);
    float wave = sin(p.x * freq + phase) * cos(p.y * freq * 0.7 + phase * 0.8);
    val += wave / i;
  }

  val = val * 0.5 + 0.5;
  val *= 1.0 + uAmplitude * 0.6;

  // Color rotation
  float hue = uHue + val * 0.3 + t * 0.03;
  float sat = 0.5 + uBrightness * 0.4;
  vec3 col = hsv2rgb(vec3(hue, sat, val * uIntensity));

  // Vignette
  float vig = 1.0 - dot(p, p) * 0.5;
  col *= vig;

  fragColor = vec4(col, 1.0);
}
