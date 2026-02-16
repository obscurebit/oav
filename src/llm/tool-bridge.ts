/**
 * ToolBridge — executes LLM tool calls against the engine.
 * Sits between the Director and the ParameterStore / TextParticleSystem / Timeline.
 */

import type { ParameterStore } from "../engine/params";
import type { Timeline } from "../engine/timeline";
import type { TextParticleSystem } from "../overlay/text-particles";
import type { ToolCall } from "./tools";
import { MOOD_MAPPINGS } from "./tools";

export interface ToolBridgeDeps {
  params: ParameterStore;
  timeline: Timeline;
  particles: TextParticleSystem;
  canvasWidth: () => number;
  canvasHeight: () => number;
}

export class ToolBridge {
  private _deps: ToolBridgeDeps;

  /** The currently active preset/theme (null = no theme). */
  activeTheme: string | null = null;

  constructor(deps: ToolBridgeDeps) {
    this._deps = deps;
  }

  /** Execute a batch of tool calls from the LLM. Returns results for logging. */
  execute(toolCalls: ToolCall[]): string[] {
    const results: string[] = [];
    for (const call of toolCalls) {
      try {
        const args = JSON.parse(call.function.arguments);
        const result = this._dispatch(call.function.name, args);
        results.push(result);
      } catch (err) {
        console.warn(`[ToolBridge] Failed to execute ${call.function.name}:`, err);
        results.push(`error: ${err}`);
      }
    }
    return results;
  }

  private _dispatch(name: string, args: Record<string, unknown>): string {
    switch (name) {
      case "speak":
        return this._speak(args);
      case "shift_mood":
        return this._shiftMood(args);
      case "whisper":
        return this._whisper(args);
      case "set_param":
        return this._setParam(args);
      case "drift_param":
        return this._driftParam(args);
      case "pulse_param":
        return this._pulseParam(args);
      case "transition_to":
        return this._transitionTo(args);
      case "spawn_particles":
        return this._spawnParticles(args);
      case "apply_preset":
        return this._applyPreset(args);
      default:
        console.warn(`[ToolBridge] Unknown tool: ${name}`);
        return `unknown tool: ${name}`;
    }
  }

  // --- Level 1: Poetic ---

  private _speak(args: Record<string, unknown>): string {
    const words = String(args.words ?? "");
    if (!words) return "no words";
    const kind = String(args.kind ?? "voice");
    const w = this._deps.canvasWidth();
    const h = this._deps.canvasHeight();
    const p = this._deps.particles;

    switch (kind) {
      case "name":
        p.addVoiceRevealed(words, w, h, "name");
        break;
      case "transform":
        p.addVoiceRevealed(words, w, h, "transform");
        break;
      case "echo":
        p.addVoiceRevealed(words, w, h, "echo");
        break;
      default:
        p.addVoiceRevealed(words, w, h, "voice");
        break;
    }
    return `spoke: "${words}" (${kind})`;
  }

  private _shiftMood(args: Record<string, unknown>): string {
    const feeling = String(args.feeling ?? "");
    const mapping = MOOD_MAPPINGS[feeling];
    if (!mapping) return `unknown feeling: ${feeling}`;

    for (const [param, { target, duration }] of Object.entries(mapping)) {
      this._deps.params.drift(param, target, duration);
    }
    return `mood shifted: ${feeling}`;
  }

  private _whisper(args: Record<string, unknown>): string {
    const fragment = String(args.fragment ?? "");
    if (!fragment) return "no fragment";
    this._deps.particles.addWhisper(
      fragment,
      this._deps.canvasWidth(),
      this._deps.canvasHeight()
    );
    return `whispered: "${fragment}"`;
  }

  // --- Level 2: Parametric ---

  private _setParam(args: Record<string, unknown>): string {
    const name = String(args.name ?? "");
    const value = Number(args.value ?? 0);
    if (!this._deps.params.has(name)) return `unknown param: ${name}`;
    this._deps.params.set(name, value);
    return `set ${name} = ${value}`;
  }

