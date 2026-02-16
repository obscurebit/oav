#version 300 es
precision highp float;

// Input attributes (current state)
in vec3 aPosition;    // xyz position
in vec3 aVelocity;    // xyz velocity
in vec4 aColor;       // rgba color (a = remaining life)
in float aLife;       // total lifetime (seconds)
in float aAge;        // current age (seconds)
in float aSize;       // particle size

// Transform feedback outputs (next state)
out vec3 vPosition;
out vec3 vVelocity;
out vec4 vColor;
out float vLife;
out float vAge;
out float vSize;

// Uniforms
uniform float uDt;
uniform vec3 uGravity;       // gravity vector (usually 0, -g, 0)
uniform float uDrag;         // air resistance [0, 1]
uniform float uTurbulence;   // random force strength
uniform float uTime;

// Simple hash for pseudo-random per-particle turbulence
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

vec3 turbulenceForce(vec3 pos, float seed) {
  float h1 = hash(seed + pos.x * 13.7) * 2.0 - 1.0;
  float h2 = hash(seed + pos.y * 17.3) * 2.0 - 1.0;
  float h3 = hash(seed + pos.z * 23.1) * 2.0 - 1.0;
  return vec3(h1, h2, h3);
}

void main() {
  float newAge = aAge + uDt;

  if (newAge >= aLife) {
    // Particle is dead — park it offscreen, zero velocity
    vPosition = vec3(0.0, -999.0, 0.0);
    vVelocity = vec3(0.0);
    vColor = vec4(0.0);
    vLife = aLife;
    vAge = aLife; // clamp to dead
    vSize = 0.0;
    return;
  }

  float lifeRatio = newAge / aLife; // 0 = born, 1 = dead

  // Forces
  vec3 force = uGravity;
  force -= aVelocity * uDrag; // drag
  force += turbulenceForce(aPosition, uTime + float(gl_VertexID)) * uTurbulence;

  // Euler integration
  vec3 newVel = aVelocity + force * uDt;
  vec3 newPos = aPosition + newVel * uDt;

  // Color fade: alpha decreases with age, color shifts warm→cool
  float alpha = 1.0 - lifeRatio * lifeRatio; // quadratic fade
  vColor = vec4(aColor.rgb * (1.0 - lifeRatio * 0.5), alpha * aColor.a);

  // Size shrinks as particle ages
  vSize = aSize * (1.0 - lifeRatio * 0.7);

  vPosition = newPos;
  vVelocity = newVel;
  vLife = aLife;
  vAge = newAge;
}
