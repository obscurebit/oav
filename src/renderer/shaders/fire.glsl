#version 300 es
precision highp float;

// Fire-specific color palette - bypasses multiPalette for direct fire colors
vec3 firePalette(float t, float hue, float hue2, float hue3, float split, float shift) {
  // Direct fire colors using cosine gradients with fire hues
  vec3 color1 = vec3(1.0, 0.3, 0.0) * cos(6.28318 * (vec3(0.5) * t + vec3(hue)));      // Red-orange
  vec3 color2 = vec3(1.0, 0.6, 0.0) * cos(6.28318 * (vec3(0.5) * t + vec3(hue2)));     // Orange-yellow  
  vec3 color3 = vec3(1.0, 0.9, 0.2) * cos(6.28318 * (vec3(0.5) * t + vec3(hue3)));     // Yellow-white
  
  // Sharp transitions between fire colors
  float region1 = smoothstep(0.0, split, t + shift);
  float region2 = smoothstep(split, split * 2.0, t + shift);
  
  vec3 result = color1;
  result = mix(result, color2, region1);
  result = mix(result, color3, region2);
  
  return result;
}
