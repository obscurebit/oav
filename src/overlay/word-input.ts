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
  /** Callback on every keystroke — for immediate visual/shader feedback. */
  onKeystroke?: (char: string, bufferLength: number) => void;
}

export class WordInput {
  private _buffer: string[] = [];
  private _particles: TextParticleSystem;
  private _pauseMs: number;
  private _onPhrase: ((phrase: string) => void) | null;
  private _onKeystroke: ((char: string, bufferLength: number) => void) | null;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _canvasW = 1;
  private _canvasH = 1;

  constructor(particles: TextParticleSystem, options: WordInputOptions = {}) {
    this._particles = particles;
    this._pauseMs = options.pauseMs ?? 800;
    this._onPhrase = options.onPhrase ?? null;
    this._onKeystroke = options.onKeystroke ?? null;
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

      if (e.key === "Enter") {
        // Enter sends immediately
        if (this._timer) clearTimeout(this._timer);
        this._flush();
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

      // Newest char spawns at a fixed right-side point; older chars are already drifting left
      const baseX = this._canvasW * 0.55;
      const baseY = this._canvasH * 0.48;
      this._particles.addUserChar(e.key, baseX, baseY);

      // Immediate feedback callback
      if (this._onKeystroke) {
        this._onKeystroke(e.key, this._buffer.length);
      }

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
