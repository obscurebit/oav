/**
 * Input handler — the world senses your gestures, not your coordinates.
 *
 * Only click-and-drag creates influence. Hovering does nothing.
 * The world reads your *intent* from gesture shape:
 *
 *   - **Tap** (click < 200ms, no drag) — a heartbeat pulse
 *   - **Press & hold** (> 500ms, no drag) — deepening: bloom, vignette, warmth
 *   - **Rapid clicks** (3+ in 1s) — agitation: speed, glitch, strobe
 *   - **Slow drag** (pressed + slow movement) — contemplative: warp, wobble
 *   - **Fast drag** (pressed + fast movement) — violent: energy, aberration, spin
 *   - **Stillness** (no interaction for 3s+) — calms harsh effects
 *
 * All signals decay over time. You influence the world, you don't control it.
 * Pull model: main loop calls tick(dt) then applyTo(params, dt) each frame.
 */

export class Input {
  /** Mouse X normalized [0, 1] */
  mouseX = 0.5;
  /** Mouse Y normalized [0, 1] */
  mouseY = 0.5;

  // --- Gesture signals (read by applyTo) ---

  /** Smoothed drag energy [0, 1] — how fast you're dragging */
  dragEnergy = 0;
  /** Smoothed horizontal drag flow [-1, 1] */
  horizontalFlow = 0;
  /** Smoothed vertical drag flow [-1, 1] */
  verticalFlow = 0;
  /** How long the mouse button has been held [seconds] (0 if not pressed) */
  holdDuration = 0;
  /** Rapid click intensity [0, 1] — spikes with fast repeated clicks, decays */
  clickFlurry = 0;
  /** Seconds since last mouse interaction (click, drag, or release) */
  stillness = 0;
  /** True during the frame a tap was detected (click < 200ms, minimal drag) */
  tapped = false;
  /** Tap position in clip space [-1, 1] (set on tap frame) */
  tapX = 0;
  tapY = 0;

  // --- Internal state ---

  /** Whether the mouse button is currently pressed */
  private _pressed = false;
  /** Position when mousedown started */
  private _downX = 0;
  private _downY = 0;
  /** Time of mousedown (performance.now ms) */
  private _downTime = 0;
  /** Total drag distance accumulated during this press */
  private _dragDistance = 0;
  /** Recent click timestamps for flurry detection */
  private _clickTimes: number[] = [];

  private _keys = new Set<string>();
  private _canvas: HTMLElement;
  private _prevX = 0.5;
  private _prevY = 0.5;

  constructor(canvas: HTMLElement) {
    this._canvas = canvas;
    this._bindMouse();
    this._bindKeyboard();
  }

  /** Check if a key is currently held. */
  isDown(key: string): boolean {
    return this._keys.has(key.toLowerCase());
  }

  /** Whether the mouse button is currently pressed. */
  get pressed(): boolean { return this._pressed; }

  /** Current mouse X in clip space [-1, 1]. */
  get dragX(): number { return this.mouseX * 2 - 1; }
  /** Current mouse Y in clip space [-1, 1] (Y-flipped for GL). */
  get dragY(): number { return -(this.mouseY * 2 - 1); }

  private _bindMouse(): void {
    this._canvas.addEventListener("mousemove", (e: Event) => {
      const me = e as MouseEvent;
      const rect = this._canvas.getBoundingClientRect();
      this.mouseX = (me.clientX - rect.left) / rect.width;
      this.mouseY = (me.clientY - rect.top) / rect.height;
    });

    this._canvas.addEventListener("mousedown", (e: Event) => {
      const me = e as MouseEvent;
      const rect = this._canvas.getBoundingClientRect();
      this._pressed = true;
      this._downX = (me.clientX - rect.left) / rect.width;
      this._downY = (me.clientY - rect.top) / rect.height;
      this._downTime = performance.now();
      this._dragDistance = 0;
      this.mouseX = this._downX;
      this.mouseY = this._downY;
      this._prevX = this._downX;
      this._prevY = this._downY;
    });

    const handleUp = () => {
      if (!this._pressed) return;
      this._pressed = false;

      const elapsed = performance.now() - this._downTime;
      const now = performance.now();

      // Detect tap: short press with minimal drag
      if (elapsed < 200 && this._dragDistance < 0.03) {
        this.tapped = true;
        // Store tap position in clip space [-1, 1]
        this.tapX = this._downX * 2 - 1;
        this.tapY = -(this._downY * 2 - 1); // flip Y for GL
      }

      // Record click time for flurry detection
      this._clickTimes.push(now);
      // Keep only clicks within the last 1 second
      this._clickTimes = this._clickTimes.filter(t => now - t < 1000);

      // Update flurry based on recent click count
      const recentClicks = this._clickTimes.length;
      if (recentClicks >= 3) {
        this.clickFlurry = Math.min((recentClicks - 2) * 0.35, 1.0);
      }

      this.holdDuration = 0;
    };

    this._canvas.addEventListener("mouseup", handleUp);
    this._canvas.addEventListener("mouseleave", handleUp);
  }

