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
  /** 'voice' = LLM utterance, 'user' = typed character, 'echo' = LLM response, 'name' = moment name, 'transform' = recontextualized word, 'whisper' = thinking fragment */
  kind: "voice" | "user" | "echo" | "name" | "transform" | "whisper";
  /** Font size in pixels */
  fontSize: number;
}

export class TextParticleSystem {
  private _particles: TextParticle[] = [];

  /** Add a voice particle (LLM ambient utterance) — centered, slow drift, long life */
  addVoice(text: string, canvasW: number, canvasH: number): void {
    const cx = canvasW * (0.3 + Math.random() * 0.4);
    const cy = canvasH * (0.3 + Math.random() * 0.4);
    this._particles.push({
      text,
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 8,
      vy: -10 - Math.random() * 15,
      opacity: 0,
      scale: 1,
      rotation: (Math.random() - 0.5) * 0.05,
      rotationSpeed: (Math.random() - 0.5) * 0.002,
      age: 0,
      fadeIn: 1.5,
      hold: 3.0,
      fadeOut: 2.5,
      kind: "voice",
      fontSize: 28 + Math.random() * 12,
    });
  }

  /** Add an echo particle (LLM response to user) — similar to voice but slightly different feel */
  addEcho(text: string, canvasW: number, canvasH: number): void {
    const cx = canvasW * (0.25 + Math.random() * 0.5);
    const cy = canvasH * (0.35 + Math.random() * 0.3);
    this._particles.push({
      text,
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 12,
      vy: -8 - Math.random() * 10,
      opacity: 0,
      scale: 1,
      rotation: (Math.random() - 0.5) * 0.08,
      rotationSpeed: (Math.random() - 0.5) * 0.003,
      age: 0,
      fadeIn: 1.0,
      hold: 3.5,
      fadeOut: 2.0,
      kind: "echo",
      fontSize: 24 + Math.random() * 10,
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
      vx: (Math.random() - 0.5) * 3,
      vy: -4 - Math.random() * 6,
      opacity: 0,
      scale: 1,
      rotation: (Math.random() - 0.5) * 0.02,
      rotationSpeed: (Math.random() - 0.5) * 0.001,
      age: 0,
      fadeIn: 2.5,
      hold: 5.0,
      fadeOut: 3.5,
      kind: "name",
      fontSize: 36 + Math.random() * 16,
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
      vx: (Math.random() - 0.5) * 10,
      vy: -6 - Math.random() * 12,
      opacity: 0,
      scale: 1,
      rotation: (Math.random() - 0.5) * 0.06,
      rotationSpeed: (Math.random() - 0.5) * 0.003,
      age: 0,
      fadeIn: 1.2,
      hold: 4.0,
      fadeOut: 2.5,
      kind: "transform",
      fontSize: 26 + Math.random() * 12,
    });
  }

  /** Add a whisper particle — fragment of machine thinking. Very small, faint, fast drift. */
  addWhisper(text: string, canvasW: number, canvasH: number): void {
    const cx = canvasW * (0.15 + Math.random() * 0.7);
    const cy = canvasH * (0.2 + Math.random() * 0.6);
    this._particles.push({
      text,
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 20,
      vy: -15 - Math.random() * 20,
      opacity: 0,
      scale: 1,
      rotation: (Math.random() - 0.5) * 0.1,
      rotationSpeed: (Math.random() - 0.5) * 0.005,
      age: 0,
      fadeIn: 0.5,
      hold: 1.5,
      fadeOut: 1.0,
      kind: "whisper",
      fontSize: 14 + Math.random() * 6,
    });
  }

  /** Add a user character particle — scattered, faster fade, more energy */
  addUserChar(char: string, originX: number, originY: number): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 60;
    this._particles.push({
      text: char,
      x: originX + (Math.random() - 0.5) * 80,
      y: originY + (Math.random() - 0.5) * 60,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      opacity: 0,
      scale: 0.8 + Math.random() * 0.6,
      rotation: (Math.random() - 0.5) * 0.3,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      age: 0,
      fadeIn: 0.15,
      hold: 0.8,
      fadeOut: 1.2,
      kind: "user",
      fontSize: 20 + Math.random() * 16,
    });
  }

  /** Update all particles. Call once per frame with delta time in seconds. */
  update(dt: number): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed;

      // Dampen velocity
      p.vx *= 0.995;
      p.vy *= 0.995;

      // Compute opacity from lifecycle
      const totalLife = p.fadeIn + p.hold + p.fadeOut;
      if (p.age < p.fadeIn) {
        p.opacity = p.age / p.fadeIn;
      } else if (p.age < p.fadeIn + p.hold) {
        p.opacity = 1;
      } else if (p.age < totalLife) {
        p.opacity = 1 - (p.age - p.fadeIn - p.hold) / p.fadeOut;
      } else {
        // Dead — remove
        this._particles.splice(i, 1);
        continue;
      }

      // Subtle scale breathing for voice/echo
      if (p.kind !== "user") {
        p.scale = 1 + Math.sin(p.age * 0.8) * 0.03;
      }
    }
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
