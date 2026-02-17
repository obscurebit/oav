/**
 * ToolBridge — executes LLM tool calls against the engine.
 * Sits between the Director and the ParameterStore / TextParticleSystem / Timeline.
 */

import type { ParameterStore } from "../engine/params";
import type { Timeline } from "../engine/timeline";
import type { TextParticleSystem } from "../overlay/text-particles";
import type { ToolCall } from "./tools";
import { MOOD_MAPPINGS } from "./tools";
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
  fireworks:   { bloom: 0.4, strobe: 0.2, saturation: 1.0, speed: 1.2, zoom: 0.3, intensity: 0.8, warmth: 0.5, contrast: 1.8, vignette: 1.2, hue: 0.05, warp: 0.2, spin: 0, aberration: 0.05, noise_scale: 4, ridge: 0.3 },
  jello:       { bloom: 0.3, saturation: 0.8, speed: 0.6, zoom: 0.8, intensity: 0.5, warmth: 0.2, contrast: 1.3, vignette: 0.8, hue: 0.4, warp: 0.1, spin: 0, aberration: 0, noise_scale: 2, ridge: 0 },
  cloth:       { bloom: 0.2, saturation: 0.6, speed: 0.3, zoom: 1.0, intensity: 0.4, warmth: 0.1, contrast: 1.2, vignette: 0.6, hue: 0.55, warp: 0.05, spin: 0, aberration: 0, noise_scale: 1.5, ridge: 0 },
  sparkle_field: { bloom: 0.6, saturation: 1.2, speed: 0.4, zoom: 1.0, intensity: 0.6, warmth: -0.2, contrast: 1.5, vignette: 0.5, hue: 0.6, warp: 0.1, spin: 0, aberration: 0.1, noise_scale: 3, ridge: 0 },
  electric_storm: { bloom: 1.2, strobe: 0.8, saturation: 1.5, speed: 2.5, zoom: 0.6, intensity: 0.95, warmth: 0.3, contrast: 2.0, vignette: 0.3, hue: 0.6, warp: 0.4, spin: 0.2, aberration: 0.6, noise_scale: 6, ridge: 0.4, glitch: 0.3 },
  
  // Word presets - dramatic scene titles with matching visuals
  emergence: { bloom: 0.4, saturation: 0.7, speed: 0.3, zoom: 1.2, intensity: 0.6, warmth: 0.1, contrast: 1.3, vignette: 0.6, hue: 0.58, warp: 0.2, spin: 0, aberration: 0, noise_scale: 1.8, ridge: 0 },
  genesis: { bloom: 0.6, saturation: 0.9, speed: 0.4, zoom: 1.0, intensity: 0.7, warmth: 0.2, contrast: 1.4, vignette: 0.5, hue: 0.55, warp: 0.15, spin: 0.1, aberration: 0.05, noise_scale: 2, ridge: 0.1 },
  the_void_stirs: { bloom: 0.2, saturation: 0.4, speed: 0.2, zoom: 1.5, intensity: 0.3, warmth: -0.1, contrast: 1.1, vignette: 0.8, hue: 0.6, warp: 0.3, spin: -0.1, aberration: 0.1, noise_scale: 1.5, ridge: 0 },
  first_light: { bloom: 1.0, saturation: 0.8, speed: 0.5, zoom: 0.8, intensity: 0.8, warmth: 0.3, contrast: 1.6, vignette: 0.4, hue: 0.52, warp: 0.1, spin: 0.2, aberration: 0, noise_scale: 2.5, ridge: 0.2 },
  awakening: { bloom: 0.7, saturation: 1.0, speed: 0.6, zoom: 0.9, intensity: 0.75, warmth: 0.25, contrast: 1.5, vignette: 0.5, hue: 0.48, warp: 0.25, spin: 0.15, aberration: 0.08, noise_scale: 3, ridge: 0.15 },
  from_nothing: { bloom: 0.1, saturation: 0.3, speed: 0.15, zoom: 2.0, intensity: 0.2, warmth: -0.2, contrast: 1.0, vignette: 1.0, hue: 0.62, warp: 0.4, spin: -0.2, aberration: 0.15, noise_scale: 1, ridge: 0 },
  signal: { bloom: 0.5, strobe: 0.3, saturation: 0.9, speed: 1.2, zoom: 1.1, intensity: 0.7, warmth: 0, contrast: 1.8, vignette: 0.3, hue: 0.45, warp: 0.2, spin: 0.3, aberration: 0.2, noise_scale: 4, ridge: 0.1, glitch: 0.1 },
  origin: { bloom: 0.3, saturation: 0.6, speed: 0.35, zoom: 1.3, intensity: 0.65, warmth: 0.15, contrast: 1.35, vignette: 0.55, hue: 0.5, warp: 0.18, spin: 0.05, aberration: 0.03, noise_scale: 2.2, ridge: 0.05 },
  
  // Build words - structural, technical themes
  complexity: { bloom: 0.2, saturation: 0.8, speed: 0.7, zoom: 0.7, intensity: 0.6, warmth: 0.3, contrast: 1.6, vignette: 0.4, hue: 0.08, warp: 0.3, spin: 0.2, aberration: 0.1, noise_scale: 3.5, ridge: 0.2, edge: 0.3 },
  the_pattern_grows: { bloom: 0.3, saturation: 0.9, speed: 0.8, zoom: 0.6, intensity: 0.7, warmth: 0.35, contrast: 1.7, vignette: 0.3, hue: 0.12, warp: 0.4, spin: 0.25, aberration: 0.12, noise_scale: 4, ridge: 0.25, cells: 0.2 },
  deep_structure: { bloom: 0.15, saturation: 0.6, speed: 0.5, zoom: 0.8, intensity: 0.5, warmth: 0.25, contrast: 1.8, vignette: 0.6, hue: 0.15, warp: 0.35, spin: 0.15, aberration: 0.08, noise_scale: 2.8, ridge: 0.3, edge: 0.4 },
  convergence: { bloom: 0.5, saturation: 1.1, speed: 0.9, zoom: 0.5, intensity: 0.8, warmth: 0.4, contrast: 1.9, vignette: 0.2, hue: 0.1, warp: 0.45, spin: 0.3, aberration: 0.15, noise_scale: 4.5, ridge: 0.2, symmetry: 2 },
  lattice: { bloom: 0.25, saturation: 0.7, speed: 0.6, zoom: 0.9, intensity: 0.55, warmth: 0.2, contrast: 1.5, vignette: 0.5, hue: 0.18, warp: 0.25, spin: 0.1, aberration: 0.05, noise_scale: 2.5, ridge: 0.15, symmetry: 4 },
  unfolding: { bloom: 0.4, saturation: 0.85, speed: 0.65, zoom: 0.75, intensity: 0.65, warmth: 0.3, contrast: 1.4, vignette: 0.45, hue: 0.22, warp: 0.3, spin: 0.18, aberration: 0.1, noise_scale: 3, ridge: 0.1 },
  tessellation: { bloom: 0.35, saturation: 0.75, speed: 0.55, zoom: 0.85, intensity: 0.6, warmth: 0.28, contrast: 1.45, vignette: 0.48, hue: 0.25, warp: 0.28, spin: 0.12, aberration: 0.07, noise_scale: 2.7, ridge: 0.12, symmetry: 6, cells: 0.3 },
  
  // Climax words - explosive, intense themes
  rupture: { bloom: 0.8, strobe: 0.6, saturation: 1.3, speed: 2.8, zoom: 0.4, intensity: 0.9, warmth: 0.6, contrast: 2.2, vignette: 0.2, hue: 0.02, warp: 0.6, spin: 0.4, aberration: 0.4, noise_scale: 7, ridge: 0.5, glitch: 0.2 },
  supernova: { bloom: 1.5, saturation: 1.4, speed: 3.2, zoom: 0.3, intensity: 1.0, warmth: 0.7, contrast: 2.5, vignette: 0.1, hue: 0.05, warp: 0.8, spin: 0.5, aberration: 0.6, noise_scale: 8, ridge: 0.6, glitch: 0.3 },
  the_storm: { bloom: 0.6, strobe: 0.4, saturation: 1.1, speed: 2.5, zoom: 0.5, intensity: 0.85, warmth: 0.4, contrast: 2.0, vignette: 0.3, hue: 0.15, warp: 0.5, spin: 0.35, aberration: 0.3, noise_scale: 6, ridge: 0.4, glitch: 0.15 },
  critical_mass: { bloom: 0.7, strobe: 0.5, saturation: 1.2, speed: 2.2, zoom: 0.45, intensity: 0.88, warmth: 0.5, contrast: 2.1, vignette: 0.25, hue: 0.08, warp: 0.55, spin: 0.38, aberration: 0.35, noise_scale: 6.5, ridge: 0.45, glitch: 0.25 },
  detonation: { bloom: 1.2, saturation: 1.0, speed: 3.5, zoom: 0.35, intensity: 0.95, warmth: 0.8, contrast: 2.3, vignette: 0.15, hue: 0.03, warp: 0.7, spin: 0.45, aberration: 0.5, noise_scale: 7.5, ridge: 0.55, glitch: 0.4 },
  singularity: { bloom: 2.0, saturation: 0.9, speed: 4.0, zoom: 0.2, intensity: 1.0, warmth: 0.9, contrast: 2.8, vignette: 0.05, hue: 0.01, warp: 1.0, spin: 0.6, aberration: 0.8, noise_scale: 10, ridge: 0.7, glitch: 0.5 },
  overload: { bloom: 0.9, strobe: 0.7, saturation: 1.5, speed: 2.0, zoom: 0.6, intensity: 0.92, warmth: 0.55, contrast: 2.4, vignette: 0.18, hue: 0.12, warp: 0.48, spin: 0.32, aberration: 0.42, noise_scale: 5.5, ridge: 0.35, glitch: 0.35 },
  ignition: { bloom: 1.1, saturation: 1.1, speed: 2.6, zoom: 0.42, intensity: 0.87, warmth: 0.65, contrast: 2.0, vignette: 0.22, hue: 0.06, warp: 0.52, spin: 0.36, aberration: 0.38, noise_scale: 6.2, ridge: 0.38, glitch: 0.18 },
  
  // Outro words - fading, dissolution themes
  dissolution: { bloom: 0.15, saturation: 0.4, speed: 0.18, zoom: 1.8, intensity: 0.25, warmth: -0.15, contrast: 0.9, vignette: 1.2, hue: 0.65, warp: 0.15, spin: -0.15, aberration: 0.12, noise_scale: 0.8, ridge: 0 },
  ash: { bloom: 0.08, saturation: 0.2, speed: 0.12, zoom: 2.2, intensity: 0.15, warmth: -0.25, contrast: 0.8, vignette: 1.5, hue: 0.7, warp: 0.1, spin: -0.1, aberration: 0.08, noise_scale: 0.5, ridge: 0, grain: 0.3 },
  the_long_fade: { bloom: 0.2, saturation: 0.5, speed: 0.25, zoom: 1.6, intensity: 0.3, warmth: -0.1, contrast: 1.0, vignette: 1.0, hue: 0.62, warp: 0.18, spin: -0.08, aberration: 0.1, noise_scale: 1.2, ridge: 0 },
  entropy: { bloom: 0.12, saturation: 0.3, speed: 0.2, zoom: 2.0, intensity: 0.22, warmth: -0.2, contrast: 0.85, vignette: 1.3, hue: 0.68, warp: 0.22, spin: -0.12, aberration: 0.15, noise_scale: 0.7, ridge: 0, glitch: 0.05 },
  remnant: { bloom: 0.25, saturation: 0.6, speed: 0.3, zoom: 1.4, intensity: 0.4, warmth: -0.05, contrast: 1.1, vignette: 0.8, hue: 0.58, warp: 0.2, spin: -0.05, aberration: 0.08, noise_scale: 1.5, ridge: 0.05 },
  afterglow: { bloom: 0.4, saturation: 0.7, speed: 0.4, zoom: 1.2, intensity: 0.5, warmth: 0.05, contrast: 1.2, vignette: 0.6, hue: 0.55, warp: 0.25, spin: 0, aberration: 0.05, noise_scale: 1.8, ridge: 0.1 },
  silence: { bloom: 0.05, saturation: 0.15, speed: 0.08, zoom: 2.5, intensity: 0.1, warmth: -0.3, contrast: 0.7, vignette: 1.8, hue: 0.72, warp: 0.08, spin: -0.18, aberration: 0.05, noise_scale: 0.3, ridge: 0 },
  return: { bloom: 0.3, saturation: 0.55, speed: 0.35, zoom: 1.3, intensity: 0.45, warmth: 0, contrast: 1.15, vignette: 0.7, hue: 0.52, warp: 0.12, spin: -0.02, aberration: 0.06, noise_scale: 1.6, ridge: 0.08 },
  
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
      // Enhanced fireworks with different types and colors
      oav.gpuParticles.enhancedFirework({
        x: -0.5, y: 0.2,
        intensity: 0.8,
        color: "gold",
        type: "chrysanthemum"
      });
      setTimeout(() => oav.gpuParticles.enhancedFirework({
        x: 0.3, y: -0.1,
        intensity: 1.0,
        color: "red",
        type: "willow"
      }), 400);
      setTimeout(() => oav.gpuParticles.enhancedFirework({
        x: 0.0, y: 0.4,
        intensity: 0.6,
        color: "blue",
        type: "palm"
      }), 800);
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
      // Continue sparkling every 2 seconds
      const interval = setInterval(createSparkles, 2000);
      // Clear interval after 30 seconds
      setTimeout(() => clearInterval(interval), 30000);
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
