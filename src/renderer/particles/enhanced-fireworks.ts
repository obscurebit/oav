/**
 * Enhanced Firework System - Professional firework effects with trails, sparkles, and multi-stage explosions.
 * 
 * Based on real firework physics:
 * - Initial launch trail (rising rocket)
 * - Primary explosion with radial burst
 * - Secondary explosions (chrysanthemum effect)
 * - Sparkle trails that fade over time
 * - Color gradients from white-hot to cool colors
 * - Gravity and air resistance
 */

export interface FireworkConfig {
  x: number;
  y: number;
  intensity: number;
  color: string; // "red", "blue", "green", "gold", "purple", "white", "rainbow"
  type: string;  // "chrysanthemum", "willow", "palm", "crossette", "salute"
}

export class EnhancedFireworks {
  private _gpuParticles: any;
  private _launchTrailParticles: any;
  private _sparkleParticles: any;
  
  constructor(gpuParticles: any) {
    this._gpuParticles = gpuParticles;
    // We'll use the same GPU system but with different parameters for each effect
  }
  
  /** Create a professional firework with multiple stages */
  createFirework(config: FireworkConfig): void {
    switch (config.type) {
      case "chrysanthemum":
        this._createChrysanthemum(config);
        break;
      case "willow":
        this._createWillow(config);
        break;
      case "palm":
        this._createPalm(config);
        break;
      case "crossette":
        this._createCrossette(config);
        break;
      case "salute":
        this._createSalute(config);
        break;
      default:
        this._createChrysanthemum(config);
    }
  }
  
  /** Chrysanthemum - classic spherical burst with long trails */
  private _createChrysanthemum(config: FireworkConfig): void {
    const colors = this._getFireworkColors(config.color);
    
    // Stage 1: Launch trail (rising rocket) - varied launch height
    const launchHeight = 0.2 + Math.random() * 0.2;
    this._createLaunchTrail(config.x, config.y - launchHeight, config.intensity);
    
    // Stage 2: Primary explosion (delayed) - varied timing
    setTimeout(() => {
      // Varied explosion size and characteristics
      const particleCount = Math.floor(100 + Math.random() * 100 * config.intensity);
      const speed = 2.0 + Math.random() * 1.5;
      const trailLength = 0.6 + Math.random() * 0.6;
      const gravity = 0.1 + Math.random() * 0.1;
      
      this._createPrimaryBurst(config.x, config.y, config.intensity, colors, {
        particleCount,
        speed,
        spread: Math.PI * 2,
        trailLength,
        gravity,
        sizeVariation: 0.5 + Math.random() * 0.5,
        fadeRate: 0.7 + Math.random() * 0.3
      });
      
      // Stage 3: Secondary sparkle trail - varied timing and intensity
      setTimeout(() => {
        const sparkleIntensity = 0.4 + Math.random() * 0.4;
        this._createSparkleBurst(config.x, config.y, config.intensity * sparkleIntensity, colors);
      }, 150 + Math.random() * 200);
      
      // Stage 4: Late glitter effect (sometimes)
      if (Math.random() < 0.3) {
        setTimeout(() => {
          this._createGlitterBurst(config.x, config.y, config.intensity * 0.3, colors);
        }, 400 + Math.random() * 300);
      }
    }, 500 + Math.random() * 200);
  }
  
  /** Willow - long falling trails like willow branches */
  private _createWillow(config: FireworkConfig): void {
    const colors = this._getFireworkColors(config.color);
    
    // Launch trail - varied height
    const launchHeight = 0.25 + Math.random() * 0.15;
    this._createLaunchTrail(config.x, config.y - launchHeight, config.intensity);
    
    setTimeout(() => {
      // Primary burst with heavy particles that fall - varied characteristics
      const particleCount = Math.floor(80 + Math.random() * 80 * config.intensity);
      const speed = 1.2 + Math.random() * 0.8;
      const trailLength = 0.8 + Math.random() * 0.6;
      const gravity = 0.2 + Math.random() * 0.15;
      const size = 0.012 + Math.random() * 0.012;
      
      this._createPrimaryBurst(config.x, config.y, config.intensity, colors, {
        particleCount,
        speed,
        spread: Math.PI * 2,
        trailLength,
        gravity,
        size,
        fadeRate: 0.5 + Math.random() * 0.3,
        sizeVariation: 0.6
      });
      
      // Multiple stages of falling sparkles for natural willow effect
      setTimeout(() => {
        this._createFallingSparkles(config.x, config.y, config.intensity * 0.6, colors);
      }, 200 + Math.random() * 200);
      
      setTimeout(() => {
        this._createFallingSparkles(config.x, config.y, config.intensity * 0.4, colors);
      }, 600 + Math.random() * 300);
      
      // Late falling glitter
      if (Math.random() < 0.4) {
        setTimeout(() => {
          this._createGlitterBurst(config.x, config.y, config.intensity * 0.3, colors);
        }, 1000 + Math.random() * 500);
      }
    }, 700 + Math.random() * 300);
  }
  
