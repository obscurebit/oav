/**
 * Debug overlay — toggled with F2.
 * Shows LLM thinking stream, engine status, mood detection, tool calls, performance stats.
 * Pure DOM overlay on top of the canvas — does not interfere with WebGL.
 */

export interface DebugFrame {
  elapsed: number;
  dt: number;
  fps: number;
  scene: string;
  sceneProgress: number;
  particleCount: number;
  audioStarted: boolean;
  moodEnergy: number;
  moodWarmth: number;
  moodTexture: number;
  moodName: string;
  moodConfidence: number;
  params: Record<string, number>;
}

interface LogEntry {
  time: number;
  tag: string;
  text: string;
}

const MAX_LOG = 80;
const IMPORTANT_PARAMS = [
  "intensity", "speed", "hue", "pulse",
  "saturation", "contrast", "warmth", "bloom",
  "warp", "wobble", "spin", "glitch", "strobe",
  "aberration", "zoom", "vignette", "symmetry",
  "cells", "ridge", "grain", "drift_x", "drift_y",
];

export class DebugOverlay {
  private _el: HTMLDivElement;
  private _visible = false;
  private _log: LogEntry[] = [];
  private _lastFrame: DebugFrame | null = null;

  // Sections
  private _perfEl: HTMLDivElement;
  private _engineEl: HTMLDivElement;
  private _moodEl: HTMLDivElement;
  private _paramsEl: HTMLDivElement;
  private _logEl: HTMLDivElement;

