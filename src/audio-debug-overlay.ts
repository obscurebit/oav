/**
 * Audio Debug Overlay — toggled with F3.
 * Shows detailed audio analysis and parameters in a separate overlay.
 * Pure DOM overlay on top of the canvas — does not interfere with WebGL.
 */

export interface AudioDebugFrame {
  // Audio analysis
  amplitude: number;
  brightness: number;
  bass: number;
  mid: number;
  high: number;
  beatHit: boolean;
  rhythmicIntensity: number;
  spectralCentroid: number;
  // Audio parameters
  subLevel: number;
  harmonicLevel: number;
  noiseLevel: number;
  padLevel: number;
  filterFreq: number;
  filterRes: number;
  lfoRate: number;
  lfoDepth: number;
  reverbWet: number;
  delayTime: number;
  delayFeedback: number;
  distortion: number;
  masterLevel: number;
  tempo: number;
  audioStarted: boolean;
}

export class AudioDebugOverlay {
  private _el: HTMLDivElement;
  private _visible = false;
  private _lastFrame: AudioDebugFrame | null = null;

  // Sections
  private _analysisEl: HTMLDivElement;
  private _paramsEl: HTMLDivElement;
  private _effectsEl: HTMLDivElement;

  constructor() {
    this._el = document.createElement("div");
    this._el.id = "audio-debug-overlay";
    this._el.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none; z-index: 9998;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 11px; line-height: 1.4; color: #0ff;
      display: none;
    `;

    // Audio debug panel
    const panel = document.createElement("div");
    panel.style.cssText = `
      position: absolute; top: 8px; left: 8px; width: 380px; max-height: calc(100vh - 16px);
      background: rgba(0,0,0,0.85); border: 1px solid rgba(0,255,255,0.3);
      border-radius: 4px; padding: 8px; overflow-y: auto;
      pointer-events: auto;
    `;

    this._analysisEl = this._section("🎵 AUDIO ANALYSIS");
    this._paramsEl = this._section("🎛 AUDIO PARAMETERS");
    this._effectsEl = this._section("🎚 AUDIO EFFECTS");

    panel.append(this._analysisEl, this._paramsEl, this._effectsEl);

    this._el.appendChild(panel);
    document.body.appendChild(this._el);

    // Toggle with F3
    window.addEventListener("keydown", (e) => {
      if (e.key === "F3") {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  private _section(title: string): HTMLDivElement {
    const el = document.createElement("div");
    el.style.cssText = "margin-bottom: 8px;";
    el.innerHTML = `<div style="color:#0ff;font-weight:bold;border-bottom:1px solid rgba(0,255,255,0.2);padding-bottom:2px;margin-bottom:3px">${title}</div><div class="body"></div>`;
    return el;
  }

  get visible(): boolean { return this._visible; }

  toggle(): void {
    this._visible = !this._visible;
    this._el.style.display = this._visible ? "block" : "none";
  }

  /** Called each frame with current audio state. Only updates DOM if visible. */
  update(frame: AudioDebugFrame): void {
    this._lastFrame = frame;
    if (!this._visible) return;

    const status = frame.audioStarted 
      ? "<span style='color:#0ff'>ON</span>" 
      : "<span style='color:#f44'>OFF</span>";

    // Audio Analysis
    const beatColor = frame.beatHit ? "#ff0" : "#0ff";
    const beatLabel = frame.beatHit ? "BEAT" : "....";
    this._body(this._analysisEl).innerHTML =
      `status: ${status}` +
      `\nanalysis: amp:${this._bar(frame.amplitude)} bass:${this._bar(frame.bass)} mid:${this._bar(frame.mid)} high:${this._bar(frame.high)}` +
      `\nbeat: <span style="color:${beatColor}">${beatLabel}</span> rhythmic:${this._bar(frame.rhythmicIntensity)} centroid:${frame.spectralCentroid.toFixed(2)}` +
      `\nbrightness: ${this._bar(frame.brightness)}`;

    // Audio Parameters
    this._body(this._paramsEl).innerHTML =
      `layers: sub:${this._bar(frame.subLevel)} harm:${this._bar(frame.harmonicLevel)} noise:${this._bar(frame.noiseLevel)} pad:${this._bar(frame.padLevel)}` +
      `\nfilter: ${frame.filterFreq.toFixed(0)}Hz Q:${frame.filterRes.toFixed(1)}` +
      `\nlfo: ${frame.lfoRate.toFixed(1)}Hz depth:${this._bar(frame.lfoDepth)}` +
      `\ntempo: ${frame.tempo}BPM  master: ${this._bar(frame.masterLevel)}`;

    // Audio Effects
    this._body(this._effectsEl).innerHTML =
      `reverb: ${this._bar(frame.reverbWet)}` +
      `\ndelay: ${frame.delayTime.toFixed(2)}s feedback:${this._bar(frame.delayFeedback)}` +
      `\ndistortion: ${this._bar(frame.distortion)}`;
  }

  private _body(sectionEl: HTMLDivElement): HTMLDivElement {
    return sectionEl.querySelector(".body") as HTMLDivElement;
  }

  private _bar(value: number, invert = false): string {
    const clamped = Math.max(0, Math.min(1, value));
    const intensity = Math.floor(clamped * 10);
    const color = invert 
      ? `hsl(${180 + clamped * 60}, 100%, ${50 + clamped * 30}%)`
      : `hsl(${180 - clamped * 60}, 100%, ${50 + clamped * 30}%)`;
    return `<span style="color:${color}">${"█".repeat(intensity)}${"░".repeat(10 - intensity)}</span>`;
  }
}
