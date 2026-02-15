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
        p.addName(words, w, h);
        break;
      case "transform":
        p.addTransform(words, w, h);
        break;
      case "echo":
        p.addEcho(words, w, h);
        break;
      default:
        p.addVoice(words, w, h);
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
}