  private _driftParam(args: Record<string, unknown>): string {
    const name = String(args.name ?? "");
    const target = Number(args.target ?? 0);
    const duration = Math.max(0.5, Math.min(15, Number(args.duration ?? 3)));
    if (!this._deps.params.has(name)) return `unknown param: ${name}`;
    this._deps.params.drift(name, target, duration);
    return `drifting ${name} → ${target} over ${duration}s`;
  }

  private _pulseParam(args: Record<string, unknown>): string {
    const name = String(args.name ?? "");
    const amplitude = Math.max(0.01, Math.min(0.5, Number(args.amplitude ?? 0.1)));
    const period = Math.max(0.5, Math.min(8, Number(args.period ?? 2)));
    const duration = Math.max(1, Math.min(20, Number(args.duration ?? 5)));
    if (!this._deps.params.has(name)) return `unknown param: ${name}`;
    this._deps.params.pulse(name, amplitude, period, duration);
    return `pulsing ${name} ±${amplitude} period=${period}s for ${duration}s`;
  }

  // --- Level 3: Structural ---

  private _transitionTo(args: Record<string, unknown>): string {
    const sceneId = String(args.scene_id ?? "");
    const duration = Math.max(1, Math.min(8, Number(args.duration ?? 3)));
    const validScenes = ["intro", "build", "climax", "outro"];
    if (!validScenes.includes(sceneId)) return `unknown scene: ${sceneId}`;

    // Find the target scene entry and adjust timeline
    const entries = this._deps.timeline.entries;
    const target = entries.find((e) => e.sceneId === sceneId);
    if (!target) return `scene not in timeline: ${sceneId}`;

    // We can't truly "jump" the timeline clock, but we can speak about it
    // For now, log the intent — full timeline manipulation is Phase 2
    console.log(`[ToolBridge] transition_to ${sceneId} (${duration}s) — noted for future implementation`);
    return `transition requested: ${sceneId} (${duration}s)`;
  }

  private _spawnParticles(args: Record<string, unknown>): string {
    const texts = Array.isArray(args.texts) ? args.texts.map(String).slice(0, 8) : [];
    if (texts.length === 0) return "no texts";
    const kind = String(args.kind ?? "voice");
    const w = this._deps.canvasWidth();
    const h = this._deps.canvasHeight();
    const p = this._deps.particles;

    for (const text of texts) {
      switch (kind) {
        case "echo":
          p.addEcho(text, w, h);
          break;
        case "whisper":
          p.addWhisper(text, w, h);
          break;
        default:
          p.addVoice(text, w, h);
          break;
      }
    }
    return `spawned ${texts.length} ${kind} particles`;
  }

  // --- Presets ---