  /** Palm - vertical burst with falling palm-like trails */
  private _createPalm(config: FireworkConfig): void {
    const colors = this._getFireworkColors(config.color);
    
    this._createLaunchTrail(config.x, config.y - 0.3, config.intensity);
    
    setTimeout(() => {
      // Vertical burst with some horizontal spread
      this._createPrimaryBurst(config.x, config.y, config.intensity, colors, {
        particleCount: 100,
        speed: 2.0,
        spread: Math.PI * 0.6, // Less spread, more vertical
        trailLength: 1.0,
        gravity: 0.3,
        verticalBias: -0.7 // Bias upward
      });
      
      // Falling palm fronds
      setTimeout(() => {
        this._createPalmFronds(config.x, config.y, config.intensity * 0.5, colors);
      }, 400);
    }, 700);
  }
  
  /** Crossette - breaks into multiple smaller explosions */
  private _createCrossette(config: FireworkConfig): void {
    const colors = this._getFireworkColors(config.color);
    
    this._createLaunchTrail(config.x, config.y - 0.3, config.intensity);
    
    setTimeout(() => {
      // Primary burst
      this._createPrimaryBurst(config.x, config.y, config.intensity, colors, {
        particleCount: 80,
        speed: 2.2,
        spread: Math.PI * 2,
        trailLength: 0.6,
        gravity: 0.2
      });
      
      // Secondary explosions at multiple points
      setTimeout(() => {
        for (let i = 0; i < 4; i++) {
          const angle = (Math.PI * 2 * i) / 4;
          const distance = 0.15;
          const sx = config.x + Math.cos(angle) * distance;
          const sy = config.y + Math.sin(angle) * distance;
          
          this._createMiniBurst(sx, sy, config.intensity * 0.4, colors);
        }
      }, 500);
    }, 600);
  }
  
  /** Salute - loud white flash with quick burst */
  private _createSalute(config: FireworkConfig): void {
    this._createLaunchTrail(config.x, config.y - 0.3, config.intensity);
    
    setTimeout(() => {
      // Bright white flash
      this._createFlashBurst(config.x, config.y, config.intensity);
      
      // Quick white burst
      setTimeout(() => {
        this._createPrimaryBurst(config.x, config.y, config.intensity, [[1, 1, 1], [1, 0.9, 0.8]], {
          particleCount: 200,
          speed: 3.0,
          spread: Math.PI * 2,
          trailLength: 0.3,
          gravity: 0.15,
          life: 0.8 // Shorter life for salute
        });
      }, 100);
    }, 400);
  }
  
  /** Create launch trail effect */
  private _createLaunchTrail(x: number, y: number, intensity: number): void {
    this._gpuParticles.emit({
      x, y,
      count: Math.floor(30 * intensity),
      speed: 0.3,
      spread: Math.PI * 0.2, // Narrow upward cone
      color: [1.0, 0.8, 0.4], // Orange trail
      colorVariance: 0.1,
      life: 0.8,
      lifeVariance: 0.2,
      size: 0.008,
      sizeVariance: 0.002,
    });
  }
  
