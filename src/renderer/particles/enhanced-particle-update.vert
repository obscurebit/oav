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
uniform vec3 uWind;          // wind force

// Enhanced hash for better pseudo-randomness
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Improved turbulence with multiple octaves
vec3 turbulenceForce(vec3 pos, float seed) {
  float h1 = hash(seed + pos.x * 13.7) * 2.0 - 1.0;
  float h2 = hash(seed + pos.y * 17.3) * 2.0 - 1.0;
  float h3 = hash(seed + pos.z * 23.1) * 2.0 - 1.0;
  
  // Add time-based variation for more organic movement
  float timeFactor = sin(uTime * 2.0 + seed) * 0.5 + 0.5;
  
  return vec3(h1, h2, h3) * timeFactor;
}

// Air resistance calculation
vec3 applyDrag(vec3 velocity, float dragCoeff) {
  float speed = length(velocity);
  if (speed < 0.001) return velocity;
  
  // Quadratic drag: F_drag = -0.5 * ρ * C_d * A * v²
  vec3 dragForce = -velocity * speed * dragCoeff;
  return velocity + dragForce * uDt;
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

  // Enhanced physics update
  vec3 newVelocity = aVelocity;
  
  // Apply gravity
  newVelocity += uGravity * uDt;
  
  // Apply wind
  newVelocity += uWind * uDt;
  
  // Apply air resistance
  newVelocity = applyDrag(newVelocity, uDrag);
  
  // Apply turbulence with particle-specific seed
  float particleSeed = hash(aPosition.x + aPosition.y * 10.0 + aPosition.z * 100.0);
  vec3 turbulence = turbulenceForce(aPosition, particleSeed) * uTurbulence;
  newVelocity += turbulence * uDt;

  // Update position
  vec3 newPosition = aPosition + newVelocity * uDt;

  // Enhanced color evolution over lifetime
  float lifeRatio = newAge / aLife;
  
  // Color temperature shift (hot to cool)
  vec3 hotColor = vec3(1.0, 0.9, 0.7);  // White-hot
  vec3 coolColor = aColor.rgb;            // Original color
  vec3 temperatureColor = mix(hotColor, coolColor, lifeRatio);
  
  // Fade out towards end of life
  float fadeStart = 0.7;
  float alphaFade = lifeRatio > fadeStart ? 
    1.0 - (lifeRatio - fadeStart) / (1.0 - fadeStart) : 1.0;
  
  // Size evolution (particles shrink as they cool)
  float sizeEvolution = 1.0 - lifeRatio * 0.5;
  float newSize = aSize * sizeEvolution;

  // Output new state
  vPosition = newPosition;
  vVelocity = newVelocity;
  vColor = vec4(temperatureColor, aColor.a * alphaFade);
  vLife = aLife;
  vAge = newAge;
  vSize = newSize;
}
