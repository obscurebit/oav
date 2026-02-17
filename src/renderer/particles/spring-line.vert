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

  // Jello effect: add some wobble based on time and velocity
  float wobble = sin(uTime * 3.0 + aPosition.x * 10.0) * 0.01;
  vec2 wobblePos = aPosition + vec2(wobble, cos(uTime * 2.0 + aPosition.y * 8.0) * 0.01);
  gl_Position = vec4(wobblePos, 0.0, 1.0);

  // Color: base color with velocity-based brightness and pulsing
  float brightness = 0.6 + min(speed * 3.0, 0.4);
  float pulse = sin(uTime * 4.0) * 0.1 + 0.9;
  vColor = vec4(uBaseColor * brightness * pulse, 0.9); // more opaque, thicker feel
}
