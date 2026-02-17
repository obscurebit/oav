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
  activePreset: string | null;
  particleCount: number;
  audioStarted: boolean;
  moodEnergy: number;
  moodWarmth: number;
  moodTexture: number;
  moodName: string;
  moodConfidence: number;
  params: Record<string, number>;
  // GPU systems
  gpuParticleCount: number;
  gpuSpringNodes: number;
  gpuSprings: number;
  // Director / Poet / Input status
  directorEnabled: boolean;
  directorPending: boolean;
  directorFailures: number;
  poetEnabled: boolean;
  inputEnergy: number;
  inputHold: number;
  inputFlurry: number;
  inputStillness: number;
  inputPressed: boolean;
}

interface LogEntry {
  time: number;
  tag: string;
  text: string;
}

const MAX_LOG = 80;
const IMPORTANT_PARAMS = [
  "intensity", "speed", "hue", "pulse",
  "saturation", "contrast", "warmth", "gamma", "invert",
  "zoom", "rotation", "symmetry", "mirror_x", "mirror_y",
  "warp", "noise_scale", "octaves", "lacunarity",
  "grain", "pixelate", "edge", "ridge", "cells",
  "drift_x", "drift_y", "spin", "wobble", "strobe",
  "bloom", "vignette", "aberration", "glitch", "feedback",
];

export class DebugOverlay {
  private _el: HTMLDivElement;
  private _visible = false;
  private _log: LogEntry[] = [];
  private _lastFrame: DebugFrame | null = null;

