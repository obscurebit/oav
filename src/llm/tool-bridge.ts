/**
 * ToolBridge — executes LLM tool calls against the engine.
 * Sits between the Director and the ParameterStore / TextParticleSystem / Timeline.
 */

import type { ParameterStore } from "../engine/params";
import type { Timeline } from "../engine/timeline";
import type { TextParticleSystem } from "../overlay/text-particles";
import type { ToolCall } from "./tools";
import { MOOD_MAPPINGS } from "./tools";
import { AUDIO_PRESETS, AMBIENT_AUDIO_PRESETS } from "./audio-presets";
import type { Clock } from "../engine/clock";

export interface ToolBridgeDeps {
  params: ParameterStore;
  timeline: Timeline;
  particles: TextParticleSystem;
  canvasWidth: () => number;
  canvasHeight: () => number;
  clock: Clock;
}

/** Named visual presets — curated param combos for distinct visual moods. */
export const PRESETS: Record<string, Record<string, number>> = {
  noir:        { saturation: 0.15, contrast: 2.2, intensity: 0.4, grain: 0.6, warmth: -0.3, bloom: 0, warp: 0.3, brightness: 0.4, vignette: 0.8 },
  vaporwave:   { hue: 0.85, saturation: 1.8, bloom: 1.2, pixelate: 0.3, warmth: 0.2, speed: 0.6, aberration: 0.3, brightness: 0.7 },
  glitch_art:  { glitch: 0.8, aberration: 0.7, edge: 0.6, strobe: 0.3, speed: 2.0, contrast: 1.8, brightness: 0.6, saturation: 0.9 },
  underwater:  { hue: 0.55, contrast: 0.6, wobble: 0.7, bloom: 0.8, saturation: 0.7, speed: 0.5, warp: 0.8, brightness: 0.5, warmth: -0.2 },
  fire:        { hue: 0.05, intensity: 0.9, warp: 2.0, ridge: 0.7, bloom: 0.6, warmth: 0.8, speed: 1.5, brightness: 0.8 },
  ice:         { hue: 0.5, saturation: 0.5, contrast: 2.0, cells: 0.7, warmth: -0.8, bloom: 0.4, speed: 0.4, brightness: 0.7 },
  psychedelic: { saturation: 2.0, spin: 0.8, symmetry: 6, warp: 1.5, bloom: 1.0, speed: 2.0, hue: 0.8, brightness: 0.8 },
  minimal:     { intensity: 0.35, warp: 0.1, grain: 0, bloom: 0, glitch: 0, aberration: 0, saturation: 0.8, contrast: 1.0, speed: 0.6, brightness: 0.6 },
  cosmic:      { hue: 0.75, bloom: 1.5, octaves: 7, zoom: 0.4, intensity: 0.6, warp: 0.8, saturation: 1.3, brightness: 0.7 },
  industrial:  { saturation: 0.3, ridge: 0.8, grain: 0.5, contrast: 2.0, edge: 0.5, warmth: -0.2, speed: 1.2, brightness: 0.5 },
  dream:       { speed: 0.3, wobble: 0.5, bloom: 1.2, warmth: 0.4, saturation: 0.8, intensity: 0.5, warp: 0.6, brightness: 0.7 },
  crystal:     { cells: 0.8, contrast: 2.0, symmetry: 8, hue: 0.6, bloom: 0.5, saturation: 1.2, brightness: 0.8 },
  organic:     { warp: 2.5, warmth: 0.5, edge: 0, bloom: 0.8, saturation: 1.2, speed: 0.7, noise_scale: 2.0, brightness: 0.6 },
  digital:     { pixelate: 0.6, edge: 0.7, glitch: 0.4, hue: 0.5, speed: 2.0, contrast: 1.5, saturation: 1.5, brightness: 0.7 },
  zen:         { hue: 0.6, saturation: 0.7, bloom: 0.4, speed: 0.1, zoom: 1.0, intensity: 0.3, warmth: 0.1, contrast: 1.0, brightness: 0.6, vignette: 0.2, warp: 0.1, spin: 0.05, aberration: 0, noise_scale: 0.5, ridge: 0.1 },
  storm:       { speed: 3.0, warp: 2.5, strobe: 0.4, aberration: 0.5, intensity: 0.85, contrast: 1.5, brightness: 0.4, warmth: 0.2 },
  aurora:      { hue: 0.38, bloom: 1.0, wobble: 0.4, saturation: 1.6, warmth: -0.3, speed: 0.6, warp: 0.8, brightness: 0.7 },
  lava:        { hue: 0.04, warp: 2.2, ridge: 0.8, bloom: 0.8, intensity: 0.9, warmth: 0.9, speed: 0.8, brightness: 0.8 },
  fireworks:   { bloom: 0.4, strobe: 0.2, saturation: 1.0, speed: 1.2, zoom: 0.3, intensity: 0.8, warmth: 0.5, contrast: 1.8, vignette: 1.2, hue: 0.05, warp: 0.2, spin: 0, aberration: 0.05, noise_scale: 4, ridge: 0.3 },
  sparkle_field: { bloom: 0.6, saturation: 1.2, speed: 0.4, zoom: 1.0, intensity: 0.6, warmth: -0.2, contrast: 1.5, vignette: 0.5, hue: 0.6, warp: 0.1, spin: 0, aberration: 0.1, noise_scale: 3, ridge: 0 },
  electric_storm: { bloom: 1.2, strobe: 0.8, saturation: 1.5, speed: 2.5, zoom: 0.6, intensity: 0.95, warmth: 0.3, contrast: 2.0, vignette: 0.3, hue: 0.6, warp: 0.4, spin: 0.2, aberration: 0.6, noise_scale: 6, ridge: 0.4, glitch: 0.3 },
  lightning:    { bloom: 1.5, strobe: 0.9, saturation: 0.8, speed: 4.0, zoom: 0.4, intensity: 1.0, warmth: -0.4, contrast: 2.5, vignette: 0.1, hue: 0.55, warp: 0.2, spin: 0.1, aberration: 0.8, noise_scale: 8, ridge: 0.6, glitch: 0.4 },
  nightmare:   { hue: 0.0, saturation: 0.8, bloom: 0.3, speed: 1.5, zoom: 1.1, intensity: 0.9, warmth: -0.5, contrast: 2.0, vignette: 0.8, warp: 1.2, spin: 0.5, aberration: 0.3, noise_scale: 5, ridge: 0.6, glitch: 0.4 },
  
  // Word presets - dramatic scene titles with matching visuals
  emergence: { bloom: 0.4, saturation: 0.7, speed: 0.3, zoom: 1.2, intensity: 0.6, warmth: 0.1, contrast: 1.3, vignette: 0.6, hue: 0.58, warp: 0.2, spin: 0, aberration: 0, noise_scale: 1.8, ridge: 0, brightness: 0.6 },
  the_void_stirs: { bloom: 0.2, saturation: 0.4, speed: 0.2, zoom: 1.5, intensity: 0.3, warmth: -0.1, contrast: 1.1, vignette: 0.8, hue: 0.6, warp: 0.3, spin: -0.1, aberration: 0.1, noise_scale: 1.5, ridge: 0, brightness: 0.3 },
  first_light: { bloom: 1.0, saturation: 0.8, speed: 0.5, zoom: 0.8, intensity: 0.8, warmth: 0.3, contrast: 1.6, vignette: 0.4, hue: 0.52, warp: 0.1, spin: 0.2, aberration: 0, noise_scale: 2.5, ridge: 0.2, brightness: 0.9 },
  awakening: { bloom: 0.7, saturation: 1.0, speed: 0.6, zoom: 0.9, intensity: 0.75, warmth: 0.25, contrast: 1.5, vignette: 0.5, hue: 0.48, warp: 0.25, spin: 0.15, aberration: 0.08, noise_scale: 3, ridge: 0.15, brightness: 0.8 },
  from_nothing: { bloom: 0.1, saturation: 0.3, speed: 0.15, zoom: 2.0, intensity: 0.2, warmth: -0.2, contrast: 1.0, vignette: 1.0, hue: 0.62, warp: 0.4, spin: -0.2, aberration: 0.15, noise_scale: 1, ridge: 0, brightness: 0.2 },
  signal: { bloom: 0.5, strobe: 0.3, saturation: 0.9, speed: 1.2, zoom: 1.1, intensity: 0.7, warmth: 0, contrast: 1.8, vignette: 0.3, hue: 0.45, warp: 0.2, spin: 0.3, aberration: 0.2, noise_scale: 4, ridge: 0.1, glitch: 0.1, brightness: 0.7 },
  origin: { bloom: 0.3, saturation: 0.6, speed: 0.35, zoom: 1.3, intensity: 0.65, warmth: 0.15, contrast: 1.35, vignette: 0.55, hue: 0.5, warp: 0.18, spin: 0.05, aberration: 0.03, noise_scale: 2.2, ridge: 0.05, brightness: 0.6 },
  
  // Build words - structural, technical themes
  complexity: { bloom: 0.2, saturation: 0.8, speed: 0.7, zoom: 0.7, intensity: 0.6, warmth: 0.3, contrast: 1.6, vignette: 0.4, hue: 0.08, warp: 0.3, spin: 0.2, aberration: 0.1, noise_scale: 3.5, ridge: 0.2, edge: 0.3, brightness: 0.6 },
  the_pattern_grows: { bloom: 0.3, saturation: 0.9, speed: 0.8, zoom: 0.6, intensity: 0.7, warmth: 0.35, contrast: 1.7, vignette: 0.3, hue: 0.12, warp: 0.4, spin: 0.25, aberration: 0.12, noise_scale: 4, ridge: 0.25, cells: 0.2, brightness: 0.7 },
  deep_structure: { bloom: 0.15, saturation: 0.6, speed: 0.5, zoom: 0.8, intensity: 0.5, warmth: 0.25, contrast: 1.8, vignette: 0.6, hue: 0.15, warp: 0.35, spin: 0.15, aberration: 0.08, noise_scale: 2.8, ridge: 0.3, edge: 0.4, brightness: 0.5 },
  convergence: { bloom: 0.5, saturation: 1.1, speed: 0.9, zoom: 0.5, intensity: 0.8, warmth: 0.4, contrast: 1.9, vignette: 0.2, hue: 0.1, warp: 0.45, spin: 0.3, aberration: 0.15, noise_scale: 4.5, ridge: 0.2, symmetry: 2, brightness: 0.8 },
  lattice: { bloom: 0.25, saturation: 0.7, speed: 0.6, zoom: 0.9, intensity: 0.55, warmth: 0.2, contrast: 1.5, vignette: 0.5, hue: 0.18, warp: 0.25, spin: 0.1, aberration: 0.05, noise_scale: 2.5, ridge: 0.15, symmetry: 4, brightness: 0.6 },
  unfolding: { bloom: 0.4, saturation: 0.85, speed: 0.65, zoom: 0.75, intensity: 0.65, warmth: 0.3, contrast: 1.4, vignette: 0.45, hue: 0.22, warp: 0.3, spin: 0.18, aberration: 0.1, noise_scale: 3, ridge: 0.1, brightness: 0.7 },
  tessellation: { bloom: 0.35, saturation: 0.75, speed: 0.55, zoom: 0.85, intensity: 0.6, warmth: 0.28, contrast: 1.45, vignette: 0.48, hue: 0.25, warp: 0.28, spin: 0.12, aberration: 0.07, noise_scale: 2.7, ridge: 0.12, symmetry: 6, cells: 0.3, brightness: 0.65 },
  
  // Climax words - explosive, intense themes
  rupture: { bloom: 0.8, strobe: 0.6, saturation: 1.3, speed: 2.8, zoom: 0.4, intensity: 0.9, warmth: 0.6, contrast: 2.2, vignette: 0.2, hue: 0.02, warp: 0.6, spin: 0.4, aberration: 0.4, noise_scale: 7, ridge: 0.5, glitch: 0.2, brightness: 0.9 },
  supernova: { bloom: 1.5, saturation: 1.4, speed: 3.2, zoom: 0.3, intensity: 1.0, warmth: 0.7, contrast: 2.5, vignette: 0.1, hue: 0.05, warp: 0.8, spin: 0.5, aberration: 0.6, noise_scale: 8, ridge: 0.6, glitch: 0.3, brightness: 1.0 },
  the_storm: { bloom: 0.6, strobe: 0.4, saturation: 1.1, speed: 2.5, zoom: 0.5, intensity: 0.85, warmth: 0.4, contrast: 2.0, vignette: 0.3, hue: 0.15, warp: 0.5, spin: 0.35, aberration: 0.3, noise_scale: 6, ridge: 0.4, glitch: 0.15, brightness: 0.8 },
  critical_mass: { bloom: 0.7, strobe: 0.5, saturation: 1.2, speed: 2.2, zoom: 0.45, intensity: 0.88, warmth: 0.5, contrast: 2.1, vignette: 0.25, hue: 0.08, warp: 0.55, spin: 0.38, aberration: 0.35, noise_scale: 6.5, ridge: 0.45, glitch: 0.25, brightness: 0.85 },
  detonation: { bloom: 1.2, saturation: 1.0, speed: 3.5, zoom: 0.35, intensity: 0.95, warmth: 0.8, contrast: 2.3, vignette: 0.15, hue: 0.03, warp: 0.7, spin: 0.45, aberration: 0.5, noise_scale: 7.5, ridge: 0.55, glitch: 0.4, brightness: 0.9 },
  singularity: { bloom: 2.0, saturation: 0.9, speed: 4.0, zoom: 0.2, intensity: 1.0, warmth: 0.9, contrast: 2.8, vignette: 0.05, hue: 0.01, warp: 1.0, spin: 0.6, aberration: 0.8, noise_scale: 10, ridge: 0.7, glitch: 0.5, brightness: 1.0 },
  overload: { bloom: 0.9, strobe: 0.7, saturation: 1.5, speed: 2.0, zoom: 0.6, intensity: 0.92, warmth: 0.55, contrast: 2.4, vignette: 0.18, hue: 0.12, warp: 0.48, spin: 0.32, aberration: 0.42, noise_scale: 5.5, ridge: 0.35, glitch: 0.35, brightness: 0.8 },
  ignition: { bloom: 1.1, saturation: 1.1, speed: 2.6, zoom: 0.42, intensity: 0.87, warmth: 0.65, contrast: 2.0, vignette: 0.22, hue: 0.06, warp: 0.52, spin: 0.36, aberration: 0.38, noise_scale: 6.2, ridge: 0.38, glitch: 0.18, brightness: 0.9 },
  
  // Outro words - fading, dissolution themes
  dissolution: { bloom: 0.15, saturation: 0.4, speed: 0.18, zoom: 1.8, intensity: 0.25, warmth: -0.15, contrast: 0.9, vignette: 1.2, hue: 0.65, warp: 0.15, spin: -0.15, aberration: 0.12, noise_scale: 0.8, ridge: 0, brightness: 0.3 },
  ash: { bloom: 0.08, saturation: 0.2, speed: 0.12, zoom: 2.2, intensity: 0.15, warmth: -0.25, contrast: 0.8, vignette: 1.5, hue: 0.7, warp: 0.1, spin: -0.1, aberration: 0.08, noise_scale: 0.5, ridge: 0, grain: 0.3, brightness: 0.2 },
  the_long_fade: { bloom: 0.2, saturation: 0.5, speed: 0.25, zoom: 1.6, intensity: 0.3, warmth: -0.1, contrast: 1.0, vignette: 1.0, hue: 0.62, warp: 0.18, spin: -0.08, aberration: 0.1, noise_scale: 1.2, ridge: 0, brightness: 0.4 },
  entropy: { bloom: 0.12, saturation: 0.3, speed: 0.2, zoom: 2.0, intensity: 0.22, warmth: -0.2, contrast: 0.85, vignette: 1.3, hue: 0.68, warp: 0.22, spin: -0.12, aberration: 0.15, noise_scale: 0.7, ridge: 0, glitch: 0.05, brightness: 0.25 },
  remnant: { bloom: 0.25, saturation: 0.6, speed: 0.3, zoom: 1.4, intensity: 0.4, warmth: -0.05, contrast: 1.1, vignette: 0.8, hue: 0.58, warp: 0.2, spin: -0.05, aberration: 0.08, noise_scale: 1.5, ridge: 0.05, brightness: 0.5 },
  afterglow: { bloom: 0.4, saturation: 0.7, speed: 0.4, zoom: 1.2, intensity: 0.5, warmth: 0.05, contrast: 1.2, vignette: 0.6, hue: 0.55, warp: 0.25, spin: 0, aberration: 0.05, noise_scale: 1.8, ridge: 0.1, brightness: 0.6 },
  silence: { bloom: 0.05, saturation: 0.15, speed: 0.08, zoom: 2.5, intensity: 0.1, warmth: -0.3, contrast: 0.7, vignette: 1.8, hue: 0.72, warp: 0.08, spin: -0.18, aberration: 0.05, noise_scale: 0.3, ridge: 0, brightness: 0.15 },
  return: { bloom: 0.3, saturation: 0.55, speed: 0.35, zoom: 1.3, intensity: 0.45, warmth: 0, contrast: 1.15, vignette: 0.7, hue: 0.52, warp: 0.12, spin: -0.02, aberration: 0.06, noise_scale: 1.6, ridge: 0.08, brightness: 0.55 },
  
  void:        { zoom: 4.5, spin: 1.5, intensity: 0.05, warp: 2.5, saturation: 0, contrast: 2.5, vignette: 2.0, aberration: 0.7, speed: 2.0 },
  reset:       { intensity: 0.5, speed: 1, hue: 0, saturation: 1, contrast: 1, warmth: 0, gamma: 1, invert: 0,
                 zoom: 1, rotation: 0, symmetry: 0, mirror_x: 0, mirror_y: 0, warp: 0.5, noise_scale: 3,
                 octaves: 5, lacunarity: 2, grain: 0, pixelate: 0, edge: 0, ridge: 0, cells: 0,
                 drift_x: 0, drift_y: 0, spin: 0, wobble: 0, strobe: 0, bloom: 0, vignette: 0.5,
                 aberration: 0, glitch: 0, feedback: 0 },
};

