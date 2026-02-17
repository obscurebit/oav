import { BaseScene } from "./base-scene";
import fragSrc from "../shaders/climax.frag";
import type { SceneState } from "../scene";

export class ClimaxScene extends BaseScene {
  readonly id = "climax";
  protected readonly fragSrc = fragSrc;

  init(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject): void {
    super.init(gl, vao);
    // Climax scene has intense particle bursts (every 800ms)
    this._setParticleInterval(800);
  }

  protected _spawnSceneParticles(state: SceneState): void {
    if (!state.gpuParticles) return;

    // Create intense climax particles - explosive, chaotic
    const intensity = state.params.get("intensity");
    const bass = state.params.get("bass");
    
    // Trigger more particles on bass hits
    const particleCount = Math.floor(10 + intensity * 20 + bass * 30);
    
    // Random explosion center
    const centerX = (Math.random() - 0.5) * 0.8;
    const centerY = (Math.random() - 0.5) * 0.8;

    // Create explosion burst
    state.gpuParticles.enhancedFirework({
      x: centerX,
      y: centerY,
      intensity: 0.8 + intensity * 0.2,
      color: intensity > 0.7 ? "white" : "red",
      type: Math.random() > 0.5 ? "chrysanthemum" : "willow"
    });

    // Add some chaotic sparkles
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 0.2 + Math.random() * 0.3;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;

      state.gpuParticles.sparkle(x, y, {
        count: 3,
        speed: 0.6 + Math.random() * 0.4,
        color: [1.0, 0.8, 0.2], // Orange-yellow
        size: 0.004 + Math.random() * 0.004,
        life: 1.5 + Math.random(),
        spread: 0.2
      });
    }
  }
}
