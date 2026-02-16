#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uOverlay;

void main() {
  // Flip Y — canvas has Y=0 at top, OpenGL has Y=0 at bottom
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec4 tex = texture(uOverlay, uv);
  fragColor = tex;
}
