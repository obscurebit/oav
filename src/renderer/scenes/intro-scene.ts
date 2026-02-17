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

    // Audio-reactive particle spawning
    const bassIntensity = state.audio?.bass ?? 0;
    const amplitude = state.audio?.amplitude ?? 0;
    
    // More particles when music is intense
    const baseCount = 8;
    const audioMultiplier = 1 + bassIntensity * 2 + amplitude;
    const particleCount = Math.floor(baseCount * audioMultiplier);
    
    // Create dreamlike nebula emergence particles
    const centerX = (Math.random() - 0.5) * 0.8;
    const centerY = (Math.random() - 0.5) * 0.8;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
      const radius = 0.1 + Math.random() * 0.4 * (1 + bassIntensity);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Color shifts with audio - more purple/violet with bass
      const r = 0.4 + bassIntensity * 0.2;
      const g = 0.5 + amplitude * 0.3;
      const b = 0.8 + bassIntensity * 0.2;

      state.gpuParticles.sparkle(x, y, {
        count: 1,
        speed: 0.15 + Math.random() * 0.25 + bassIntensity * 0.2,
        color: [r, g, b],
        size: 0.002 + Math.random() * 0.004 + amplitude * 0.002,
        life: 2.5 + Math.random() * 3.0 + bassIntensity * 2.0,
        spread: 0.1 + amplitude * 0.1
      });
    }
  }
}
