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

// Fire mode flag
uniform float uFireMode;

#include "noise.glsl"
#include "post.glsl"

// Fire-specific color palette - bypasses multiPalette for direct fire colors
vec3 firePalette(float t) {
  // Direct fire colors using cosine gradients with fire hues
  vec3 color1 = vec3(1.0, 0.3, 0.0) * cos(6.28318 * (vec3(0.5) * t + vec3(uHue)));      // Red-orange
  vec3 color2 = vec3(1.0, 0.6, 0.0) * cos(6.28318 * (vec3(0.5) * t + vec3(uHue2)));     // Orange-yellow  
  vec3 color3 = vec3(1.0, 0.9, 0.2) * cos(6.28318 * (vec3(0.5) * t + vec3(uHue3)));     // Yellow-white
  
  // Sharp transitions between fire colors
  float region1 = smoothstep(0.0, uColorSplit, t + uPaletteShift);
  float region2 = smoothstep(uColorSplit, uColorSplit * 2.0, t + uPaletteShift);
  
  vec3 result = color1;
  result = mix(result, color2, region1);
  result = mix(result, color3, region2);
  
  return result;
}

// Build: organic complexity — domain-warped flow fields gaining structure
void main() {
  vec2 uv = vUv;
  vec2 p = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed * 0.4;

  p = applyTransforms(p, t);
  float d = length(p);

  // Fire mode: use completely different pattern generation
  float f, structure;
  vec2 r; // Declare r outside conditional to use in both branches
  
  if (uFireMode > 0.5) {
    // Fire-specific pattern: turbulent noise with upward flow
    f = 0.0;
    structure = 0.0;
    r = vec2(0.0); // Initialize r for fire mode
    
    // Create multiple turbulent layers for fire effect
    for (int i = 0; i < 5; i++) {
      float layerFreq = 2.0 + float(i) * 1.5;
      float layerAmp = 0.3 / (float(i) + 1.0);
      float layer = fbm(p * uNoiseScale * layerFreq + t * (0.2 + float(i) * 0.1), int(uOctaves));
      f += layer * layerAmp;
      
      // Add upward bias for flames
      f += p.y * 0.3 * layerAmp;
      
      // Create flame-like structure with sine waves
      structure += sin(layer * 10.0 + t * 3.0) * layerAmp;
    }
    
    // Add rapid flickering
    float flicker = sin(t * 20.0) * 0.5 + 0.5;
    f *= flicker;
    
    // Add turbulence for chaotic movement
    vec2 turb = vec2(
      sin(t * 7.0) * 0.1,
      cos(t * 5.0) * 0.1
    );
    f += fbm(p + turb, 3) * 0.2;
    
  } else {
    // Original pattern for non-fire modes
    // Progressive domain warping — more layers as scene builds
    float warpStrength = (0.4 + uProgress * 0.8) * uWarp * 2.0;
    float ns = uNoiseScale;
    int oct = int(uOctaves);
    vec2 q = vec2(
      fbm(p * ns + t * 0.15, oct - 1),
      fbm(p * ns + vec2(5.2, 1.3) + t * 0.12, oct - 1)
    );
    r = vec2(
      fbm(p * ns + q * warpStrength + vec2(1.7, 9.2) + t * 0.08, oct),
      fbm(p * ns + q * warpStrength + vec2(8.3, 2.8) + t * 0.1, oct)
    );

    // The main pattern — double-warped noise
    f = fbm(p * ns + r * warpStrength, oct);

    // Layered sine structure that grows with progress
    structure = 0.0;
    float layers = 2.0 + uProgress * 5.0;
    for (float i = 1.0; i <= 7.0; i += 1.0) {
      if (i > layers) break;
      float freq = i * 2.5 + uBass * 3.0;
      structure += sin(f * freq + t * (0.3 + i * 0.2)) / (i * 1.5);
    }
    structure = structure * 0.5 + 0.5;
  }

  // Color — use fire palette when in fire mode, otherwise use multi-color palette
  vec3 col1, col2;
  if (uFireMode > 0.5) {
    col1 = firePalette(f * 0.5 + t * 0.02);
    col2 = firePalette(f * 0.8 + 0.5);
  } else {
    col1 = multiPalette(f * 0.5 + t * 0.02, uColorSplit);
    col2 = multiPalette(length(r) * 0.8 + 0.5, uColorSplit * 0.7);
  }

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
