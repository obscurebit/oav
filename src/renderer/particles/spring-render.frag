#version 300 es
precision highp float;

in vec4 vColor;
in float vSpeed;

out vec4 fragColor;

void main() {
  // Soft circular point
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float r = dot(coord, coord);
  if (r > 1.0) discard;

  float alpha = (1.0 - r) * vColor.a;
  float glow = exp(-r * 2.0) * 0.3;

  fragColor = vec4(vColor.rgb + glow, alpha);
}
