import { BaseScene } from "./base-scene";
import fragSrc from "../shaders/outro.frag";
import type { SceneState } from "../scene";

export class OutroScene extends BaseScene {
  readonly id = "outro";
  protected readonly fragSrc = fragSrc;

  init(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject): void {
    super.init(gl, vao);
    // Outro scene has fading particles (every 2.5 seconds)
    this._setParticleInterval(2500);
  }

  protected _spawnSceneParticles(state: SceneState): void {
    if (!state.gpuParticles) return;

    // Create dissolution particles - fading away, ash-like
    const particleCount = 6 + Math.floor(Math.random() * 8); // 6-14 particles
    
    for (let i = 0; i < particleCount; i++) {
      // Particles drift upward and fade
      const x = (Math.random() - 0.5) * 1.2;
      const y = -0.8 + Math.random() * 0.4; // Start lower, drift up
      
      state.gpuParticles.sparkle(x, y, {
        count: 1,
        speed: 0.1 + Math.random() * 0.1, // Very slow drift
        color: [0.3, 0.3, 0.3], // Ash gray
        size: 0.002 + Math.random() * 0.002,
        life: 4.0 + Math.random() * 2.0, // Long fade
        spread: 0.15
      });
    }
  }
}
