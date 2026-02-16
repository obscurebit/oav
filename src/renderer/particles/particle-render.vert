#version 300 es
precision highp float;

in vec3 aPosition;
in vec4 aColor;
in float aSize;
in float aAge;
in float aLife;

out vec4 vColor;
out float vLifeRatio;

uniform mat4 uProjection;
uniform vec2 uResolution;

void main() {
  float lifeRatio = aAge / max(aLife, 0.001);
  vLifeRatio = lifeRatio;
  vColor = aColor;

  // Map from world space [-1,1] to clip space
  // Particles live in normalized coordinates: x[-1,1], y[-1,1], z ignored for 2D
  gl_Position = vec4(aPosition.xy, 0.0, 1.0);

  // Point size: base size scaled by resolution, shrinks with age
  float baseSize = aSize * min(uResolution.x, uResolution.y) * 0.5;
  gl_PointSize = max(baseSize * (1.0 - lifeRatio * 0.5), 1.0);
}
