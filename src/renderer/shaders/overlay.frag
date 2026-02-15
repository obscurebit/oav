#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uOverlay;

void main() {
  vec4 tex = texture(uOverlay, vUv);
  fragColor = tex;
}
