#version 300 es
precision highp float;

in vec2 aPosition;
in vec2 aVelocity;
in float aMass;

out vec4 vColor;
out float vSpeed;

uniform vec2 uResolution;
uniform vec3 uBaseColor;
uniform float uTime;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);

  float speed = length(aVelocity);
  vSpeed = speed;

  // Color: base color tinted by velocity (faster = brighter)
  float brightness = 0.5 + min(speed * 2.0, 0.5);
  vColor = vec4(uBaseColor * brightness, 1.0);

  // Node size based on mass
  gl_PointSize = max(aMass * min(uResolution.x, uResolution.y) * 0.3, 2.0);
}