  /** Create primary explosion burst */
  private _createPrimaryBurst(
    x: number, y: number, intensity: number, 
    colors: number[][], 
    options: any
  ): void {
    const particleCount = Math.floor(options.particleCount * intensity);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speedVariation = 0.8 + Math.random() * 0.4;
      const finalSpeed = options.speed * speedVariation * intensity;
      
      // Add vertical bias if specified
      let vx = Math.cos(angle) * finalSpeed;
      let vy = Math.sin(angle) * finalSpeed;
      
      if (options.verticalBias) {
        vy += options.verticalBias * finalSpeed * 0.5;
      }
      
      // Select color from palette
      const colorIndex = Math.floor(Math.random() * colors.length);
      const color = colors[colorIndex];
      
      this._gpuParticles.emit({
        x, y,
        count: 1,
        speed: finalSpeed,
        spread: 0, // Direction already calculated
        color,
        colorVariance: 0.2,
        life: options.life || 1.5,
        lifeVariance: 0.3,
        size: options.size || 0.015,
        sizeVariance: 0.005,
      });
    }
  }
  
  /** Create sparkle burst effect */
  private _createSparkleBurst(x: number, y: number, intensity: number, colors: number[][]): void {
    for (let i = 0; i < 50 * intensity; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      
      this._gpuParticles.emit({
        x, y,
        count: 1,
        speed: speed * intensity,
        spread: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        colorVariance: 0.3,
        life: 0.8,
        lifeVariance: 0.4,
        size: 0.005,
        sizeVariance: 0.003,
      });
    }
  }
  
  /** Create glitter burst effect - fine sparkles with slow fade */
  private _createGlitterBurst(x: number, y: number, intensity: number, colors: number[][]): void {
    for (let i = 0; i < 100 * intensity; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.2 + Math.random() * 0.6; // Slower, more delicate
      
      this._gpuParticles.emit({
        x, y,
        count: 1,
        speed: speed * intensity,
        spread: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        colorVariance: 0.2,
        life: 1.5, // Longer life for glitter
        lifeVariance: 0.6,
        size: 0.002, // Smaller, finer particles
        sizeVariance: 0.002,
      });
    }
  }
  
  /** Create falling sparkles */
  private _createFallingSparkles(x: number, y: number, intensity: number, colors: number[][]): void {
    for (let i = 0; i < 80 * intensity; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.8;
      
      this._gpuParticles.emit({
        x, y,
        count: 1,
        speed: speed * intensity,
        spread: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        colorVariance: 0.4,
        life: 2.0, // Longer life for falling effect
        lifeVariance: 0.5,
        size: 0.004,
        sizeVariance: 0.002,
      });
    }
  }
  
  /** Create palm frond trails */
  private _createPalmFronds(x: number, y: number, intensity: number, colors: number[][]): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 0.4 + Math.random() * 0.3;
      
      this._gpuParticles.emit({
        x, y,
        count: 5, // Small clusters for frond effect
        speed: speed * intensity,
        spread: Math.PI * 0.1, // Small spread for frond
        color: colors[Math.floor(Math.random() * colors.length)],
        colorVariance: 0.2,
        life: 1.8,
        lifeVariance: 0.3,
        size: 0.006,
        sizeVariance: 0.002,
      });
    }
  }
  
  /** Create mini burst for crossette effect */
  private _createMiniBurst(x: number, y: number, intensity: number, colors: number[][]): void {
    this._createPrimaryBurst(x, y, intensity, colors, {
      particleCount: 30,
      speed: 1.5,
      spread: Math.PI * 2,
      trailLength: 0.4,
      gravity: 0.2,
      life: 1.0
    });
  }
  
  /** Create bright flash effect */
  private _createFlashBurst(x: number, y: number, intensity: number): void {
    this._gpuParticles.emit({
      x, y,
      count: Math.floor(20 * intensity),
      speed: 0.1,
      spread: Math.PI * 2,
      color: [1.0, 1.0, 1.0], // Pure white
      colorVariance: 0,
      life: 0.2, // Very short flash
      lifeVariance: 0.05,
      size: 0.03, // Large flash
      sizeVariance: 0.01,
    });
  }
  
  /** Get firework color palette */
  private _getFireworkColors(colorName: string): number[][] {
    const palettes: Record<string, number[][]> = {
      "red": [
        [1.0, 0.2, 0.1],    // Deep red
        [1.0, 0.4, 0.2],    // Orange-red
        [1.0, 0.6, 0.3],    // Light red
        [1.0, 0.8, 0.5],    // Pink-red
      ],
      "blue": [
        [0.2, 0.4, 1.0],    // Deep blue
        [0.3, 0.6, 1.0],    // Medium blue
        [0.5, 0.7, 1.0],    // Light blue
        [0.7, 0.8, 1.0],    // Pale blue
      ],
      "green": [
        [0.1, 0.8, 0.2],    // Deep green
        [0.3, 0.9, 0.4],    // Bright green
        [0.5, 1.0, 0.5],    // Light green
        [0.7, 1.0, 0.7],    // Pale green
      ],
      "gold": [
        [1.0, 0.8, 0.1],    // Gold
        [1.0, 0.9, 0.3],    // Light gold
        [1.0, 0.7, 0.2],    // Orange gold
        [1.0, 0.6, 0.1],    // Dark gold
      ],
      "purple": [
        [0.6, 0.2, 0.8],    // Deep purple
        [0.7, 0.4, 0.9],    // Medium purple
        [0.8, 0.6, 1.0],    // Light purple
        [0.9, 0.7, 1.0],    // Pale purple
      ],
      "white": [
        [1.0, 1.0, 1.0],    // Pure white
        [1.0, 0.9, 0.9],    // Warm white
        [0.9, 0.9, 1.0],    // Cool white
        [1.0, 1.0, 0.9],    // Yellow white
      ],
      "rainbow": [
        [1.0, 0.2, 0.2],    // Red
        [1.0, 0.6, 0.2],    // Orange
        [1.0, 1.0, 0.2],    // Yellow
        [0.2, 1.0, 0.2],    // Green
        [0.2, 0.6, 1.0],    // Blue
        [0.6, 0.2, 1.0],    // Purple
      ]
    };
    
    return palettes[colorName] || palettes["white"];
  }
}
