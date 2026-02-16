/**
 * Word/character particles that drift, fade, and dissolve.
 * Each particle is a piece of text with position, opacity, scale, and lifetime.
 */

export interface TextParticle {
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  scale: number;
  rotation: number;
  rotationSpeed: number;
  age: number;
  fadeIn: number;
  hold: number;
  fadeOut: number;
  /** 'voice' = LLM utterance, 'user' = typed character, 'echo' = LLM response, 'name' = moment name, 'transform' = recontextualized word, 'whisper' = thinking fragment, 'title' = scene title */
  kind: "voice" | "user" | "echo" | "name" | "transform" | "whisper" | "title";
  /** Optional: scene ID for themed title styling */
  sceneId?: string;
  /** Font size in pixels */
  fontSize: number;
}

/** Scene theme: evocative names, fonts, colors for each scene */
export interface SceneTheme {
  names: string[];
  font: string;
  fillStyle: string;
  shadowColor: string;
  shadowBlur: number;
  strokeStyle?: string;
  strokeWidth?: number;
}

export const SCENE_THEMES: Record<string, SceneTheme> = {
  intro: {
    names: [
      "EMERGENCE", "GENESIS", "THE VOID STIRS", "FIRST LIGHT",
      "AWAKENING", "FROM NOTHING", "SIGNAL", "ORIGIN",
    ],
    font: '100 {{size}}px "Helvetica Neue", Helvetica, Arial, sans-serif',
    fillStyle: "rgba(140, 160, 200, 0.85)",
    shadowColor: "rgba(100, 140, 220, 0.6)",
    shadowBlur: 40,
  },
  build: {
    names: [
      "COMPLEXITY", "THE PATTERN GROWS", "DEEP STRUCTURE",
      "CONVERGENCE", "LATTICE", "UNFOLDING", "TESSELLATION",
    ],
    font: '600 {{size}}px "Courier New", "Lucida Console", monospace',
    fillStyle: "rgba(255, 230, 160, 0.95)",
    shadowColor: "rgba(255, 200, 80, 0.8)",
    shadowBlur: 45,
    strokeStyle: "rgba(0, 0, 0, 0.5)",
    strokeWidth: 2,
  },
  climax: {
    names: [
      "RUPTURE", "SUPERNOVA", "THE STORM", "CRITICAL MASS",
      "DETONATION", "SINGULARITY", "OVERLOAD", "IGNITION",
    ],
    font: '900 {{size}}px Impact, "Arial Black", sans-serif',
    fillStyle: "rgba(255, 120, 60, 0.95)",
    shadowColor: "rgba(255, 60, 0, 0.9)",
    shadowBlur: 60,
    strokeStyle: "rgba(0, 0, 0, 0.4)",
    strokeWidth: 2.5,
  },
  outro: {
    names: [
      "DISSOLUTION", "ASH", "THE LONG FADE", "ENTROPY",
      "REMNANT", "AFTERGLOW", "SILENCE", "RETURN",
    ],
    font: 'italic 200 {{size}}px Georgia, "Times New Roman", serif',
    fillStyle: "rgba(160, 150, 180, 0.7)",
    shadowColor: "rgba(120, 100, 160, 0.4)",
    shadowBlur: 25,
  },
};

const MAX_PARTICLES = 300;

export class TextParticleSystem {
  private _particles: TextParticle[] = [];
  private _lastTitleScene: string | null = null;

  /** Enforce particle cap — evict oldest particles when over limit */
  private _enforceLimit(): void {
    if (this._particles.length <= MAX_PARTICLES) return;
    // Sort by remaining life (ascending) and remove those closest to death
    const excess = this._particles.length - MAX_PARTICLES;
    // Find the particles with the most age (closest to dying) and remove them
    this._particles.sort((a, b) => {
      const lifeA = (a.fadeIn + a.hold + a.fadeOut) - a.age;
      const lifeB = (b.fadeIn + b.hold + b.fadeOut) - b.age;
      return lifeA - lifeB;
    });
    this._particles.splice(0, excess);
  }

