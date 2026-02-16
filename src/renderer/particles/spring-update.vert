#version 300 es
precision highp float;

// Node state (input)
in vec2 aPosition;
in vec2 aVelocity;
in vec2 aRestPosition;  // equilibrium position
in float aMass;
in float aPinned;       // 1.0 = pinned (immovable), 0.0 = free

// Accumulated spring force from CPU (computed per-frame)
in vec2 aForce;

// Transform feedback outputs
out vec2 vPosition;
out vec2 vVelocity;
out vec2 vRestPosition;
out float vMass;
out float vPinned;
out vec2 vForce; // zeroed after use

uniform float uDt;
uniform vec2 uGravity;
uniform float uDamping;       // velocity damping [0, 1]
uniform float uMouseX;        // mouse influence position
uniform float uMouseY;
uniform float uMouseForce;    // mouse push/pull strength
uniform float uJiggle;        // random perturbation strength
uniform float uTime;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  vRestPosition = aRestPosition;
  vMass = aMass;
  vPinned = aPinned;
  vForce = vec2(0.0); // reset force accumulator

  if (aPinned > 0.5) {
    // Pinned nodes don't move
    vPosition = aRestPosition;
    vVelocity = vec2(0.0);
    return;
  }

  // Total force = spring forces + gravity + mouse influence + jiggle
  vec2 totalForce = aForce;

  // Gravity
  totalForce += uGravity * aMass;

  // Mouse influence (repulsion/attraction based on distance)
  vec2 mousePos = vec2(uMouseX, uMouseY);
  vec2 toMouse = mousePos - aPosition;
  float dist = length(toMouse);
  if (dist > 0.001 && dist < 0.5) {
    float influence = uMouseForce / (dist * dist + 0.01);
    totalForce += normalize(toMouse) * influence * 0.01;
  }

  // Random jiggle
  float jx = hash(uTime + float(gl_VertexID) * 7.3) * 2.0 - 1.0;
  float jy = hash(uTime + float(gl_VertexID) * 13.7) * 2.0 - 1.0;
  totalForce += vec2(jx, jy) * uJiggle;

  // Paper-inspired Euler integration with improved stability
  vec2 accel = totalForce / max(aMass, 0.001);
  
  // Semi-implicit Euler integration for better stability
  // Update velocity first, then position using new velocity
  vec2 newVel = aVelocity + accel * uDt;
  
  // Apply global damping (velocity-based, not force-based)
  newVel = newVel * (1.0 - uDamping * uDt);
  
  // Clamp maximum velocity to prevent instability
  float maxVel = 5.0;
  float velMag = length(newVel);
  if (velMag > maxVel) {
    newVel = normalize(newVel) * maxVel;
  }
  
  vec2 newPos = aPosition + newVel * uDt;

  // Simple boundary collision (keep jello on screen)
  float boundary = 0.95;
  float restitution = 0.6; // bounce factor
  
  if (newPos.x < -boundary) {
    newPos.x = -boundary;
    newVel.x = abs(newVel.x) * restitution;
  } else if (newPos.x > boundary) {
    newPos.x = boundary;
    newVel.x = -abs(newVel.x) * restitution;
  }
  
  if (newPos.y < -boundary) {
    newPos.y = -boundary;
    newVel.y = abs(newVel.y) * restitution;
  } else if (newPos.y > boundary) {
    newPos.y = boundary;
    newVel.y = -abs(newVel.y) * restitution;
  }

  vPosition = newPos;
  vVelocity = newVel;
}