  private _applyPreset(args: Record<string, unknown>): string {
    const preset = String(args.preset ?? "");
    const scale = Math.max(0.1, Math.min(2.0, Number(args.intensity_scale ?? 1.0)));
    const p = this._deps.params;

    const PRESETS: Record<string, Record<string, number>> = {
      noir:        { saturation: 0.15, contrast: 2.2, intensity: 0.4, grain: 0.6, warmth: -0.3, bloom: 0, warp: 0.3 },
      vaporwave:   { hue: 0.85, saturation: 1.8, bloom: 1.2, pixelate: 0.3, warmth: 0.2, speed: 0.6, aberration: 0.3 },
      glitch_art:  { glitch: 0.8, aberration: 0.7, edge: 0.6, strobe: 0.3, speed: 2.0, contrast: 1.8 },
      underwater:  { hue: 0.55, contrast: 0.6, wobble: 0.7, bloom: 0.8, saturation: 0.7, speed: 0.5, warp: 0.8 },
      fire:        { hue: 0.05, intensity: 0.9, warp: 2.0, ridge: 0.7, bloom: 0.6, warmth: 0.8, speed: 1.5 },
      ice:         { hue: 0.5, saturation: 0.5, contrast: 2.0, cells: 0.7, warmth: -0.8, bloom: 0.4, speed: 0.4 },
      psychedelic: { saturation: 2.0, spin: 0.8, symmetry: 6, warp: 1.5, bloom: 1.0, speed: 2.0, hue: 0.8 },
      minimal:     { intensity: 0.35, warp: 0.1, grain: 0, bloom: 0, glitch: 0, aberration: 0, saturation: 0.8, contrast: 1.0, speed: 0.6 },
      cosmic:      { hue: 0.75, bloom: 1.5, octaves: 7, zoom: 0.4, intensity: 0.6, warp: 0.8, saturation: 1.3 },
      industrial:  { saturation: 0.3, ridge: 0.8, grain: 0.5, contrast: 2.0, edge: 0.5, warmth: -0.2, speed: 1.2 },
      dream:       { speed: 0.3, wobble: 0.5, bloom: 1.2, warmth: 0.4, saturation: 0.8, intensity: 0.5, warp: 0.6 },
      nightmare:   { invert: 0.7, glitch: 0.6, speed: 2.5, aberration: 0.8, hue: 0.0, intensity: 0.8, contrast: 2.0 },
      crystal:     { cells: 0.8, contrast: 2.0, symmetry: 8, hue: 0.6, bloom: 0.5, saturation: 1.2 },
      organic:     { warp: 2.5, warmth: 0.5, edge: 0, bloom: 0.8, saturation: 1.2, speed: 0.7, noise_scale: 2.0 },
      digital:     { pixelate: 0.6, edge: 0.7, glitch: 0.4, hue: 0.5, speed: 2.0, contrast: 1.5, saturation: 1.5 },
      zen:         { speed: 0.25, intensity: 0.35, warp: 0.2, bloom: 0.3, warmth: 0.3, grain: 0, glitch: 0, aberration: 0, strobe: 0 },
      storm:       { speed: 3.0, warp: 2.5, strobe: 0.4, aberration: 0.5, intensity: 0.85, contrast: 1.5 },
      aurora:      { hue: 0.38, bloom: 1.0, wobble: 0.4, saturation: 1.6, warmth: -0.3, speed: 0.6, warp: 0.8 },
      lava:        { hue: 0.04, warp: 2.2, ridge: 0.8, bloom: 0.8, intensity: 0.9, warmth: 0.9, speed: 0.8 },
      fireworks:   { bloom: 2.0, strobe: 0.6, saturation: 2.0, speed: 3.0, zoom: 0.3, intensity: 1.0, warmth: 0.5, aberration: 0.4, warp: 1.5, contrast: 1.8, spin: 0.3 },
      void:        { zoom: 4.5, spin: 1.5, intensity: 0.05, warp: 2.5, saturation: 0, contrast: 2.5, vignette: 2.0, aberration: 0.7, speed: 2.0 },
      reset:       { intensity: 0.5, speed: 1, hue: 0, saturation: 1, contrast: 1, warmth: 0, gamma: 1, invert: 0,
                     zoom: 1, rotation: 0, symmetry: 0, mirror_x: 0, mirror_y: 0, warp: 0.5, noise_scale: 3,
                     octaves: 5, lacunarity: 2, grain: 0, pixelate: 0, edge: 0, ridge: 0, cells: 0,
                     drift_x: 0, drift_y: 0, spin: 0, wobble: 0, strobe: 0, bloom: 0, vignette: 0.5,
                     aberration: 0, glitch: 0, feedback: 0 },
    };

    const values = PRESETS[preset];
    if (!values) return `unknown preset: ${preset}`;

    // Track active theme (reset clears it)
    this.activeTheme = preset === "reset" ? null : preset;

    const duration = preset === "reset" ? 2.0 : 1.5;
    let count = 0;
    for (const [name, target] of Object.entries(values)) {
      if (!p.has(name)) continue;
      // Scale the difference from current value
      const current = p.get(name);
      const scaled = current + (target - current) * scale;
      p.drift(name, scaled, duration);
      count++;
    }

    // Fire a pulse so the user sees the moment
    p.set("pulse", Math.min(scale, 1.0));

    return `applied preset "${preset}" (${count} params, scale=${scale.toFixed(1)})`;
  }
}
