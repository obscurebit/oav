import { BaseScene } from "./base-scene";
import fragSrc from "../shaders/intro.frag";
import type { SceneState } from "../scene";

export class IntroScene extends BaseScene {
  readonly id = "intro";
  protected readonly fragSrc = fragSrc;

  init(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject): void {
    super.init(gl, vao);
    // Spawn particles more frequently during intro (every 1.5 seconds)
    this._setParticleInterval(1500);
  }

  protected _spawnSceneParticles(state: SceneState): void {
    if (!state.gpuParticles) return;

    // Create nebula emergence particles - slow, ethereal
    const particleCount = 8 + Math.floor(Math.random() * 12); // 8-20 particles
    const centerX = (Math.random() - 0.5) * 0.6;
    const centerY = (Math.random() - 0.5) * 0.6;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.2;
      const radius = 0.1 + Math.random() * 0.3;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      state.gpuParticles.sparkle(x, y, {
        count: 1,
        speed: 0.2 + Math.random() * 0.3, // Slow emergence
        color: [0.4, 0.7, 1.0], // Blue ethereal
        size: 0.002 + Math.random() * 0.003,
        life: 3.0 + Math.random() * 2.0, // Long life
        spread: 0.1
      });
    }
  }
}
