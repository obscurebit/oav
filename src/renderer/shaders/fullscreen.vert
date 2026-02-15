#version 300 es
layout(location = 0) in vec2 aPosition;
out vec2 vUv;

void main() {
  // Map from clip space [-1,1] to UV [0,1]
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