  private _bindKeyboard(): void {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      this._keys.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e: KeyboardEvent) => {
      this._keys.delete(e.key.toLowerCase());
    });
  }

  /** Update gesture signals each frame. Call before applyTo(). */
  tick(dt: number): void {
    if (dt <= 0) return;

    // Clear one-frame flags from previous frame
    this.tapped = false;

    if (this._pressed) {
      // Track drag velocity
      const dx = (this.mouseX - this._prevX) / dt;
      const dy = (this.mouseY - this._prevY) / dt;
      const speed = Math.sqrt(dx * dx + dy * dy);

      // Accumulate drag distance
      this._dragDistance += Math.sqrt(
        (this.mouseX - this._prevX) ** 2 + (this.mouseY - this._prevY) ** 2
      );

      // Hold duration
      this.holdDuration += dt;

      // Drag energy — rises fast, falls slowly
      const targetEnergy = Math.min(speed * 0.3, 1.0);
      const rate = targetEnergy > this.dragEnergy ? 8.0 : 1.5;
      this.dragEnergy += (targetEnergy - this.dragEnergy) * Math.min(rate * dt, 1.0);

      // Directional flow (only while dragging)
      const flowSmooth = 3.0;
      this.horizontalFlow += (clamp(dx * 0.5, -1, 1) - this.horizontalFlow) * Math.min(flowSmooth * dt, 1.0);
      this.verticalFlow += (clamp(dy * 0.5, -1, 1) - this.verticalFlow) * Math.min(flowSmooth * dt, 1.0);

      this.stillness = 0;
    } else {
      // Not pressed — decay all signals
      this.dragEnergy *= Math.exp(-2.0 * dt);
      this.horizontalFlow *= Math.exp(-1.5 * dt);
      this.verticalFlow *= Math.exp(-1.5 * dt);
      this.stillness += dt;
    }

    // Decay click flurry
    this.clickFlurry *= Math.exp(-2.0 * dt);

    this._prevX = this.mouseX;
    this._prevY = this.mouseY;
  }

  /**
   * Apply gesture influence to parameter store each frame.
   * The world *responds* to your touch — you don't control it directly.
   */
  applyTo(params: import("./params").ParameterStore, dt: number): void {
    if (dt <= 0) return;

    // --- Drag energy: fast drag → speed, warp, aberration ---
    if (this.dragEnergy > 0.01) {
      params.set("speed", params.get("speed") + this.dragEnergy * 0.5 * dt);
      params.set("warp", params.get("warp") + this.dragEnergy * 0.4 * dt);
      // Fast drag adds aberration and spin
      if (this.dragEnergy > 0.4) {
        params.set("aberration", params.get("aberration") + (this.dragEnergy - 0.4) * 0.3 * dt);
        params.set("spin", params.get("spin") + (this.dragEnergy - 0.4) * 0.2 * dt);
      }
    }

    // --- Slow drag (pressed but low energy): contemplative warp, wobble ---
    if (this._pressed && this.dragEnergy < 0.15 && this.holdDuration > 0.3) {
      params.set("wobble", params.get("wobble") + 0.15 * dt);
      params.set("warp", params.get("warp") + 0.1 * dt);
    }

    // --- Directional flow: horizontal → warmth, vertical → intensity ---
    params.set("warmth", params.get("warmth") + this.horizontalFlow * 0.3 * dt);
    params.set("intensity", params.get("intensity") - this.verticalFlow * 0.2 * dt);

    // --- Press & hold (no drag): deepening bloom, vignette, warmth ---
    if (this._pressed && this.holdDuration > 0.5 && this._dragDistance < 0.03) {
      const holdStrength = Math.min((this.holdDuration - 0.5) * 0.3, 0.5);
      params.set("bloom", params.get("bloom") + holdStrength * 0.4 * dt);
      params.set("vignette", params.get("vignette") + holdStrength * 0.2 * dt);
      params.set("warmth", params.get("warmth") + holdStrength * 0.15 * dt);
      params.set("zoom", params.get("zoom") - holdStrength * 0.1 * dt);
    }

    // --- Rapid clicks: agitation spike ---
    if (this.clickFlurry > 0.05) {
      params.set("speed", params.get("speed") + this.clickFlurry * 0.8 * dt);
      params.set("glitch", params.get("glitch") + this.clickFlurry * 0.4 * dt);
      params.set("strobe", params.get("strobe") + this.clickFlurry * 0.3 * dt);
      params.set("contrast", params.get("contrast") + this.clickFlurry * 0.3 * dt);
    }

    // --- Stillness: world slowly calms after 3s of no interaction ---
    if (this.stillness > 3.0) {
      const calm = Math.min((this.stillness - 3.0) * 0.01 * dt, 0.01);
      params.set("glitch", params.get("glitch") * (1.0 - calm));
      params.set("strobe", params.get("strobe") * (1.0 - calm));
      params.set("aberration", params.get("aberration") * (1.0 - calm));
      params.set("spin", params.get("spin") * (1.0 - calm));
      params.set("wobble", params.get("wobble") * (1.0 - calm * 0.5));
    }
  }

  dispose(): void {
    // In a real app we'd remove listeners; for a trackmo this is fine
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
