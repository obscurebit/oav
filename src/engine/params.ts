/**
 * Flat parameter store with min/max clamping.
 * Single source of truth for all runtime parameters.
 */

export interface ParamDef {
  min: number;
  max: number;
  value: number;
}

export interface ParamDrift {
  param: string;
  from: number;
  target: number;
  duration: number;
  elapsed: number;
}

export interface ParamPulse {
  param: string;
  amplitude: number;
  period: number;
  duration: number;
  elapsed: number;
}

export class ParameterStore {
  private _defs = new Map<string, ParamDef>();
  private _drifts: ParamDrift[] = [];
  private _pulses: ParamPulse[] = [];

  /** Register a parameter with min, max, and default value. */
  define(name: string, min: number, max: number, defaultValue: number): void {
    this._defs.set(name, {
      min,
      max,
      value: clamp(defaultValue, min, max),
    });
  }

  /** Get current value. Returns 0 if undefined. */
  get(name: string): number {
    return this._defs.get(name)?.value ?? 0;
  }

  /** Set a single parameter (clamped). */
  set(name: string, value: number): void {
    const def = this._defs.get(name);
    if (!def) return;
    def.value = clamp(value, def.min, def.max);
  }

  /** Bulk update from a record. Unknown keys are ignored. */
  patch(values: Record<string, number>): void {
    for (const [key, val] of Object.entries(values)) {
      this.set(key, val);
    }
  }

  /** Get normalized value [0, 1] for a parameter. */
  getNormalized(name: string): number {
    const def = this._defs.get(name);
    if (!def) return 0;
    if (def.max === def.min) return 0;
    return (def.value - def.min) / (def.max - def.min);
  }

  /** Check if a parameter is defined. */
  has(name: string): boolean {
    return this._defs.has(name);
  }

  /** Get all parameter names. */
  keys(): string[] {
    return [...this._defs.keys()];
  }

  /** Snapshot all current values. */
  snapshot(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [key, def] of this._defs) {
      out[key] = def.value;
    }
    return out;
  }

  /** Start a smooth drift toward a target value over duration seconds. */
  drift(name: string, target: number, duration: number): void {
    if (!this._defs.has(name) || duration <= 0) return;
    // Remove any existing drift for this param
    this._drifts = this._drifts.filter((d) => d.param !== name);
    this._drifts.push({
      param: name,
      from: this.get(name),
      target,
      duration,
      elapsed: 0,
    });
  }

  /** Start a temporary sinusoidal pulse on a parameter. */
  pulse(name: string, amplitude: number, period: number, duration: number): void {
    if (!this._defs.has(name) || duration <= 0) return;
    this._pulses.push({
      param: name,
      amplitude,
      period: Math.max(0.1, period),
      duration,
      elapsed: 0,
    });
  }

  /** Advance all active drifts and pulses. Call once per frame with delta time. */
  tick(dt: number): void {
    // Process drifts
    for (let i = this._drifts.length - 1; i >= 0; i--) {
      const d = this._drifts[i];
      d.elapsed += dt;
      const t = Math.min(d.elapsed / d.duration, 1);
      // Smoothstep for organic feel
      const s = t * t * (3 - 2 * t);
      this.set(d.param, d.from + (d.target - d.from) * s);
      if (t >= 1) {
        this._drifts.splice(i, 1);
      }
    }

    // Process pulses (additive)
    for (let i = this._pulses.length - 1; i >= 0; i--) {
      const p = this._pulses[i];
      p.elapsed += dt;
      if (p.elapsed >= p.duration) {
        this._pulses.splice(i, 1);
        continue;
      }
      // Fade envelope: ramp up then down
      const life = p.elapsed / p.duration;
      const envelope = life < 0.1 ? life / 0.1 : life > 0.9 ? (1 - life) / 0.1 : 1;
      const wave = Math.sin((p.elapsed / p.period) * Math.PI * 2);
      const current = this.get(p.param);
      this.set(p.param, current + wave * p.amplitude * envelope);
    }
  }

  /** Number of active drifts. */
  get activeDrifts(): number {
    return this._drifts.length;
  }

  /** Number of active pulses. */
  get activePulses(): number {
    return this._pulses.length;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
