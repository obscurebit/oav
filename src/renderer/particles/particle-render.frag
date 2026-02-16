#version 300 es
precision highp float;

in vec4 vColor;
in float vLifeRatio;

out vec4 fragColor;

void main() {
  // Soft circular point (discard corners for round particles)
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float r = dot(coord, coord);
  if (r > 1.0) discard;

  // Soft edge falloff
  float alpha = vColor.a * (1.0 - r * r);

  // Glow: brighter in center
  float glow = exp(-r * 3.0) * 0.5;

  vec3 col = vColor.rgb + glow;
  fragColor = vec4(col, alpha);
}
