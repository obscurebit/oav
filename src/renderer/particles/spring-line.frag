#version 300 es
precision highp float;

in vec4 vColor;
in float vSpeed;

out vec4 fragColor;

void main() {
  // Enhanced line rendering with glow effect
  vec4 color = vColor;
  
  // Add glow based on speed - faster = more glow
  float glow = min(vSpeed * 2.0, 0.3);
  color.rgb += vec3(glow);
  
  // Make lines more visible with higher alpha
  color.a = min(color.a + 0.2, 1.0);
  
  fragColor = color;
}