  /**
   * Show a themed scene title. Picks a random evocative name from the scene's
   * theme and spawns it as letter-by-letter reveal with scene-specific styling.
   * Caller is responsible for dedup (main.ts tracks scene transitions).
   */
  showSceneTitle(sceneId: string, canvasW: number, canvasH: number): void {
    this._lastTitleScene = sceneId;

    const theme = SCENE_THEMES[sceneId];
    if (!theme) return;

    const title = theme.names[Math.floor(Math.random() * theme.names.length)];
    const baseX = canvasW * 0.5;
    const baseY = canvasH * (0.38 + Math.random() * 0.1);
    const fontSize = sceneId === "climax" ? 52 : 42;
    const charSpacing = fontSize * 0.65;
    const totalWidth = title.length * charSpacing;
    const startX = baseX - totalWidth * 0.5;
    const staggerDelay = 0.06;

    for (let i = 0; i < title.length; i++) {
      const ch = title[i];
      if (ch === " ") continue;

      this._particles.push({
        text: ch,
        x: startX + i * charSpacing + (Math.random() - 0.5) * 3,
        y: baseY + (Math.random() - 0.5) * 5,
        vx: (Math.random() - 0.5) * 2,
        vy: -2 - Math.random() * 3,
        opacity: 0,
        scale: 1,
        rotation: (Math.random() - 0.5) * 0.015,
        rotationSpeed: (Math.random() - 0.5) * 0.0005,
        age: -(i * staggerDelay),
        fadeIn: 1.8,
        hold: 3.5,
        fadeOut: 2.5,
        kind: "title",
        sceneId,
        fontSize,
      });
    }
  }

  /** Add a voice particle (LLM ambient utterance) — centered, slow drift, long life */
  addVoice(text: string, canvasW: number, canvasH: number): void {
    const cx = canvasW * (0.3 + Math.random() * 0.4);
    const cy = canvasH * (0.3 + Math.random() * 0.4);
    this._particles.push({
      text,
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 3,
      vy: -2 - Math.random() * 4,
      opacity: 0,
      scale: 1,
      rotation: (Math.random() - 0.5) * 0.02,
      rotationSpeed: (Math.random() - 0.5) * 0.0005,
      age: 0,
      fadeIn: 2.5,
      hold: 6.0,
      fadeOut: 4.0,
      kind: "voice",
      fontSize: 36 + Math.random() * 20,
    });
  }

  /**
   * Add a voice phrase with letter-by-letter reveal — each character fades in
   * with a stagger delay, as if the world is dreaming the words into existence.
   */
  addVoiceRevealed(text: string, canvasW: number, canvasH: number, kind: "voice" | "echo" | "name" | "transform" = "voice"): void {
    const baseX = canvasW * (0.25 + Math.random() * 0.5);
    const baseY = canvasH * (0.3 + Math.random() * 0.4);
    const charSpacing = kind === "name" ? 28 : 20;
    const totalWidth = text.length * charSpacing;
    const startX = baseX - totalWidth * 0.5;
    const staggerDelay = 0.1; // seconds between each character reveal — slower, more deliberate

    const baseFontSize = kind === "name" ? 48 : kind === "transform" ? 38 : kind === "echo" ? 34 : 36;
    const baseVy = kind === "name" ? -1 : -2;
    const holdTime = kind === "name" ? 8.0 : kind === "transform" ? 7.0 : 6.0;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === " ") continue; // skip spaces (they're implicit in positioning)

