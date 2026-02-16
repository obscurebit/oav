#version 300 es
precision highp float;

in vec4 vColor;
in float vLifeRatio;
in vec3 vVelocity;

out vec4 fragColor;

void main() {
  // Enhanced circular point with soft falloff
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float r = dot(coord, coord);
  
  // Discard outside circle
  if (r > 1.0) discard;
  
  // Calculate velocity-based sparkle
  float speed = length(vVelocity);
  float sparkleIntensity = smoothstep(0.5, 2.0, speed);
  
  // Enhanced glow with multiple layers
  float coreGlow = exp(-r * 8.0) * 0.8;           // Bright center
  float midGlow = exp(-r * 4.0) * 0.4;            // Middle layer
  float outerGlow = exp(-r * 2.0) * 0.2;          // Outer layer
  
  // Combine glow layers
  float totalGlow = coreGlow + midGlow + outerGlow;
  
  // Add sparkle effect for fast-moving particles
  float sparkle = sparkleIntensity * (1.0 - r) * 0.3;
  
  // Life-based fading and color shift
  float lifeFade = smoothstep(0.0, 0.3, vLifeRatio) * smoothstep(1.0, 0.7, vLifeRatio);
  
  // Color temperature shift over life (hot to cold)
  vec3 hotColor = vec3(1.0, 0.9, 0.7);  // White-hot
  vec3 coolColor = vColor.rgb;            // Original color
  vec3 temperatureColor = mix(hotColor, coolColor, vLifeRatio);
  
  // Final color calculation
  vec3 finalColor = temperatureColor + totalGlow + sparkle;
  float alpha = vColor.a * lifeFade * (1.0 - r * r);
  
  fragColor = vec4(finalColor, alpha);
}
