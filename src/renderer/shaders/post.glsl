// Shared post-processing and coordinate transforms for all scene shaders.
// Include AFTER noise.glsl. Call applyTransforms() on coordinates before
// your pattern logic, and applyPost() on final color before output.

// --- All new uniforms ---
uniform float uSaturation;
uniform float uContrast;
uniform float uWarmth;
uniform float uGamma;
uniform float uInvert;
uniform float uZoom;
uniform float uRotation;
uniform float uSymmetry;
uniform float uMirrorX;
uniform float uMirrorY;
uniform float uWarp;
uniform float uNoiseScale;
uniform float uOctaves;
uniform float uLacunarity;
uniform float uGrain;
uniform float uPixelate;
uniform float uEdge;
uniform float uRidge;
uniform float uCells;
uniform float uDriftX;
uniform float uDriftY;
uniform float uSpin;
uniform float uWobble;
uniform float uStrobe;
uniform float uBloom;
uniform float uVignette;
uniform float uAberration;
uniform float uGlitch;
uniform float uFeedback;

// --- Coordinate transforms ---
// Call this on normalized coords (centered at origin) before pattern logic.
vec2 applyTransforms(vec2 p, float t) {
  // Pixelation (snap coordinates to grid)
  if (uPixelate > 0.01) {
    float gridSize = mix(512.0, 16.0, uPixelate);
    p = floor(p * gridSize) / gridSize;
  }

  // Zoom
  p /= max(uZoom, 0.01);

  // Drift / pan
  p += vec2(uDriftX, uDriftY) * t * 0.5;

  // Rotation (static + continuous spin)
  float angle = uRotation + uSpin * t;
  if (abs(angle) > 0.001) {
    float ca = cos(angle);
    float sa = sin(angle);
    p = mat2(ca, -sa, sa, ca) * p;
  }

  // Wobble (sinusoidal coordinate distortion)
  if (uWobble > 0.01) {
    p.x += sin(p.y * 5.0 + t * 2.0) * uWobble * 0.15;
    p.y += cos(p.x * 5.0 + t * 2.3) * uWobble * 0.15;
  }

  // Mirror
  if (uMirrorX > 0.5) p.x = abs(p.x);
  if (uMirrorY > 0.5) p.y = abs(p.y);

  // Kaleidoscope symmetry (overrides scene's own symmetry if > 0)
  if (uSymmetry >= 2.0) {
    float a = atan(p.y, p.x);
    float r = length(p);
    float seg = 6.28318 / uSymmetry;
    a = mod(a, seg);
    a = abs(a - seg * 0.5);
    p = vec2(cos(a), sin(a)) * r;
  }

  return p;
}

// --- Noise with new params ---
// Enhanced fbm that respects uOctaves and uLacunarity
float fbmEx(vec2 p, float noiseScale, float octaves, float lac) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = noiseScale;
  int oct = int(octaves);
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    value += amplitude * snoise(p * frequency);
    frequency *= lac;
    amplitude *= 0.5;
  }
  return value;
}

// --- Post-processing on final color ---
// Call this on the final vec3 color before writing to fragColor.
vec3 applyPost(vec3 col, vec2 uv, vec2 p, float t) {
  float d = length(p);

  // Ridged noise overlay
  if (uRidge > 0.01) {
    float r = ridgeNoise(p * uNoiseScale + t * 0.1, int(uOctaves));
    col = mix(col, col * (0.5 + r), uRidge);
  }

  // Cellular / voronoi overlay
  if (uCells > 0.01) {
    float v = voronoi(p * uNoiseScale * 1.5 + t * 0.2);
    vec3 cellCol = col * (0.3 + v * 1.4);
    col = mix(col, cellCol, uCells);
  }

  // Edge detection / posterize
  if (uEdge > 0.01) {
    float levels = mix(256.0, 4.0, uEdge);
    col = floor(col * levels + 0.5) / levels;
  }

  // Saturation
  if (abs(uSaturation - 1.0) > 0.01) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, uSaturation);
  }

  // Contrast
  if (abs(uContrast - 1.0) > 0.01) {
    col = (col - 0.5) * uContrast + 0.5;
  }

  // Warmth (shift toward orange or blue)
  if (abs(uWarmth) > 0.01) {
    col.r += uWarmth * 0.1;
    col.b -= uWarmth * 0.1;
  }

  // Gamma
  if (abs(uGamma - 1.0) > 0.01) {
    col = pow(max(col, vec3(0.0)), vec3(1.0 / uGamma));
  }

  // Invert
  if (uInvert > 0.01) {
    col = mix(col, 1.0 - col, uInvert);
  }

  // Bloom (additive glow based on brightness)
  if (uBloom > 0.01) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    float bloomMask = smoothstep(0.4, 1.0, luma);
    col += col * bloomMask * uBloom;
  }

  // Chromatic aberration
  if (uAberration > 0.01) {
    float offset = uAberration * 0.02 * d;
    // Shift red and blue channels outward from center
    vec2 dir = normalize(p + 0.001);
    col.r = col.r + snoise(uv * 20.0 + t) * offset * 2.0;
    col.b = col.b - snoise(uv * 20.0 - t) * offset * 2.0;
  }

  // Film grain
  if (uGrain > 0.01) {
    float noise = hash(uv * 1000.0 + t * 100.0) - 0.5;
    col += noise * uGrain * 0.3;
  }

  // Glitch (horizontal displacement + color channel split)
  if (uGlitch > 0.01) {
    float glitchLine = step(0.97 - uGlitch * 0.15, hash(vec2(floor(uv.y * 50.0), floor(t * 10.0))));
    if (glitchLine > 0.5) {
      float shift = (hash(vec2(floor(t * 30.0), 0.0)) - 0.5) * uGlitch * 0.3;
      col.r = col.g; // channel swap on glitch lines
      col *= 1.0 + shift;
    }
  }

  // Strobe
  if (uStrobe > 0.01) {
    float flash = step(0.5, fract(t * mix(2.0, 15.0, uStrobe)));
    col *= mix(1.0, flash * 2.0, uStrobe);
  }

  // Vignette
  if (uVignette > 0.01) {
    col *= 1.0 - d * d * uVignette * 0.7;
  }

  // Clamp
  col = clamp(col, 0.0, 1.0);

  return col;
}