  constructor() {
    this._el = document.createElement("div");
    this._el.id = "debug-overlay";
    this._el.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none; z-index: 9999;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 11px; line-height: 1.4; color: #0f0;
      display: none;
    `;

    // Left column: perf + engine + mood + params
    const left = document.createElement("div");
    left.style.cssText = `
      position: absolute; top: 8px; left: 8px; width: 320px;
      background: rgba(0,0,0,0.75); border: 1px solid rgba(0,255,0,0.3);
      border-radius: 4px; padding: 8px; overflow: hidden;
    `;

    this._perfEl = this._section("⚡ PERF");
    this._engineEl = this._section("🎬 ENGINE");
    this._moodEl = this._section("🎭 MOOD");
    this._paramsEl = this._section("🎛 PARAMS");

    left.append(this._perfEl, this._engineEl, this._moodEl, this._paramsEl);

    // Right column: log stream
    const right = document.createElement("div");
    right.style.cssText = `
      position: absolute; top: 8px; right: 8px; width: 440px; max-height: calc(100vh - 16px);
      background: rgba(0,0,0,0.75); border: 1px solid rgba(0,255,0,0.3);
      border-radius: 4px; padding: 8px; overflow-y: auto;
      pointer-events: auto;
    `;

    const logHeader = document.createElement("div");
    logHeader.style.cssText = "color: #0f0; font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid rgba(0,255,0,0.3); padding-bottom: 4px;";
    logHeader.textContent = "📡 STREAM";
    this._logEl = document.createElement("div");
    this._logEl.style.cssText = "white-space: pre-wrap; word-break: break-word;";
    right.append(logHeader, this._logEl);

    this._el.append(left, right);
    document.body.appendChild(this._el);

    // Toggle with F2
    window.addEventListener("keydown", (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  private _section(title: string): HTMLDivElement {
    const el = document.createElement("div");
    el.style.cssText = "margin-bottom: 6px;";
    el.innerHTML = `<div style="color:#0f0;font-weight:bold;border-bottom:1px solid rgba(0,255,0,0.2);padding-bottom:2px;margin-bottom:3px">${title}</div><div class="body"></div>`;
    return el;
  }

  get visible(): boolean { return this._visible; }

  toggle(): void {
    this._visible = !this._visible;
    this._el.style.display = this._visible ? "block" : "none";
  }

  /** Log an event to the stream panel. */
  log(tag: string, text: string): void {
    const time = this._lastFrame?.elapsed ?? 0;
    this._log.push({ time, tag, text });
    if (this._log.length > MAX_LOG) this._log.shift();
    if (this._visible) this._renderLog();
  }

  /** Called each frame with current state. Only updates DOM if visible. */
  update(frame: DebugFrame): void {
    this._lastFrame = frame;
    if (!this._visible) return;

    // Perf
    this._body(this._perfEl).innerHTML =
      `FPS: <b>${frame.fps.toFixed(0)}</b>  dt: ${(frame.dt * 1000).toFixed(1)}ms  particles: <b>${frame.particleCount}</b>`;

    // Engine
    this._body(this._engineEl).innerHTML =
      `time: <b>${frame.elapsed.toFixed(1)}s</b>  scene: <b>${frame.scene}</b> (${(frame.sceneProgress * 100).toFixed(0)}%)` +
      `\naudio: ${frame.audioStarted ? "<span style='color:#0f0'>ON</span>" : "<span style='color:#f44'>OFF</span>"}`;

    // Mood
    const conf = frame.moodConfidence;
    const confColor = conf > 0.7 ? "#0f0" : conf > 0.3 ? "#ff0" : "#888";
    this._body(this._moodEl).innerHTML =
      `detected: <b style="color:${confColor}">${frame.moodName}</b> (${(conf * 100).toFixed(0)}%)` +
      `\nenergy: ${this._bar(frame.moodEnergy)}  warmth: ${this._bar(frame.moodWarmth, true)}  texture: ${this._bar(frame.moodTexture)}`;

    // Params — show important ones with mini bars
    const lines: string[] = [];
    for (const name of IMPORTANT_PARAMS) {
      const v = frame.params[name];
      if (v === undefined) continue;
      const changed = Math.abs(v - this._defaultFor(name)) > 0.05;
      const color = changed ? "#0f0" : "#555";
      lines.push(`<span style="color:${color}">${name.padEnd(12)} ${v.toFixed(2).padStart(6)} ${this._miniBar(v, name)}</span>`);
    }
    this._body(this._paramsEl).innerHTML = lines.join("\n");
  }

  private _renderLog(): void {
    const html = this._log.map(e => {
      const t = e.time.toFixed(1).padStart(6);
      const tagColor = this._tagColor(e.tag);
      return `<span style="color:#666">${t}s</span> <span style="color:${tagColor};font-weight:bold">[${e.tag}]</span> ${this._escHtml(e.text)}`;
    }).join("\n");
    this._logEl.innerHTML = html;
    this._logEl.scrollTop = this._logEl.scrollHeight;
  }

  private _tagColor(tag: string): string {
    switch (tag) {
      case "LLM": return "#f0f";
      case "THINK": return "#a0a";
      case "POET": return "#f9f";
      case "TOOL": return "#0ff";
      case "SPEAK": return "#ff0";
      case "SCENE": return "#8f8";
      case "MOOD": return "#0f0";
      case "INPUT": return "#fa0";
      case "REACT": return "#0af";
      case "PRESET": return "#f80";
      case "ERROR": return "#f44";
      default: return "#888";
    }
  }

  private _bar(v: number, signed = false): string {
    const width = 60;
    if (signed) {
      // -1 to 1 range
      const norm = (v + 1) / 2;
      const pos = Math.round(norm * width);
      const mid = width / 2;
      let bar = "";
      for (let i = 0; i < width; i++) {
        if (i === mid) bar += "|";
        else if ((i >= mid && i <= pos) || (i <= mid && i >= pos)) bar += "█";
        else bar += "░";
      }
      return `<span style="color:#0a0">${bar}</span> ${v.toFixed(2)}`;
    }
    const filled = Math.round(Math.min(v, 1) * width);
    return `<span style="color:#0a0">${"█".repeat(filled)}${"░".repeat(width - filled)}</span> ${v.toFixed(2)}`;
  }

  private _miniBar(v: number, name: string): string {
    const max = this._maxFor(name);
    const norm = Math.min(Math.abs(v) / max, 1);
    const w = 12;
    const filled = Math.round(norm * w);
    const color = norm > 0.7 ? "#f80" : norm > 0.3 ? "#0f0" : "#555";
    return `<span style="color:${color}">${"█".repeat(filled)}${"░".repeat(w - filled)}</span>`;
  }

  private _maxFor(name: string): number {
    switch (name) {
      case "speed": return 4;
      case "zoom": return 5;
      case "symmetry": return 8;
      case "octaves": return 8;
      case "noise_scale": return 10;
      case "warp": return 3;
      case "bloom": case "vignette": return 2;
      case "contrast": case "saturation": return 2;
      default: return 1;
    }
  }

  private _defaultFor(name: string): number {
    switch (name) {
      case "intensity": return 0.5;
      case "speed": return 1;
      case "saturation": case "contrast": case "zoom": return 1;
      case "vignette": return 0.5;
      case "noise_scale": return 3;
      case "octaves": return 5;
      case "lacunarity": return 2;
      default: return 0;
    }
  }

  private _body(section: HTMLDivElement): HTMLDivElement {
    return section.querySelector(".body") as HTMLDivElement;
  }

  private _escHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