      this._particles.push({
        text: ch,
        x: startX + i * charSpacing + (Math.random() - 0.5) * 3,
        y: baseY + (Math.random() - 0.5) * 5,
        vx: (Math.random() - 0.5) * 1.5,
        vy: baseVy - Math.random() * 2,
        opacity: 0,
        scale: 1,
        rotation: (Math.random() - 0.5) * 0.015,
        rotationSpeed: (Math.random() - 0.5) * 0.0004,
        age: -(i * staggerDelay), // negative age = delayed start
        fadeIn: 2.0,
        hold: holdTime,
        fadeOut: 3.0,
        kind,
        fontSize: baseFontSize + Math.random() * 8,
      });
    }
  }

  /** Add an echo particle (LLM response to user) — similar to voice but slightly different feel */
  addEcho(text: string, canvasW: number, canvasH: number): void {
    const cx = canvasW * (0.25 + Math.random() * 0.5);
    const cy = canvasH * (0.35 + Math.random() * 0.3);
    this._particles.push({
      text,
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 4,
      vy: -3 - Math.random() * 4,
      opacity: 0,
      scale: 1,
      rotation: (Math.random() - 0.5) * 0.04,
      rotationSpeed: (Math.random() - 0.5) * 0.001,
      age: 0,
      fadeIn: 2.0,
      hold: 6.0,
      fadeOut: 3.5,
      kind: "echo",
      fontSize: 32 + Math.random() * 14,
    });
  }

  /** Add a name particle — the LLM names the moment. Large, centered, very long life. */
  addName(text: string, canvasW: number, canvasH: number): void {
    const cx = canvasW * (0.35 + Math.random() * 0.3);
    const cy = canvasH * (0.35 + Math.random() * 0.3);
    this._particles.push({
      text,
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -1 - Math.random() * 2,
      opacity: 0,
      scale: 1,
      rotation: (Math.random() - 0.5) * 0.01,
      rotationSpeed: (Math.random() - 0.5) * 0.0003,
      age: 0,
      fadeIn: 3.0,
      hold: 8.0,
      fadeOut: 5.0,
      kind: "name",
      fontSize: 48 + Math.random() * 20,
    });
  }

  /** Add a transform particle — recontextualized word. Medium size, gentle drift. */
  addTransform(text: string, canvasW: number, canvasH: number): void {
    const cx = canvasW * (0.3 + Math.random() * 0.4);
    const cy = canvasH * (0.3 + Math.random() * 0.4);
    this._particles.push({
      text,
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 4,
      vy: -2 - Math.random() * 4,
      opacity: 0,
      scale: 1,
      rotation: (Math.random() - 0.5) * 0.03,
      rotationSpeed: (Math.random() - 0.5) * 0.001,
      age: 0,
      fadeIn: 2.0,
      hold: 6.0,
      fadeOut: 3.5,
      kind: "transform",
      fontSize: 34 + Math.random() * 14,
    });
  }

  /** Add a whisper particle — fragment of machine thinking. Small, faint, gentle drift. */
  addWhisper(text: string, canvasW: number, canvasH: number): void {
    const cx = canvasW * (0.15 + Math.random() * 0.7);
    const cy = canvasH * (0.2 + Math.random() * 0.6);
    this._particles.push({
      text,
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 6,
      vy: -3 - Math.random() * 6,
      opacity: 0,
      scale: 1,
      rotation: (Math.random() - 0.5) * 0.04,
      rotationSpeed: (Math.random() - 0.5) * 0.002,
      age: 0,
      fadeIn: 1.0,
      hold: 3.5,
      fadeOut: 2.0,
      kind: "whisper",
      fontSize: 18 + Math.random() * 8,
    });
  }

  /** Add a user character particle — drifts left and slightly up (into the screen) */
  addUserChar(char: string, originX: number, originY: number): void {
    this._particles.push({
      text: char,
      x: originX + (Math.random() - 0.5) * 4,          // minimal jitter
      y: originY + (Math.random() - 0.5) * 3,
      vx: -(120 + Math.random() * 30),                  // fast leftward — typing speed creates char-width gaps
      vy: -(3 + Math.random() * 4),                     // gentle upward
      opacity: 0,
      scale: 1.0,
      rotation: 0,                                       // no tilt — keep readable
      rotationSpeed: 0,
      age: 0,
      fadeIn: 0.08,
      hold: 2.0,
      fadeOut: 2.5,
      kind: "user",
      fontSize: 26 + Math.random() * 6,
    });
  }

  /**
   * Update all particles. Call once per frame with delta time in seconds.
   * Optional audio params make particles react to sound:
   *   bass  → scale pulse (particles throb on kick)
   *   amplitude → velocity drift (louder = more movement)
   */
  update(dt: number, bass: number = 0, amplitude: number = 0): void {
    this._enforceLimit();
    let writeIdx = 0;
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed;

      // Dampen velocity — user particles barely damped so they maintain leftward drift
      const damp = p.kind === "user" ? 0.9995 : 0.985;
      p.vx *= damp;
      p.vy *= damp;

      // Audio-reactive drift — amplitude pushes particles outward from center
      if (amplitude > 0.05 && p.kind !== "user") {
        p.vx += (Math.random() - 0.5) * amplitude * 8 * dt;
        p.vy += (Math.random() - 0.5) * amplitude * 6 * dt;
      }

      // Compute opacity from lifecycle (negative age = waiting to appear)
      if (p.age < 0) {
        p.opacity = 0;
        this._particles[writeIdx++] = p;
        continue;
      }
      const totalLife = p.fadeIn + p.hold + p.fadeOut;
      if (p.age < p.fadeIn) {
        p.opacity = p.age / p.fadeIn;
      } else if (p.age < p.fadeIn + p.hold) {
        p.opacity = 1;
      } else if (p.age < totalLife) {
        p.opacity = 1 - (p.age - p.fadeIn - p.hold) / p.fadeOut;
      } else {
        // Dead — skip (don't copy to writeIdx)
        continue;
      }

      // Audio-reactive scale — bass pulses particle size, gentle breathing
      if (p.kind !== "user") {
        const breathe = Math.sin(p.age * 0.6) * 0.05;
        const bassPulse = bass * 0.2;
        p.scale = 1 + breathe + bassPulse;
      }

      this._particles[writeIdx++] = p;
    }
    // Trim dead particles from the end (no splice, no GC pressure)
    this._particles.length = writeIdx;
  }

  /** Get all living particles (read-only). */
  get particles(): readonly TextParticle[] {
    return this._particles;
  }

  get count(): number {
    return this._particles.length;
  }

  clear(): void {
    this._particles.length = 0;
  }
}