// Map word presets back to original scene themes for text rendering
const WORD_TO_SCENE_THEME: Record<string, string> = {
  // Intro words
  emergence: "intro", genesis: "intro", the_void_stirs: "intro", first_light: "intro",
  awakening: "intro", from_nothing: "intro", signal: "intro", origin: "intro",
  // Build words  
  complexity: "build", the_pattern_grows: "build", deep_structure: "build",
  convergence: "build", lattice: "build", unfolding: "build", tessellation: "build",
  // Climax words
  rupture: "climax", supernova: "climax", the_storm: "climax", critical_mass: "climax",
  detonation: "climax", singularity: "climax", overload: "climax", ignition: "climax",
  // Outro words
  dissolution: "outro", ash: "outro", the_long_fade: "outro", entropy: "outro",
  remnant: "outro", afterglow: "outro", silence: "outro", return: "outro",
};

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
      case "firework":
        return this._firework(args);
      case "enhanced_firework":
        return this._enhancedFirework(args);
      case "sparkle":
        return this._sparkle(args);
      case "poke_springs":
        return this._pokeSprings(args);
      case "apply_preset":
        return this._applyPreset(args);
      case "apply_audio_preset":
        return this._applyAudioPreset(args);
      case "apply_ambient_audio_preset":
        return this._applyAmbientAudioPreset(args);
      case "list_audio_presets":
        return this._listAudioPresets(args);
      case "list_visual_presets":
        return this._listVisualPresets(args);
      // Lofi music controls
      case "play_lofi_track":
        return this._playLofiTrack(args);
      case "crossfade_lofi_track":
        return this._crossfadeLofiTrack(args);
      case "stop_lofi":
        return this._stopLofi(args);
      case "set_lofi_volume":
        return this._setLofiVolume(args);
      case "enable_lofi":
        return this._enableLofi(args);
      case "list_lofi_tracks":
        return this._listLofiTracks(args);
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

    // Get current time and add new scene entry
    const currentTime = this._deps.clock.elapsed;
    const transitionDuration = 3.0; // Smooth crossfade duration
    const startTime = currentTime;
    const endTime = startTime + duration;

    // Add the new scene to timeline
    this._deps.timeline.add({ 
      startTime, 
      endTime, 
      sceneId, 
      transitionDuration 
    });

    // Update timeline end marker
    const timelineEnd = endTime;
    
    // Trigger scene title for the new scene
    if (typeof window !== 'undefined') {
      const oav = (window as any).__OAV__;
      if (oav?.particles?.showSceneTitle) {
        const canvas = oav.renderer?._gl?.canvas;
        if (canvas) {
          oav.particles.showSceneTitle(sceneId, canvas.width, canvas.height);
        }
      }
    }

    return `transitioned to ${sceneId} (${duration}s scene, ${transitionDuration}s fade)`;
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

  // --- GPU effects ---

  private _firework(args: Record<string, unknown>): string {
    const x = Number(args.x ?? 0);
    const y = Number(args.y ?? 0);
    const intensity = Math.max(0.1, Math.min(2.0, Number(args.intensity ?? 1.0)));

    // Access GPU particles through global window (hacky but works for now)
    if (typeof window !== 'undefined') {
      const oav = (window as any).__OAV__;
      if (oav?.gpuParticles) {
        oav.gpuParticles.firework(x, y, intensity);
        return `firework burst at (${x.toFixed(2)}, ${y.toFixed(2)}) intensity=${intensity.toFixed(1)}`;
      }
    }
    return "GPU particles not available";
  }

  private _enhancedFirework(args: Record<string, unknown>): string {
    const x = Number(args.x ?? 0);
    const y = Number(args.y ?? 0);
    const type = String(args.type ?? "chrysanthemum");
    const color = String(args.color ?? "gold");
    const intensity = Math.max(0.1, Math.min(2.0, Number(args.intensity ?? 1.0)));

    if (typeof window !== 'undefined') {
      const oav = (window as any).__OAV__;
      if (oav?.gpuParticles) {
        oav.gpuParticles.enhancedFirework({
          x, y,
          type,
          color,
          intensity
        });
        return `enhanced ${type} firework at (${x.toFixed(2)}, ${y.toFixed(2)}) color=${color} intensity=${intensity.toFixed(1)}`;
      }
    }
    return "GPU particles not available";
  }

  private _sparkle(args: Record<string, unknown>): string {
    const x = Number(args.x ?? 0);
    const y = Number(args.y ?? 0);
    const count = Math.max(5, Math.min(50, Number(args.count ?? 10)));

    if (typeof window !== 'undefined') {
      const oav = (window as any).__OAV__;
      if (oav?.gpuParticles) {
        oav.gpuParticles.sparkle(x, y, count);
        return `sparkle burst at (${x.toFixed(2)}, ${y.toFixed(2)}) count=${count}`;
      }
    }
    return "GPU particles not available";
  }

  private _pokeSprings(args: Record<string, unknown>): string {
    const x = Number(args.x ?? 0);
    const y = Number(args.y ?? 0);
    const radius = Math.max(0.1, Math.min(1.0, Number(args.radius ?? 0.3)));
    const force = Math.max(0.1, Math.min(2.0, Number(args.force ?? 0.5)));

    if (typeof window !== 'undefined') {
      const oav = (window as any).__OAV__;
      if (oav?.gpuSprings) {
        oav.gpuSprings.poke(x, y, radius, force);
        return `poke springs at (${x.toFixed(2)}, ${y.toFixed(2)}) radius=${radius.toFixed(2)} force=${force.toFixed(1)}`;
      }
    }
    return "GPU springs not available";
  }

  // --- Presets ---

  private _applyPreset(args: Record<string, unknown>): string {
    const preset = String(args.preset ?? "");
    const scale = Math.max(0.1, Math.min(2.0, Number(args.intensity_scale ?? 1.0)));
    const p = this._deps.params;

    const values = PRESETS[preset];
    if (!values) return `unknown preset: ${preset}`;

    // Track active theme (reset clears it)
    this.activeTheme = preset === "reset" ? null : preset;

    const duration = preset === "reset" ? 2.0 : 1.5;

    // Special case: presets with GPU effects
    if (typeof window !== 'undefined') {
      const oav = (window as any).__OAV__;
      if (preset === "fireworks" && oav?.gpuParticles) {
      // 4th of July fireworks show - unpredictable and natural!
      const colors = ["red", "blue", "gold", "green", "purple", "white", "orange", "pink", "rainbow"];
      const types = ["chrysanthemum", "willow", "palm", "crossette", "salute"];
      
      const createRandomFirework = () => {
        // Random position across the sky
        const x = (Math.random() - 0.5) * 1.6;
        const y = 0.2 + Math.random() * 0.6; // Upper half of screen
        
        // Random size and intensity
        const intensity = 0.5 + Math.random() * 1.2; // 0.5 to 1.7
        const color = colors[Math.floor(Math.random() * colors.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        
        oav.gpuParticles.enhancedFirework({ x, y, intensity, color, type });
        
        // Sometimes add a quick follow-up burst
        if (Math.random() < 0.3) {
          setTimeout(() => {
            const followUpX = x + (Math.random() - 0.5) * 0.3;
            const followUpY = y + (Math.random() - 0.5) * 0.3;
            const followUpIntensity = intensity * 0.7;
            const followUpColor = colors[Math.floor(Math.random() * colors.length)];
            const followUpType = types[Math.floor(Math.random() * types.length)];
            
            oav.gpuParticles.enhancedFirework({
              x: followUpX,
              y: followUpY,
              intensity: followUpIntensity,
              color: followUpColor,
              type: followUpType
            });
          }, 100 + Math.random() * 400);
        }
      };
      
      // Create initial burst of fireworks
      const initialBurst = () => {
        const burstCount = 3 + Math.floor(Math.random() * 4); // 3-7 fireworks
        for (let i = 0; i < burstCount; i++) {
          setTimeout(() => createRandomFirework(), i * (200 + Math.random() * 300));
        }
      };
      
      // Continuous random fireworks
      const continuousShow = () => {
        // Random intervals between fireworks (200ms to 1.5s)
        const nextInterval = 200 + Math.random() * 1300;
        
        // Sometimes launch multiple at once
        if (Math.random() < 0.2) {
          // Double burst
          createRandomFirework();
          setTimeout(() => createRandomFirework(), 50 + Math.random() * 150);
        } else {
          createRandomFirework();
        }
        
        // Schedule next firework
        setTimeout(continuousShow, nextInterval);
      };
      
      // Start the show
      initialBurst();
      setTimeout(continuousShow, 1000 + Math.random() * 1000);
      
      // Stop after 30 seconds of chaos
      setTimeout(() => {
        // Grand finale - multiple big fireworks
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            oav.gpuParticles.enhancedFirework({
              x: (Math.random() - 0.5) * 1.2,
              y: 0.3 + Math.random() * 0.4,
              intensity: 1.2 + Math.random() * 0.5,
              color: "rainbow",
              type: "chrysanthemum"
            });
          }, i * 100);
        }
      }, 28000);
    } else if (preset === "jello" && oav?.gpuSprings) {
      // Enhanced jello mesh with paper-inspired parameters
      oav.gpuSprings.createGrid({
        cols: 24, rows: 18, // Higher resolution for better cloth behavior
        originX: -0.6, originY: -0.4,
        width: 1.2, height: 0.8,
        stiffness: 80, damping: 2.0, // Slightly stiffer for better jello feel
        mass: 0.012, // Lighter mass for more responsiveness
        pinnedRow: 17, // pin top row
        color: [0.8, 0.4, 0.6],
      });
      oav.gpuSprings.gravity = [0, -0.2]; // Gentle gravity for floating jello feel
      oav.gpuSprings.damping = 0.015; // Lower damping for more wobble
      oav.gpuSprings.drawLines = true;
      oav.gpuSprings.drawNodes = false;
      
      // Add initial jiggle to get the jello moving immediately
      oav.gpuSprings.jiggle = 0.5;
    } else if (preset === "cloth" && oav?.gpuSprings) {
      // Fabric-like cloth mesh with paper-inspired parameters
      oav.gpuSprings.createGrid({
        cols: 30, rows: 22, // Higher resolution for realistic fabric
        originX: -0.7, originY: -0.5,
        width: 1.4, height: 1.0,
        stiffness: 120, damping: 3.5, // Stiffer for fabric behavior
        mass: 0.008, // Very light mass
        pinnedRow: 21, // pin top row like hanging cloth
        color: [0.4, 0.6, 0.9], // Cool blue fabric
      });
      oav.gpuSprings.gravity = [0, -0.4]; // Stronger gravity for hanging cloth
      oav.gpuSprings.damping = 0.025; // Higher damping for fabric feel
      oav.gpuSprings.drawLines = true;
      oav.gpuSprings.drawNodes = false;
    } else if (preset === "sparkle_field" && oav?.gpuParticles) {
      // Create ambient sparkle field
      const createSparkles = () => {
        for (let i = 0; i < 5; i++) {
          const x = (Math.random() - 0.5) * 1.8;
          const y = (Math.random() - 0.5) * 1.8;
          oav.gpuParticles.sparkle(x, y, Math.floor(Math.random() * 15 + 5));
        }
      };
      createSparkles();
      // Continue sparkles every 2 seconds
      const interval = setInterval(createSparkles, 2000);
      // Clear interval after 30 seconds
      setTimeout(() => clearInterval(interval), 30000);
    } else if (preset === "aurora" && oav?.gpuParticles) {
      // Northern lights effect with flowing particles
      const createAuroraParticle = () => {
        const x = (Math.random() - 0.5) * 2.0;
        const y = -0.8 + Math.random() * 1.6; // Top to bottom
        oav.gpuParticles.sparkle(x, y, Math.floor(Math.random() * 8 + 3));
      };
      
      // Initial burst
      for (let i = 0; i < 20; i++) {
        createAuroraParticle();
      }
      
      // Continuous flow
      const interval = setInterval(createAuroraParticle, 300);
      setTimeout(() => clearInterval(interval), 25000);
    } else if (preset === "dream" && oav?.gpuParticles) {
      // Ethereal dream particles floating upward
      const createDreamParticle = () => {
        const x = (Math.random() - 0.5) * 1.5;
        const y = -0.9; // Start from bottom
        oav.gpuParticles.sparkle(x, y, Math.floor(Math.random() * 6 + 2));
      };
      
      // Gentle continuous flow
      const interval = setInterval(createDreamParticle, 500);
      setTimeout(() => clearInterval(interval), 30000);
    } else if (preset === "cosmic" && oav?.gpuParticles) {
      // Cosmic sparkles with occasional bursts
      const cosmicSparkle = () => {
        const x = (Math.random() - 0.5) * 1.6;
        const y = (Math.random() - 0.5) * 1.6;
        oav.gpuParticles.sparkle(x, y, Math.floor(Math.random() * 8 + 3));
      };
      
      // Gentle sparkles every 3 seconds
      const interval = setInterval(cosmicSparkle, 3000);
      setTimeout(() => clearInterval(interval), 45000);
    } else if (preset === "crystal" && oav?.gpuParticles) {
      // Crystalline sparkles with geometric patterns
      const createCrystalPattern = () => {
        // Create a hexagonal pattern of sparkles
        const centerX = (Math.random() - 0.5) * 1.0;
        const centerY = (Math.random() - 0.5) * 1.0;
        const radius = 0.2;
        
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          oav.gpuParticles.sparkle(x, y, 5);
        }
      };
      
      createCrystalPattern();
      const interval = setInterval(createCrystalPattern, 2000);
      setTimeout(() => clearInterval(interval), 20000);
    } else if (preset === "organic" && oav?.gpuParticles) {
      // Organic flowing particles
      const createOrganicFlow = () => {
        const x = (Math.random() - 0.5) * 1.8;
        const y = (Math.random() - 0.5) * 1.8;
        oav.gpuParticles.sparkle(x, y, Math.floor(Math.random() * 10 + 5));
      };
      
      // Continuous organic flow
      const interval = setInterval(createOrganicFlow, 400);
      setTimeout(() => clearInterval(interval), 35000);
    } else if (preset === "electric_storm" && oav?.gpuParticles && oav?.gpuSprings) {
      // Configure springs for storm effect
      oav.gpuSprings.createGrid({
        cols: 12, rows: 10,
        originX: -0.4, originY: -0.3,
        width: 0.8, height: 0.6,
        stiffness: 120, damping: 3.0,
        mass: 0.01,
        pinnedRow: -1, // no pins - free floating
        color: [0.3, 0.6, 1.0],
      });
      oav.gpuSprings.gravity = [0, 0];
      oav.gpuSprings.damping = 0.05;
      oav.gpuSprings.jiggle = 0.8;
      
      // Electric particle bursts
      const electricBurst = () => {
        const x = (Math.random() - 0.5) * 1.5;
        const y = (Math.random() - 0.5) * 1.5;
        oav.gpuParticles.firework(x, y, 0.3);
        // Poke springs at same location
        oav.gpuSprings.poke(x, y, 0.4, 0.8);
      };
      electricBurst();
      // Continue electric bursts
      const interval = setInterval(electricBurst, 1500);
      setTimeout(() => clearInterval(interval), 20000);
    } else if (preset === "cosmic" && oav?.gpuParticles) {
      // Ambient cosmic sparkles
      const cosmicSparkle = () => {
        const x = (Math.random() - 0.5) * 1.6;
        const y = (Math.random() - 0.5) * 1.6;
        oav.gpuParticles.sparkle(x, y, Math.floor(Math.random() * 8 + 3));
      };
      // Gentle sparkles every 3 seconds
      const interval = setInterval(cosmicSparkle, 3000);
      setTimeout(() => clearInterval(interval), 45000);
    } else if (preset === "storm" && oav?.gpuParticles) {
      // Occasional lightning bursts
      const lightning = () => {
        const x = (Math.random() - 0.5) * 1.8;
        const y = 0.8; // top of screen
        oav.gpuParticles.firework(x, y, 0.4);
      };
      // Lightning every 4 seconds
      const interval = setInterval(lightning, 4000);
      setTimeout(() => clearInterval(interval), 30000);
    } else if (preset === "lightning" && oav?.gpuParticles) {
      // Intense lightning storm with multiple strikes
      const lightningStrike = () => {
        // Main lightning bolt
        const mainX = (Math.random() - 0.5) * 1.6;
        const mainY = 0.9;
        oav.gpuParticles.enhancedFirework({
          x: mainX,
          y: mainY,
          intensity: 1.0,
          color: "white",
          type: "chrysanthemum"
        });
        
        // Secondary branches
        setTimeout(() => {
          for (let i = 0; i < 3; i++) {
            const branchX = mainX + (Math.random() - 0.5) * 0.4;
            const branchY = mainY - Math.random() * 0.3;
            oav.gpuParticles.firework(branchX, branchY, 0.3);
          }
        }, 100);
        
        // Ground flash
        setTimeout(() => {
          const groundX = mainX + (Math.random() - 0.5) * 0.2;
          oav.gpuParticles.firework(groundX, -0.8, 0.2);
        }, 200);
      };
      
      // Lightning strikes every 2-3 seconds (randomized)
      const scheduleNext = () => {
        const delay = 2000 + Math.random() * 1000;
        setTimeout(() => {
          lightningStrike();
          if (Math.random() > 0.3) {
            scheduleNext(); // 70% chance to continue
          }
        }, delay);
      };
      
      // Start the storm
      lightningStrike();
      scheduleNext();
      
      // Occasional double strike
      setTimeout(() => {
        if (Math.random() > 0.5) {
          lightningStrike();
          setTimeout(lightningStrike, 300);
        }
      }, 5000);
      }
    }

    // Handle word presets - show dramatic scene title
    const sceneTheme = WORD_TO_SCENE_THEME[preset];
    if (sceneTheme && typeof window !== 'undefined') {
      const oav = (window as any).__OAV__;
      if (oav?.particles?.showSceneTitle) {
        // Get canvas dimensions from the renderer
        const canvas = oav.renderer?._gl?.canvas;
        if (canvas) {
          oav.particles.showSceneTitle(sceneTheme, canvas.width, canvas.height);
        }
      }
    }

    let count = 0;
    for (const [name, target] of Object.entries(values)) {
      if (!p.has(name)) continue;
      
      // For brightness, contrast, and intensity, apply directly (no drift) for immediate effect
      if (name === 'brightness' || name === 'contrast' || name === 'intensity') {
        const current = p.get(name);
        const scaled = current + (target - current) * scale;
        p.set(name, scaled);
      } else {
        // Scale the difference from current value
        const current = p.get(name);
        const scaled = current + (target - current) * scale;
        p.drift(name, scaled, duration);
      }
      count++;
    }

    // Apply audio parameters from separate audio presets
    const audioPreset = AUDIO_PRESETS[preset];
    if (typeof window !== 'undefined' && audioPreset) {
      const oav = (window as any).__OAV__;
      if (oav?.audio) {
        oav.audio.setParams(audioPreset);
        
        // Trigger appropriate audio transition for preset
        switch (preset) {
          // Intense/Energetic presets
          case 'fire':
            oav.audio.triggerKick(0.7);
            setTimeout(() => oav.audio.triggerSnare(0.5), 150);
            break;
          case 'lightning':
            oav.audio.triggerKick(0.8);
            setTimeout(() => oav.audio.triggerSnare(0.6), 100);
            break;
          case 'storm':
            oav.audio.triggerKick(0.7);
            setTimeout(() => oav.audio.triggerSnare(0.5), 300);
            break;
          case 'nightmare':
            oav.audio.triggerKick(0.4);
            setTimeout(() => oav.audio.triggerSnare(0.3), 200);
            break;
          case 'electric_storm':
            oav.audio.triggerKick(0.6);
            setTimeout(() => oav.audio.triggerSnare(0.4), 100);
            break;
          case 'fireworks':
            oav.audio.triggerDrumPattern('dnb', 0.5);
            break;
            
          // Cold/Cool presets  
          case 'ice':
            oav.audio.triggerSnare(0.3);
            setTimeout(() => oav.audio.triggerHihat(0.2), 200);
            break;
          case 'aurora':
            oav.audio.triggerHihat(0.2);
            setTimeout(() => oav.audio.triggerSnare(0.2), 400);
            break;
          case 'crystal':
            oav.audio.triggerSnare(0.3);
            setTimeout(() => oav.audio.triggerHihat(0.15), 200);
            break;
          case 'underwater':
            oav.audio.triggerKick(0.3);
            setTimeout(() => oav.audio.triggerHihat(0.15), 400);
            break;
            
          // Warm/Organic presets
          case 'lava':
            oav.audio.triggerKick(0.5);
            setTimeout(() => oav.audio.triggerSnare(0.3), 300);
            break;
          case 'organic':
            oav.audio.triggerHihat(0.2);
            setTimeout(() => oav.audio.triggerKick(0.3), 400);
            break;
          case 'dream':
            oav.audio.triggerHihat(0.15);
            setTimeout(() => oav.audio.triggerKick(0.2), 500);
            break;
            
          // Psychedelic/Abstract presets
          case 'psychedelic':
            oav.audio.triggerDrumPattern('techno', 0.4);
            break;
          case 'vaporwave':
            oav.audio.triggerKick(0.3);
            setTimeout(() => oav.audio.triggerHihat(0.2), 400);
            break;
          case 'glitch_art':
            oav.audio.triggerKick(0.4);
            setTimeout(() => oav.audio.triggerSnare(0.3), 200);
            break;
          case 'cosmic':
            oav.audio.triggerHihat(0.15);
            setTimeout(() => oav.audio.triggerKick(0.2), 600);
            break;
            
          // Industrial/Mechanical presets
          case 'industrial':
            oav.audio.triggerKick(0.6);
            setTimeout(() => oav.audio.triggerSnare(0.4), 250);
            break;
          case 'digital':
            oav.audio.triggerKick(0.4);
            setTimeout(() => oav.audio.triggerHihat(0.25), 150);
            break;
          case 'minimal':
            oav.audio.triggerHihat(0.15);
            setTimeout(() => oav.audio.triggerKick(0.2), 500);
            break;
          case 'noir':
            oav.audio.triggerKick(0.4);
            setTimeout(() => oav.audio.triggerSnare(0.3), 400);
            break;
            
          // Calm/Peaceful presets
          case 'zen':
            oav.audio.triggerHihat(0.1);
            setTimeout(() => oav.audio.triggerKick(0.15), 800);
            break;
            
          // Special effect presets
          case 'sparkle_field':
            oav.audio.triggerSnare(0.2);
            setTimeout(() => oav.audio.triggerHihat(0.15), 300);
            break;
          case 'jello':
          case 'cloth':
            oav.audio.triggerKick(0.2);
            break;
            
          default:
            oav.audio.triggerKick(0.4);
        }
      }
    }

    // Fire a pulse so the user sees the moment
    p.set("pulse", Math.min(scale, 1.0));

    return `applied preset "${preset}" (${count} visual params, ${audioPreset ? Object.keys(audioPreset).length : 0} audio params, scale=${scale.toFixed(1)})`;
  }

  private _applyAudioPreset(args: Record<string, unknown>): string {
    const preset = String(args.preset ?? "");
    const scale = Math.max(0.1, Math.min(2.0, Number(args.intensity_scale ?? 1.0)));

    const audioPreset = AUDIO_PRESETS[preset];
    if (!audioPreset) return `unknown audio preset: ${preset}`;

    // Apply audio parameters only (no visual changes)
    if (typeof window !== 'undefined') {
      const oav = (window as any).__OAV__;
      if (oav?.audio) {
        // Scale audio parameters by intensity scale
        const scaledPreset: Record<string, number> = {};
        for (const [key, value] of Object.entries(audioPreset)) {
          scaledPreset[key] = (value as number) * scale;
        }
        oav.audio.setParams(scaledPreset);
        
        // Trigger appropriate drum pattern for typing sound presets
        switch (preset) {
          case 'morse_code':
            oav.audio.triggerKick(0.3);
            setTimeout(() => oav.audio.triggerHihat(0.2), 150);
            break;
          case 'typewriter':
            oav.audio.triggerSnare(0.4);
            setTimeout(() => oav.audio.triggerHihat(0.3), 100);
            break;
          case 'subtle_beat':
            oav.audio.triggerKick(0.2);
            break;
          case 'impact_beat':
            oav.audio.triggerKick(0.8);
            setTimeout(() => oav.audio.triggerSnare(0.6), 200);
            break;
          case 'static_hiss':
            // Just set noise parameters, no drums
            break;
          case 'static_beat':
            oav.audio.triggerKick(0.5);
            break;
          case 'loud_static_beep':
            oav.audio.triggerSnare(0.7);
            break;
          case 'quiet_static_beep':
            oav.audio.triggerHihat(0.2);
            break;
          case 'raindrops':
            oav.audio.triggerHihat(0.3);
            setTimeout(() => oav.audio.triggerHihat(0.2), 300);
            break;
          default:
            // For other audio presets, use existing logic
            oav.audio.triggerKick(0.5);
        }
      }
    }

    return `applied audio preset "${preset}" (${Object.keys(audioPreset).length} audio params, scale=${scale.toFixed(1)})`;
  }

  private _applyAmbientAudioPreset(args: Record<string, unknown>): string {
    const preset = String(args.preset ?? "");
    const scale = Math.max(0.1, Math.min(2.0, Number(args.intensity_scale ?? 1.0)));

    const audioPreset = AMBIENT_AUDIO_PRESETS[preset];
    if (!audioPreset) return `unknown ambient audio preset: ${preset}`;

    // Apply ambient audio parameters only (no typing-specific changes)
    if (typeof window !== 'undefined') {
      const oav = (window as any).__OAV__;
      if (oav?.audio) {
        // Scale audio parameters by intensity scale
        const scaledPreset: Record<string, number> = {};
        for (const [key, value] of Object.entries(audioPreset)) {
          scaledPreset[key] = (value as number) * scale;
        }
        oav.audio.setParams(scaledPreset);
        
        // Trigger appropriate drum patterns for ambient presets
        switch (preset) {
          case 'noir':
            oav.audio.triggerKick(0.5);
            break;
          case 'vaporwave':
            oav.audio.triggerKick(0.4);
            setTimeout(() => oav.audio.triggerHihat(0.3), 250);
            break;
          case 'glitch_art':
            oav.audio.triggerDrumPattern('dnb', 0.7);
            break;
          case 'psychedelic':
          case 'cosmic':
            oav.audio.triggerDrumPattern('techno', 0.5);
            break;
          case 'industrial':
          case 'storm':
            oav.audio.triggerKick(0.8);
            setTimeout(() => oav.audio.triggerSnare(0.6), 200);
            break;
          case 'minimal':
          case 'zen':
            oav.audio.triggerHihat(0.2);
            break;
          case 'aurora':
          case 'crystal':
            oav.audio.triggerSnare(0.4);
            setTimeout(() => oav.audio.triggerHihat(0.3), 100);
            break;
          default:
            oav.audio.triggerKick(0.5);
        }
      }
    }

    return `applied ambient audio preset "${preset}" (${Object.keys(audioPreset).length} audio params, scale=${scale.toFixed(1)})`;
  }

  private _listAudioPresets(args: Record<string, unknown>): string {
    const typingPresets = [
      "morse_code: rhythmic beeps like morse code (high frequency, rhythmic)",
      "typewriter: mechanical typewriter clicks (noisy, percussive)",
      "subtle_beat: gentle background rhythm (soft, warm)",
      "impact_beat: strong percussive hits (powerful, rhythmic)",
      "static_hiss: continuous static noise (noisy, ambient)",
      "static_beat: static with rhythmic pulses (noisy, rhythmic)",
      "loud_static_beep: piercing static beeps (harsh, high energy)",
      "quiet_static_beep: soft background static beeps (gentle, ambient)",
      "raindrops: gentle raindrop sounds (soft, natural)"
    ];
    
    const ambientPresets = [
      "noir: dark, moody atmosphere",
      "vaporwave: dreamy, nostalgic atmosphere",
      "glitch_art: distorted, glitchy atmosphere",
      "underwater: flowing, muffled atmosphere",
      "fire: hot, intense atmosphere",
      "ice: cold, icy atmosphere",
      "psychedelic: trippy, resonant atmosphere",
      "minimal: clean, minimal atmosphere",
      "cosmic: spacious, ethereal atmosphere",
      "industrial: mechanical, harsh atmosphere",
      "dream: soft, gentle atmosphere",
      "nightmare: distorted, aggressive atmosphere",
      "crystal: clear, bright atmosphere",
      "organic: natural, flowing atmosphere",
      "digital: electronic, sharp atmosphere",
      "zen: peaceful, calm atmosphere",
      "storm: turbulent, intense atmosphere",
      "aurora: atmospheric, flowing atmosphere",
      "lava: hot, intense atmosphere"
    ];
    
    const visualAudioPresets = [
      "noir: desaturated, high contrast, dark, grain + moody audio",
      "vaporwave: pink/cyan hue, high saturation, bloom + dreamy audio",
      "glitch_art: glitch, aberration, edge, strobe + distorted audio",
      "underwater: blue hue, low contrast, wobble + muffled audio",
      "fire: red/orange hue, high intensity, warp + intense audio",
      "ice: cyan hue, low saturation, high contrast + cold audio",
      "psychedelic: high saturation, spin, symmetry, warp + trippy audio",
      "minimal: low intensity, no warp, no effects + clean audio",
      "cosmic: purple hue, bloom, high octaves + ethereal audio",
      "industrial: desaturated, ridge, grain + harsh audio",
      "dream: soft bloom, gentle wobble + gentle audio",
      "nightmare: inverted, glitch, high speed + aggressive audio",
      "crystal: high contrast, cells, symmetry + clear audio",
      "organic: high warp, warm tones + natural audio",
      "digital: pixelate, edge, glitch + sharp audio",
      "zen: very slow, minimal effects + calm audio",
      "storm: high speed, warp, strobe + turbulent audio",
      "aurora: green/blue hue, bloom, wobble + atmospheric audio",
      "lava: red/orange hue, high warp + hot audio",
      "fireworks: warm burst colors + celebratory audio + GPU effects",
      "jello: soft, wobbling spring mesh + interactive physics",
      "cloth: fabric-like hanging mesh + realistic cloth behavior",
      "sparkle_field: cool blue/purple tones + ambient sparkles",
      "electric_storm: high energy, strobing + electric effects",
      "lightning: electrical, intense + dramatic effects"
    ];
    
    return `🎹 TYPING PRESETS (apply_audio_preset):\n${typingPresets.map(p => `  - ${p}`).join('\n')}\n\n🎵 AMBIENT PRESETS (apply_ambient_audio_preset):\n${ambientPresets.map(p => `  - ${p}`).join('\n')}\n\n🎨 VISUAL+AUDIO PRESETS (apply_preset):\n${visualAudioPresets.map(p => `  - ${p}`).join('\n')}\n\n💡 Use apply_audio_preset for typing sounds, apply_ambient_audio_preset for mood setting, apply_preset for complete audiovisual experiences.`;
  }

  private _listVisualPresets(args: Record<string, unknown>): string {
    const visualPresets = [
      { name: "fire", tags: ["intense", "energetic", "hot", "aggressive", "passionate"], mood: "high energy" },
      { name: "lightning", tags: ["electrical", "intense", "dramatic", "powerful", "stormy"], mood: "very intense" },
      { name: "storm", tags: ["turbulent", "intense", "chaotic", "aggressive", "energetic"], mood: "high energy" },
      { name: "nightmare", tags: ["distorted", "aggressive", "dark", "unsettling", "intense"], mood: "very intense" },
      { name: "electric_storm", tags: ["high energy", "strobing", "electric", "chaotic", "intense"], mood: "very intense" },
      { name: "ice", tags: ["cold", "icy", "crystalline", "sharp", "minimalist", "clean"], mood: "cool and calm" },
      { name: "aurora", tags: ["atmospheric", "flowing", "cool", "ethereal", "gentle"], mood: "peaceful" },
      { name: "crystal", tags: ["clear", "bright", "geometric", "structured", "clean"], mood: "peaceful" },
      { name: "underwater", tags: ["flowing", "muffled", "cool", "deep", "mysterious"], mood: "mysterious" },
      { name: "lava", tags: ["hot", "flowing", "organic", "intense", "volcanic"], mood: "intense" },
      { name: "organic", tags: ["natural", "flowing", "warm", "textured", "alive"], mood: "warm" },
      { name: "dream", tags: ["soft", "gentle", "warm", "ethereal", "peaceful"], mood: "peaceful" },
      { name: "psychedelic", tags: ["trippy", "resonant", "colorful", "warped", "surreal"], mood: "altered" },
      { name: "vaporwave", tags: ["nostalgic", "dreamy", "synthetic", "retro", "cool"], mood: "dreamy" },
      { name: "glitch_art", tags: ["distorted", "digital", "chaotic", "noisy", "broken"], mood: "chaotic" },
      { name: "cosmic", tags: ["spacious", "ethereal", "vast", "mysterious", "otherworldly"], mood: "ethereal" },
      { name: "industrial", tags: ["mechanical", "harsh", "metallic", "structured", "gritty"], mood: "harsh" },
      { name: "digital", tags: ["electronic", "sharp", "pixelated", "clean", "modern"], mood: "technical" },
      { name: "minimal", tags: ["clean", "simple", "restrained", "quiet", "focused"], mood: "calm" },
      { name: "noir", tags: ["dark", "moody", "cinematic", "dramatic", "mysterious"], mood: "dramatic" },
      { name: "zen", tags: ["peaceful", "calm", "meditative", "slow", "balanced"], mood: "serene" },
      { name: "fireworks", tags: ["celebratory", "bright", "explosive", "joyful", "festive"], mood: "joyful" }
    ];
    
    // Group by mood for better organization
    const groupedPresets = visualPresets.reduce((acc, preset) => {
      const mood = preset.mood.toLowerCase();
      if (!acc[mood]) acc[mood] = [];
      acc[mood].push(preset);
      return acc;
    }, {} as Record<string, typeof visualPresets>);
    
    let result = "🎨 VISUAL PRESETS (apply_preset):\n\n";
    
    // Sort moods by intensity (intense → calm)
    const moodOrder = ["very intense", "high energy", "intense", "altered", "chaotic", "harsh", "technical", "ethereal", "dreamy", "joyful", "mysterious", "peaceful", "serene", "calm"];
    
    moodOrder.forEach(mood => {
      if (groupedPresets[mood]) {
        result += `\n${mood.toUpperCase()}:\n`;
        groupedPresets[mood].forEach(preset => {
          const tags = preset.tags.join(", ");
          result += `  - ${preset.name}: ${tags}\n`;
        });
      }
    });
    
    result += "\n💡 Tags help match presets to emotional states. Use apply_preset to apply both visual and matching audio.";
    
    return result;
  }

  // --- Lofi Music Controls ---

  private _playLofiTrack(args: Record<string, unknown>): string {
    const trackId = String(args.track_id ?? "");
    if (!trackId) return "no track_id provided";
    
    // Get audio instance from global OAV object
    const oav = (window as any).__OAV__;
    if (!oav?.audio) {
      return "audio system not available";
    }
    
    try {
      oav.audio.setLofiEnabled(true);
      oav.audio.playLofiTrack(trackId);
      return `playing lofi track: ${trackId}`;
    } catch (error) {
      return `failed to play lofi track: ${error}`;
    }
  }

  private _crossfadeLofiTrack(args: Record<string, unknown>): string {
    const trackId = String(args.track_id ?? "");
    const duration = Number(args.duration ?? 2);
    
    if (!trackId) return "no track_id provided";
    
    const oav = (window as any).__OAV__;
    if (!oav?.audio) {
      return "audio system not available";
    }
    
    try {
      oav.audio.crossfadeLofiTrack(trackId, duration);
      return `crossfading to lofi track: ${trackId} (${duration}s)`;
    } catch (error) {
      return `failed to crossfade lofi track: ${error}`;
    }
  }

  private _stopLofi(args: Record<string, unknown>): string {
    const oav = (window as any).__OAV__;
    if (!oav?.audio) {
      return "audio system not available";
    }
    
    try {
      oav.audio.stopLofi();
      return "stopped lofi music";
    } catch (error) {
      return `failed to stop lofi: ${error}`;
    }
  }

  private _setLofiVolume(args: Record<string, unknown>): string {
    const volume = Number(args.volume ?? 0.5);
    
    if (volume < 0 || volume > 1) {
      return "volume must be between 0.0 and 1.0";
    }
    
    const oav = (window as any).__OAV__;
    if (!oav?.audio) {
      return "audio system not available";
    }
    
    try {
      oav.audio.setLofiVolume(volume);
      return `set lofi volume to ${volume}`;
    } catch (error) {
      return `failed to set lofi volume: ${error}`;
    }
  }

  private _enableLofi(args: Record<string, unknown>): string {
    const enabled = Boolean(args.enabled ?? true);
    
    const oav = (window as any).__OAV__;
    if (!oav?.audio) {
      return "audio system not available";
    }
    
    try {
      oav.audio.setLofiEnabled(enabled);
      return `lofi music ${enabled ? 'enabled' : 'disabled'}`;
    } catch (error) {
      return `failed to ${enabled ? 'enable' : 'disable'} lofi: ${error}`;
    }
  }

  private _listLofiTracks(args: Record<string, unknown>): string {
    const oav = (window as any).__OAV__;
    if (!oav?.audio) {
      return "audio system not available";
    }
    
    try {
      const tracks = oav.audio.getLofiTracks();
      const currentTrack = oav.audio.getCurrentLofiTrack();
      const isPlaying = oav.audio.lofiPlaying;
      
      let result = "🎵 LOFI TRACKS:\n\n";
      
      // Group by mood
      const tracksByMood = tracks.reduce((acc: Record<string, typeof tracks>, track: typeof tracks[0]) => {
        if (!acc[track.mood]) acc[track.mood] = [];
        acc[track.mood].push(track);
        return acc;
      }, {} as Record<string, typeof tracks>);
      
      Object.entries(tracksByMood).forEach(([mood, moodTracks]) => {
        result += `${mood.toUpperCase()}:\n`;
        (moodTracks as typeof tracks).forEach((track: typeof tracks[0]) => {
          const isCurrent = currentTrack?.id === track.id ? " (playing)" : "";
          result += `  - ${track.name} [${track.id}]${isCurrent}\n`;
          result += `    ${track.description} (${track.bpm} BPM)\n`;
        });
        result += "\n";
      });
      
      result += `Current status: ${isPlaying ? 'playing' : 'stopped'} | Volume: ${(oav.audio.lofiVolume * 100).toFixed(0)}%`;
      
      return result;
    } catch (error) {
      return `failed to list lofi tracks: ${error}`;
    }
  }
}
