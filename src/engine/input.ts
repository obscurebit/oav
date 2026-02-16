/**
 * Input handler — the world senses your presence, not your commands.
 *
 * Instead of direct mouse position → param mapping (which feels like a control panel),
 * we track mouse *velocity* and *energy* as abstract signals. The world responds to:
 *   - **Movement energy** — how fast you're moving (agitation vs stillness)
 *   - **Horizontal tendency** — left/right sweep gently nudges warmth
 *   - **Vertical tendency** — up/down sweep gently nudges depth
 *   - **Stillness** — no movement slowly calms the world
 *
 * All signals decay over time. You influence the world, you don't control it.
 * Pull model: main loop reads state each frame, no events propagated.
 */

export class Input {
  /** Mouse X normalized [0, 1] (left to right) */
  mouseX = 0.5;
  /** Mouse Y normalized [0, 1] (top to bottom) */
  mouseY = 0.5;

  /** Smoothed movement energy [0, 1] — how active the mouse is */
  energy = 0;
  /** Smoothed horizontal velocity [-1, 1] — left/right tendency */
  horizontalFlow = 0;
  /** Smoothed vertical velocity [-1, 1] — up/down tendency */
  verticalFlow = 0;
  /** Seconds since last mouse movement */
  stillness = 0;

  /** Currently held keys */
  private _keys = new Set<string>();
  private _canvas: HTMLElement;
  private _prevX = 0.5;
  private _prevY = 0.5;
  private _hasMoved = false;

  constructor(canvas: HTMLElement) {
    this._canvas = canvas;
    this._bindMouse();
    this._bindKeyboard();
  }

  /** Check if a key is currently held. */
  isDown(key: string): boolean {
    return this._keys.has(key.toLowerCase());
  }

  private _bindMouse(): void {
    this._canvas.addEventListener("mousemove", (e: Event) => {
      const me = e as MouseEvent;
      const rect = this._canvas.getBoundingClientRect();
      this.mouseX = (me.clientX - rect.left) / rect.width;
      this.mouseY = (me.clientY - rect.top) / rect.height;
      this._hasMoved = true;
    });
  }

  private _bindKeyboard(): void {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      this._keys.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e: KeyboardEvent) => {
      this._keys.delete(e.key.toLowerCase());
    });
  }

  /** Update movement signals each frame. Call before applyTo(). */
  tick(dt: number): void {
    if (dt <= 0) return;

    // Raw velocity this frame (normalized coordinates per second)
    const dx = (this.mouseX - this._prevX) / dt;
    const dy = (this.mouseY - this._prevY) / dt;
    this._prevX = this.mouseX;
    this._prevY = this.mouseY;

    // Movement speed (0 = still, ~2-5 = fast sweep)
    const speed = Math.sqrt(dx * dx + dy * dy);

    if (this._hasMoved) {
      this.stillness = 0;
      this._hasMoved = false;
    } else {
      this.stillness += dt;
    }

    // Smooth energy with exponential decay — rises fast, falls slowly
    const targetEnergy = Math.min(speed * 0.3, 1.0);
    const riseRate = 8.0;  // fast response to movement
    const fallRate = 0.8;  // slow calm-down
    const rate = targetEnergy > this.energy ? riseRate : fallRate;
    this.energy += (targetEnergy - this.energy) * Math.min(rate * dt, 1.0);

    // Smooth directional flow — gentle, lagging behind actual movement
    const flowSmooth = 3.0;
    this.horizontalFlow += (Math.max(-1, Math.min(1, dx * 0.5)) - this.horizontalFlow) * Math.min(flowSmooth * dt, 1.0);
    this.verticalFlow += (Math.max(-1, Math.min(1, dy * 0.5)) - this.verticalFlow) * Math.min(flowSmooth * dt, 1.0);

    // Decay flow toward zero when still
    if (this.stillness > 0.5) {
      const decayRate = 0.5;
      this.horizontalFlow *= Math.exp(-decayRate * dt);
      this.verticalFlow *= Math.exp(-decayRate * dt);
    }
  }

  /**
   * Apply input influence to parameter store each frame.
   * The world *responds* to your presence — you don't control it directly.
   * All nudges are scaled by dt for frame-rate independence.
   */
  applyTo(params: import("./params").ParameterStore, dt: number): void {
    if (dt <= 0) return;

    // Movement energy gently nudges speed — the world gets more active when you do
    // Blend toward a slightly elevated speed when energy is high
    const speedTarget = params.get("speed") + this.energy * 0.8;
    const speedBlend = Math.min(this.energy * 2.0 * dt, 0.05);
    params.set("speed", params.get("speed") + (speedTarget - params.get("speed")) * speedBlend);

    // Horizontal flow subtly shifts warmth — sweeping left cools, right warms
    params.set("warmth", params.get("warmth") + this.horizontalFlow * 0.3 * dt);

    // Vertical flow subtly shifts intensity — upward movement brightens
    params.set("intensity", params.get("intensity") - this.verticalFlow * 0.2 * dt);

    // Fast movement adds a touch of warp — the world ripples with your energy
    params.set("warp", params.get("warp") + this.energy * 0.3 * dt);

    // Stillness slowly calms harsh effects (only after 3s of no movement)
    if (this.stillness > 3.0) {
      const calm = Math.min((this.stillness - 3.0) * 0.01 * dt, 0.01);
      params.set("glitch", params.get("glitch") * (1.0 - calm));
      params.set("strobe", params.get("strobe") * (1.0 - calm));
      params.set("aberration", params.get("aberration") * (1.0 - calm));
    }
  }

  dispose(): void {
    // In a real app we'd remove listeners; for a trackmo this is fine
  }
}
