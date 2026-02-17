import { BaseScene } from "./base-scene";
import fragSrc from "../shaders/build.frag";
import type { SceneState } from "../scene";

export class BuildScene extends BaseScene {
  readonly id = "build";
  protected readonly fragSrc = fragSrc;

  init(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject): void {
    super.init(gl, vao);
    // Build scene has steady construction particles (every 1 second)
    this._setParticleInterval(1000);
  }

  protected _spawnSceneParticles(state: SceneState): void {
    if (!state.gpuParticles) return;

    // Create construction particles - organized, building upward
    const particleCount = 5 + Math.floor(Math.random() * 10); // 5-15 particles
    const baseY = -0.8; // Start from bottom
    const spreadX = 0.4;

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * spreadX;
      const y = baseY + Math.random() * 0.3; // Build upward
      const progress = state.progress; // Use scene progress for variation

      state.gpuParticles.fountain(x, y, {
        count: 1,
        speed: 0.4 + progress * 0.3, // Faster as scene progresses
        color: [0.8, 0.6, 0.3], // Golden construction
        size: 0.003 + progress * 0.002,
        life: 2.0 + Math.random(),
        spread: 0.05
      });
    }
  }
}
