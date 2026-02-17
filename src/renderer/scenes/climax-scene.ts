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

    // Audio-reactive climax particles
    const bassIntensity = state.audio?.bass ?? 0;
    const amplitude = state.audio?.amplitude ?? 0;
    const beatHit = state.audio?.beatHit ?? false;
    const intensity = state.params.get("intensity");
    
    // Explosive bursts on beat hits
    const particleCount = Math.floor(15 + intensity * 25 + bassIntensity * 40);
    
    // Create multiple explosion centers on strong beats
    const explosionCount = beatHit ? 2 : 1;
    
    for (let e = 0; e < explosionCount; e++) {
      const centerX = (Math.random() - 0.5) * 1.0;
      const centerY = (Math.random() - 0.5) * 1.0;

      // Dynamic firework type based on audio
      const fireworkType = bassIntensity > 0.6 ? "salute" : 
                          amplitude > 0.5 ? "chrysanthemum" : "willow";
      
      // Color shifts with audio intensity
      const color = bassIntensity > 0.7 ? "white" :
                   amplitude > 0.6 ? "rainbow" : "red";

      state.gpuParticles.enhancedFirework({
        x: centerX,
        y: centerY,
        intensity: 0.8 + intensity * 0.3 + bassIntensity * 0.4,
        color,
        type: fireworkType
      });
    }

    // Add chaotic sparkles that respond to high frequencies
    const sparkleCount = Math.floor(5 + amplitude * 10 + (state.audio?.high ?? 0) * 15);
    for (let i = 0; i < sparkleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 0.2 + Math.random() * 0.4;
      const x = (Math.random() - 0.5) * 1.2 + Math.cos(angle) * distance;
      const y = (Math.random() - 0.5) * 1.2 + Math.sin(angle) * distance;

      // Dynamic color based on audio spectrum
      const r = 0.8 + bassIntensity * 0.2;
      const g = 0.6 + amplitude * 0.4;
      const b = 0.2 + (state.audio?.high ?? 0) * 0.8;

      state.gpuParticles.sparkle(x, y, {
        count: Math.floor(2 + amplitude * 3),
        speed: 0.5 + Math.random() * 0.5 + bassIntensity * 0.3,
        color: [r, g, b],
        size: 0.003 + Math.random() * 0.005 + amplitude * 0.003,
        life: 1.0 + Math.random() * 2.0 + bassIntensity,
        spread: 0.2
      });
    }
  }
}
