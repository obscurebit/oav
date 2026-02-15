/**
 * Artful text input — captures keystrokes globally, scatters characters
 * as particles, buffers words, and fires a callback after a typing pause.
 */
import { TextParticleSystem } from "./text-particles";

export interface WordInputOptions {
  /** Pause duration (ms) after last keystroke before flushing the buffer. */
  pauseMs?: number;
  /** Callback when a word/phrase is ready to send to the LLM. */
  onPhrase?: (phrase: string) => void;
}

export class WordInput {
  private _buffer: string[] = [];
  private _particles: TextParticleSystem;
  private _pauseMs: number;
  private _onPhrase: ((phrase: string) => void) | null;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _canvasW = 1;
  private _canvasH = 1;

  constructor(particles: TextParticleSystem, options: WordInputOptions = {}) {
    this._particles = particles;
    this._pauseMs = options.pauseMs ?? 1500;
    this._onPhrase = options.onPhrase ?? null;
    this._bindKeyboard();
  }

  resize(w: number, h: number): void {
    this._canvasW = w;
    this._canvasH = h;
  }

  private _bindKeyboard(): void {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      // Ignore modifier-only keys and special keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Backspace") {
        this._buffer.pop();
        this._resetTimer();
        return;
      }

      if (e.key === "Escape") {
        this._buffer.length = 0;
        if (this._timer) clearTimeout(this._timer);
        return;
      }

      // Only printable characters
      if (e.key.length !== 1) return;

      this._buffer.push(e.key);

      // Scatter the character as a particle near the center
      const cx = this._canvasW * 0.5;
      const cy = this._canvasH * 0.55;
      this._particles.addUserChar(e.key, cx, cy);

      this._resetTimer();
    });
  }

  private _resetTimer(): void {
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => this._flush(), this._pauseMs);
  }

  private _flush(): void {
    if (this._buffer.length === 0) return;
    const phrase = this._buffer.join("").trim();
    this._buffer.length = 0;
    if (phrase && this._onPhrase) {
      this._onPhrase(phrase);
    }
  }

  /** Get the current buffer contents (for display purposes). */
  get currentBuffer(): string {
    return this._buffer.join("");
  }

  dispose(): void {
    if (this._timer) clearTimeout(this._timer);
  }
}
