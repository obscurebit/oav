/**
 * Deterministic clock for the trackmo engine.
 * Tracks elapsed time, delta, and BPM-derived beat position.
 * Does NOT own requestAnimationFrame — the main loop calls tick().
 */
export class Clock {
  private _elapsed = 0;
  private _delta = 0;
  private _paused = false;
  private _bpm: number;

  constructor(bpm = 120) {
    this._bpm = bpm;
  }

  /** Advance clock by dt seconds. Called once per frame by the main loop. */
  tick(dt: number): void {
    if (this._paused) {
      this._delta = 0;
      return;
    }
    this._delta = dt;
    this._elapsed += dt;
  }

  /** Elapsed time in seconds since start (excluding paused time). */
  get elapsed(): number {
    return this._elapsed;
  }

  /** Delta time of the last tick in seconds. */
  get delta(): number {
    return this._delta;
  }

  /** Current beat position derived from elapsed time and BPM. */
  get beat(): number {
    return (this._elapsed * this._bpm) / 60;
  }

  get bpm(): number {
    return this._bpm;
  }

  set bpm(value: number) {
    this._bpm = Math.max(1, value);
  }

  get paused(): boolean {
    return this._paused;
  }

  pause(): void {
    this._paused = true;
  }

  resume(): void {
    this._paused = false;
  }

  /** Jump to a specific elapsed time. */
  seek(time: number): void {
    this._elapsed = Math.max(0, time);
  }

  reset(): void {
    this._elapsed = 0;
    this._delta = 0;
    this._paused = false;
  }
}