  // Sections
  private _perfEl: HTMLDivElement;
  private _engineEl: HTMLDivElement;
  private _llmEl: HTMLDivElement;
  private _inputEl: HTMLDivElement;
  private _moodEl: HTMLDivElement;
  private _paramsEl: HTMLDivElement;
  private _logEl: HTMLDivElement; // Stream - comprehensive debug dump
  private _directorEl: HTMLDivElement; // Director - tool calls, decisions, errors only
  private _poetEl: HTMLDivElement; // Poet - generated text and style info

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
      position: absolute; top: 8px; left: 8px; width: 320px; max-height: calc(100vh - 16px);
      background: rgba(0,0,0,0.75); border: 1px solid rgba(0,255,0,0.3);
      border-radius: 4px; padding: 8px; overflow-y: auto;
      pointer-events: auto;
    `;

    this._perfEl = this._section("⚡ PERF");
    this._engineEl = this._section("🎬 ENGINE");
    this._llmEl = this._section("🤖 LLM");
    this._inputEl = this._section("👆 INPUT");
    this._moodEl = this._section("🎭 MOOD");
    this._paramsEl = this._section("🎛 PARAMS");

    left.append(this._perfEl, this._engineEl, this._llmEl, this._inputEl, this._moodEl, this._paramsEl);

    // Director overlay - tool calls, decisions, errors only
    const middle = document.createElement("div");
    middle.style.cssText = `
      position: absolute; top: 8px; left: 50%; transform: translateX(-50%); width: 420px; max-height: calc(100vh - 16px);
      background: rgba(0,0,0,0.85); border: 1px solid rgba(255,165,0,0.5);
      border-radius: 4px; padding: 8px; overflow-y: auto;
      pointer-events: auto;
    `;

    const directorHeader = document.createElement("div");
    directorHeader.style.cssText = "color: #ffa500; font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid rgba(255,165,0,0.4); padding-bottom: 4px;";
    directorHeader.textContent = `🎬 DIRECTOR - (${import.meta.env.VITE_LLM_MODEL || 'nemotron'})`;
    this._directorEl = document.createElement("div");
    this._directorEl.style.cssText = "color:#ffa500";
    middle.append(directorHeader, this._directorEl);

    // Poet overlay - generated text and style information
    const bottomLeft = document.createElement("div");
    bottomLeft.style.cssText = `
      position: absolute; bottom: 8px; left: 8px; width: 420px; height: 150px;
      background: rgba(0,0,0,0.85); border: 1px solid rgba(255,0,255,0.5);
      border-radius: 4px; padding: 8px; overflow-y: auto;
      pointer-events: auto;
    `;

    const poetHeader = document.createElement("div");
    poetHeader.style.cssText = "color: #ff00ff; font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid rgba(255,0,255,0.4); padding-bottom: 4px;";
    poetHeader.textContent = `🎭 POET - (${import.meta.env.VITE_POET_MODEL || 'llama-4-scout'})`;
    this._poetEl = document.createElement("div");
    this._poetEl.style.cssText = "color:#ff00ff";
    bottomLeft.append(poetHeader, this._poetEl);

    // Stream overlay - comprehensive debug dump with timestamps
    const right = document.createElement("div");
    right.style.cssText = `
      position: absolute; top: 8px; right: 8px; width: 480px; max-height: calc(100vh - 16px);
      background: rgba(0,0,0,0.8); border: 1px solid rgba(0,255,255,0.4);
      border-radius: 4px; padding: 8px; overflow-y: auto;
      pointer-events: auto;
    `;

    const logHeader = document.createElement("div");
    logHeader.style.cssText = "color: #00ffff; font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid rgba(0,255,255,0.3); padding-bottom: 4px;";
    logHeader.textContent = "📡 STREAM";
    this._logEl = document.createElement("div");
    this._logEl.style.cssText = "white-space: pre-wrap; word-break: break-word; font-size: 10px;";
    right.append(logHeader, this._logEl);

    this._el.append(left, middle, bottomLeft, right);
    document.body.appendChild(this._el);

    // Toggle with F2 only
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

  // Specialized logging methods for clearer intent

  /** Director actions - tool calls, decisions, errors */
  logDirector(action: string, details?: string): void {
    const text = details ? `${action}: ${details}` : action;
    this.log("DIRECTOR", text);
  }

  /** Tool calls to the engine */
  logTool(toolName: string, args: string, result?: string): void {
    const text = result ? `${toolName}(${args}) → ${result}` : `${toolName}(${args})`;
    this.log("TOOL", text);
  }

  /** Preset applications */
  logPreset(preset: string, result?: string): void {
    const text = result ? `${preset} → ${result}` : preset;
    this.log("PRESET", text);
  }

  /** Poet output with style */
  logPoet(kind: "voice" | "echo" | "whisper" | "transform", words: string): void {
    this.log("POET", `${kind}: "${words}"`);
  }

  /** LLM responses and magnitude calculations */
  logLLM(event: string, details?: string): void {
    const text = details ? `${event}: ${details}` : event;
    this.log("LLM", text);
  }

  /** Director LLM responses */
  logLLMDirector(event: string, details?: string): void {
    const text = details ? `${event}: ${details}` : event;
    this.log("DIRECTOR-LLM", text);
  }

  /** Poet LLM responses */
  logLLMPoet(event: string, details?: string): void {
    const text = details ? `${event}: ${details}` : event;
    this.log("POET-LLM", text);
  }

  /** Errors and failures */
  logError(error: string, context?: string): void {
    const text = context ? `${error} (${context})` : error;
    this.log("ERROR", text);
  }

  /** Called each frame with current state. Only updates DOM if visible. */
  update(frame: DebugFrame): void {
    this._lastFrame = frame;
    if (!this._visible) return;

    // Perf
    this._body(this._perfEl).innerHTML =
      `FPS: <b>${frame.fps.toFixed(0)}</b>  dt: ${(frame.dt * 1000).toFixed(1)}ms  text: <b>${frame.particleCount}</b>` +
      `\ngpu particles: <b>${frame.gpuParticleCount}</b>  springs: <b>${frame.gpuSpringNodes}</b> nodes / <b>${frame.gpuSprings}</b> links`;

    // LLM status
    const dirColor = frame.directorEnabled ? (frame.directorPending ? "#ff0" : "#0f0") : "#f44";
    const dirLabel = frame.directorEnabled ? (frame.directorPending ? "PENDING" : "READY") : `OFF (${frame.directorFailures} fails)`;
    const poetLabel = frame.poetEnabled ? "<span style='color:#0f0'>ON</span>" : "<span style='color:#666'>OFF</span>";
    this._body(this._llmEl).innerHTML =
      `director: <b style="color:${dirColor}">${dirLabel}</b>  poet: ${poetLabel}`;

    // Director overlay - show tool calls, decisions, errors, and LLM summaries (no raw HTTP responses, no Poet LLM)
    const directorLogs = this._log.filter(entry => {
      // Show tool calls, decisions, errors, and Director LLM summaries but exclude raw HTTP responses and Poet LLM
      return entry.tag === "TOOL" || 
             entry.tag === "DIRECTOR" || 
             entry.tag === "PRESET" ||
             entry.tag === "ERROR" ||
             (entry.tag === "LLM" && !entry.text.includes("raw HTTP response")) ||
             (entry.tag === "DIRECTOR-LLM" && !entry.text.includes("raw HTTP response")) ||
             entry.tag === "THINK";
    }).slice(-30); // Show last 30 director-related entries
    
    if (directorLogs.length > 0) {
      const directorContent = directorLogs.map(entry => {
        let tagColor = "#ffa500";
        let prefix = "";
        
        if (entry.tag === "TOOL") {
          tagColor = "#0f0";
          prefix = "🔧";
        } else if (entry.tag === "PRESET") {
          tagColor = "#f80";
          prefix = "🎨";
        } else if (entry.tag === "ERROR") {
          tagColor = "#f44";
          prefix = "❌";
        } else if (entry.tag === "DIRECTOR") {
          tagColor = "#ffa500";
          prefix = "🎬";
        } else if (entry.tag === "LLM") {
          tagColor = "#ff0";
          prefix = "🤖 LLM";
          const id = `llm-${Math.random().toString(36).substr(2, 9)}`;
          return `<div style="margin-bottom: 2px"><div style="color:${tagColor};cursor:pointer;font-weight:bold" onclick="var next=this.nextElementSibling;next.style.display=next.style.display==='block'?'none':'block'">${prefix} [${entry.tag}]</div><pre id="${id}" style="display:block;margin:4px 0;padding:4px;background:rgba(255,255,0,0.1);border-radius:3px;font-size:9px;white-space:pre-wrap;word-break:break-word">${this._escHtml(entry.text)}</pre></div>`;
        } else if (entry.tag === "THINK") {
          tagColor = "#a0a";
          prefix = "💭 THINK";
          const id = `think-${Math.random().toString(36).substr(2, 9)}`;
          return `<div style="margin-bottom: 2px"><div style="color:${tagColor};cursor:pointer;font-weight:bold" onclick="var next=this.nextElementSibling;next.style.display=next.style.display==='block'?'none':'block'">${prefix} [${entry.tag}]</div><pre id="${id}" style="display:block;margin:4px 0;padding:4px;background:rgba(160,160,255,0.1);border-radius:3px;font-size:9px;white-space:pre-wrap;word-break:break-word">${this._escHtml(entry.text)}</pre></div>`;
        }
        
        return `<div style="margin-bottom: 2px"><span style="color:${tagColor}">${prefix} [${entry.tag}]</span> ${entry.text}</div>`;
      }).join('');
      this._directorEl.innerHTML = directorContent;
    } else {
      this._directorEl.innerHTML = "<span style='color:#888'>No director actions...</span>";
    }

    // Poet overlay - show generated text with style information
    const poetLogs = this._log.filter(entry => {
      // Show poet output and style information
      return entry.tag === "POET" || 
             entry.tag === "SPEAK" ||
             (entry.tag === "LLM" && entry.text.includes("style:"));
    }).slice(-30); // Show last 30 poet-related entries
    
    if (poetLogs.length > 0) {
      const poetContent = poetLogs.map(entry => {
        let tagColor = "#ff00ff";
        let prefix = "";
        let styleInfo = "";
        
        if (entry.tag === "POET") {
          tagColor = "#ff00ff";
          prefix = "✍️";
          // Extract the kind from the text (e.g., "voice: \"words\"")
          const match = entry.text.match(/^(\w+):\s*"(.*)"$/);
          if (match) {
            const [, kind, words] = match;
            styleInfo = `<span style="color:#888;font-style:italic">[${kind}]</span> `;
            return `<span style="color:${tagColor}">${prefix} [POET]</span> ${styleInfo}"${words}"`;
          }
        } else if (entry.tag === "SPEAK") {
          tagColor = "#ffff00";
          prefix = "🗣️";
          // Check if ambient
          if (entry.text.includes("ambient:")) {
            const words = entry.text.replace('ambient: "', '').replace('"', '');
            return `<span style="color:${tagColor}">${prefix} [SPEAK]</span> <span style="color:#888;font-style:italic">[ambient]</span> "${words}"`;
          }
        } else if (entry.tag === "LLM" && entry.text.includes("style:")) {
          tagColor = "#ff0";
          prefix = "🎭";
          // Extract magnitude and style
          const match = entry.text.match(/magnitude: ([\d.]+) → style: (\w+)/);
          if (match) {
            const [, magnitude, style] = match;
            const magColor = parseFloat(magnitude) > 0.7 ? "#f80" : parseFloat(magnitude) > 0.3 ? "#0f0" : "#888";
            return `<span style="color:${tagColor}">${prefix} [LLM]</span> magnitude: <span style="color:${magColor}">${magnitude}</span> → style: <span style="color:#ff00ff;font-weight:bold">${style}</span>`;
          }
        }
        
        return `<span style="color:${tagColor}">${prefix} [${entry.tag}]</span> ${entry.text}`;
      }).join('<br>');
      this._poetEl.innerHTML = poetContent;
    } else {
      this._poetEl.innerHTML = "<span style='color:#888'>No poet output...</span>";
    }

    
    // Input gestures
    const pressLabel = frame.inputPressed
      ? `<span style="color:#0f0">PRESSED</span> (${frame.inputHold.toFixed(1)}s)`
      : `<span style="color:#666">released</span>`;
    const energyBar = this._miniBar(frame.inputEnergy, "intensity");
    const flurryBar = this._miniBar(frame.inputFlurry, "intensity");
    const stillLabel = frame.inputStillness > 3
      ? `<span style="color:#0af">${frame.inputStillness.toFixed(0)}s (calming)</span>`
      : `${frame.inputStillness.toFixed(1)}s`;
    this._body(this._inputEl).innerHTML =
      `${pressLabel}  energy: ${energyBar}  flurry: ${flurryBar}` +
      `\nstillness: ${stillLabel}`;

    // Audio status (simplified - use F3 for detailed audio)
    const engineAudioStatus = frame.audioStarted 
      ? "<span style='color:#0f0'>ON (F3 for details)</span>" 
      : "<span style='color:#f44'>OFF</span>";

    // Engine
    const presetLabel = frame.activePreset
      ? `<span style="color:#fa0">${frame.activePreset}</span>`
      : `<span style="color:#666">none</span>`;
    this._body(this._engineEl).innerHTML = `
      time: <b>${frame.elapsed.toFixed(1)}s</b>  scene: <b>${frame.scene}</b> (${(frame.sceneProgress * 100).toFixed(0)}%)
      preset: ${presetLabel}  audio: ${engineAudioStatus}
    `;

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
    // STREAM shows everything as a comprehensive debug dump with timestamps and color-coding
    // Include raw HTTP responses here (full debug dump) with collapsible LLM entries
    const html = this._log.map(e => {
      const t = e.time.toFixed(1).padStart(6);
      const tagColor = this._tagColor(e.tag);
      const tagBg = this._tagBackground(e.tag);
      
      // Add source-specific icons for better visual scanning
      let icon = "";
      if (e.tag === "LLM") icon = "🤖";
      else if (e.tag === "DIRECTOR-LLM") icon = "🎬🤖";
      else if (e.tag === "POET-LLM") icon = "✍️🤖";
      else if (e.tag === "TOOL") icon = "🔧";
      else if (e.tag === "POET") icon = "✍️";
      else if (e.tag === "SPEAK") icon = "🗣️";
      else if (e.tag === "SCENE") icon = "🎬";
      else if (e.tag === "INPUT") icon = "👆";
      else if (e.tag === "ERROR") icon = "❌";
      else if (e.tag === "PRESET") icon = "🎨";
      else if (e.tag === "MOOD") icon = "🎭";
      else if (e.tag === "REACT") icon = "⚡";
      
      // Make LLM entries collapsible for long content
      if ((e.tag === "LLM" || e.tag === "DIRECTOR-LLM" || e.tag === "POET-LLM") && e.text.length > 100) {
        const id = `stream-llm-${Math.random().toString(36).substr(2, 9)}`;
        return `<div style="margin-bottom: 2px"><span style="color:#666">${t}s</span> <span style="color:${tagColor};background:${tagBg};padding:1px 4px;border-radius:2px;font-weight:bold;cursor:pointer" onclick="var next=this.parentElement.querySelector('.collapsible-content');next.style.display=next.style.display==='block'?'none':'block'">${icon}[${e.tag}]</span> <span style="color:#666;font-style:italic">${e.text.length > 100 ? e.text.substring(0, 100) + '...' : e.text}</span><pre id="${id}" class="collapsible-content" style="display:none;margin:4px 0;padding:4px;background:rgba(255,255,255,0.05);border-radius:3px;font-size:9px;white-space:pre-wrap;word-break:break-word">${this._escHtml(e.text)}</pre></div>`;
      }
      
      return `<span style="color:#666">${t}s</span> <span style="color:${tagColor};background:${tagBg};padding:1px 4px;border-radius:2px;font-weight:bold">${icon}[${e.tag}]</span> ${this._escHtml(e.text)}`;
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
      case "DIRECTOR": return "#ffa500";
      case "DIRECTOR-LLM": return "#ff8c00";
      case "POET-LLM": return "#ff1493";
      case "DIRECT_PRESET": return "#f80";
      case "DIRECT_PRESET_RESULT": return "#f08";
      default: return "#888";
    }
  }

  private _tagBackground(tag: string): string {
    switch (tag) {
      case "LLM": return "rgba(255,0,255,0.2)";
      case "THINK": return "rgba(160,160,255,0.2)";
      case "POET": return "rgba(255,153,255,0.2)";
      case "TOOL": return "rgba(0,255,255,0.2)";
      case "SPEAK": return "rgba(255,255,0,0.2)";
      case "SCENE": return "rgba(136,255,136,0.2)";
      case "MOOD": return "rgba(0,255,0,0.2)";
      case "INPUT": return "rgba(255,170,0,0.2)";
      case "REACT": return "rgba(0,170,255,0.2)";
      case "PRESET": return "rgba(255,136,0,0.2)";
      case "ERROR": return "rgba(255,68,68,0.3)";
      case "DIRECTOR": return "rgba(255,165,0,0.2)";
      case "DIRECTOR-LLM": return "rgba(255,140,0,0.2)";
      case "POET-LLM": return "rgba(255,20,147,0.2)";
      case "DIRECT_PRESET": return "rgba(255,136,0,0.2)";
      case "DIRECT_PRESET_RESULT": return "rgba(255,0,136,0.2)";
      default: return "transparent";
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
      case "symmetry": return 12;
      case "octaves": return 8;
      case "noise_scale": return 10;
      case "warp": return 3;
      case "bloom": case "vignette": return 2;
      case "contrast": case "saturation": return 2;
      case "gamma": return 3;
      case "lacunarity": return 4;
      case "rotation": return 3.14;
      default: return 1;
    }
  }

  private _defaultFor(name: string): number {
    switch (name) {
      case "intensity": return 0.5;
      case "speed": return 1;
      case "saturation": case "contrast": case "zoom": case "gamma": return 1;
      case "vignette": return 0.5;
      case "warp": return 0.5;
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
