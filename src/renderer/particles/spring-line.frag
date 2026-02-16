#version 300 es
precision highp float;

in vec4 vColor;
in float vSpeed;

out vec4 fragColor;

void main() {
  // Simple line rendering - no point coordinates
  fragColor = vColor;
}
