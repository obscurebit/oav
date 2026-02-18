import { Clock, ParameterStore, Timeline, Input, InputReactor } from "./engine";
import { DebugOverlay } from "./debug-overlay";
import type { DebugFrame } from "./debug-overlay";
import {
  Renderer,
  SceneRegistry,
  IntroScene,
  BuildScene,
  ClimaxScene,
  OutroScene,
} from "./renderer";
import { GPUParticleSystem } from "./renderer/particles/gpu-particles";
import { GPUSpringSystem } from "./renderer/particles/gpu-springs";
import { Audio } from "./audio/audio";
import { TextParticleSystem, TextOverlay, WordInput } from "./overlay";
import { Director, AmbientVoice, ToolBridge, Poet, PRESETS } from "./llm";
import type { DirectorContext, ToolCall, PoetContext, PoetDirective, PoetStyle } from "./llm";
import { AudioDebugOverlay } from "./audio-debug-overlay";
import { ManualMode } from "./manual";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2");

if (!gl) {
  document.body.innerHTML =
    '<p style="color:#fff;font-family:monospace;padding:2rem">WebGL 2 not supported.</p>';
  throw new Error("WebGL 2 not available");
}

// --- Scene registry ---
const registry = new SceneRegistry();
registry.register(new IntroScene());
registry.register(new BuildScene());
registry.register(new ClimaxScene());
registry.register(new OutroScene());

// --- Engine core ---
const clock = new Clock(120);
const params = new ParameterStore();
const timeline = new Timeline();
const renderer = new Renderer(gl, registry);
const input = new Input(canvas);
const audio = new Audio();

// Connect audio to renderer for reactive effects
renderer.audio = audio;

// --- GPU particle & spring systems ---
const gpuParticles = new GPUParticleSystem(gl);
const gpuSprings = new GPUSpringSystem(gl);
renderer.gpuParticles = gpuParticles;

// No default mesh - create on demand via presets/LLM

// --- Text overlay & word particles ---
const particles = new TextParticleSystem();
const overlay = new TextOverlay(gl, canvas.width, canvas.height);

// --- Tool bridge (connects LLM tool calls to the engine) ---
const toolBridge = new ToolBridge({
  params,
  timeline,
  particles,
  canvasWidth: () => canvas.width,
  canvasHeight: () => canvas.height,
  clock,
});

// --- Manual Mode ---
const manualMode = new ManualMode({
  params,
  timeline,
  toolBridge,
  audio,
  gpuParticles,
  gpuSprings,
  canvasWidth: () => canvas.width,
  canvasHeight: () => canvas.height,
});

// Auto-enable manual mode if VITE_MODE=manual
if (import.meta.env.MODE === 'manual') {
  console.log("[MANUAL] Starting in manual mode (VITE_MODE=manual)");
  manualMode.enable();
}

// --- LLM Director (or ambient fallback) ---
const apiKey = import.meta.env.VITE_LLM_API_KEY as string | undefined;
const baseUrl = import.meta.env.VITE_LLM_BASE_URL as string | undefined;
const model = import.meta.env.VITE_LLM_MODEL as string | undefined;
let lastUserInteraction = 0;

function buildDirectorContext(userWords: string | null): DirectorContext {
  const transition = timeline.getTransitionState(clock.elapsed);
  return {
    sceneId: transition?.current.sceneId ?? "none",
    progress: transition?.current.progress ?? 0,
    elapsed: clock.elapsed,
    params: params.snapshot(),
    userWords,
    silenceDuration: clock.elapsed - lastUserInteraction,
    isTransitioning: transition?.previous !== null && (transition?.blend ?? 1) < 1,
    previousSceneId: transition?.previous?.sceneId ?? null,
    transitionBlend: transition?.blend ?? 1,
  };
}

// Set up LLM director or ambient fallback
// In dev, use the Vite proxy (/api/llm) to avoid CORS.
// Only override if VITE_LLM_BASE_URL is explicitly set to a non-NVIDIA URL (e.g. local model).
const useProxy = !baseUrl || baseUrl.includes("nvidia.com");
const poetModel = import.meta.env.VITE_POET_MODEL as string | undefined;

// Optional separate Poet API configuration
const poetApiKey = import.meta.env.VITE_POET_API_KEY as string | undefined;
const poetBaseUrl = import.meta.env.VITE_POET_BASE_URL as string | undefined;
const usePoetProxy = !poetBaseUrl || poetBaseUrl.includes("nvidia.com");

// Dual-LLM mode: Director (nemotron, tool-calling) + Poet (llama-4-scout, words only)
const director = apiKey
  ? new Director({
      apiKey,
      dualMode: true,
      ...(useProxy ? {} : { apiUrl: `${baseUrl}/chat/completions` }),
      ...(model ? { model } : {}),
    })
  : null;

const poet = (apiKey || poetApiKey)
  ? new Poet({
      apiKey: poetApiKey || apiKey!,
      ...(usePoetProxy ? {} : { apiUrl: `${poetBaseUrl || baseUrl}/chat/completions` }),
      ...(poetModel ? { model: poetModel } : {}),
    })
  : null;

const ambientVoice = new AmbientVoice(5, 12);

// --- Debug overlays ---
const debug = new DebugOverlay(); // F2 - main debug overlay
const audioDebug = new AudioDebugOverlay(); // F3 - audio debug overlay

/**
 * Calculate magnitude of Director's tool calls (0-1).
 * Higher magnitude = more dramatic change = more dramatic Poet response.
 */
function calculateMagnitude(toolCalls: ToolCall[]): number {
  let mag = 0;
  for (const tc of toolCalls) {
    const name = tc.function.name;
    if (name === "transition_to") {
      mag += 1.0;
    } else if (name === "apply_preset") {
      mag += 0.7;
    } else if (name === "shift_mood") {
      mag += 0.5;
    } else if (name === "drift_param" || name === "set_param") {
      // Each param change contributes a small amount
      try {
        const args = JSON.parse(tc.function.arguments);
        const target = Number(args.target ?? args.value ?? 0);
        const current = params.get(String(args.name ?? ""));
        const diff = Math.abs(target - current);
        mag += Math.min(diff * 0.5, 0.15); // cap per-param contribution
      } catch { mag += 0.05; }
    } else if (name === "pulse_param") {
      mag += 0.1;
    } else if (name === "spawn_particles") {
      mag += 0.3;
    }
  }
  return Math.min(mag, 1.0);
}

/** Map magnitude to a Poet style. */
function magnitudeToStyle(magnitude: number, hasUserWords: boolean): PoetStyle {
  // User input always gets at least an echo
  if (hasUserWords && magnitude >= 0.3) return "echo";
  if (hasUserWords) return "voice";
  // Ambient cycles
  if (magnitude >= 0.8) return "title";
  if (magnitude >= 0.6) return "echo";
  if (magnitude >= 0.3) return "voice";
  if (magnitude >= 0.1) return "whisper";
  return "silence";
}

/** Build context for the Poet based on current state + directive. */
function buildPoetContext(userWords: string | null, directive: PoetDirective): PoetContext {
  const transition = timeline.getTransitionState(clock.elapsed);
  const { mood } = detectMood();
  return {
    sceneId: transition?.current.sceneId ?? "none",
    moodName: mood.name,
    moodEnergy: Math.min(1, (params.get("speed") / 3 + params.get("intensity") + params.get("strobe") * 2 + params.get("glitch") * 2) / 3),
    moodWarmth: params.get("warmth"),
    userWords,
    silenceDuration: clock.elapsed - lastUserInteraction,
    elapsed: clock.elapsed,
    directive,
  };
}

// Wire up the Poet to display words as particles
if (poet) {
  poet.onWords((words, kind, rawResponse) => {
    if (kind === "whisper") {
      particles.addWhisper(words, canvas.width, canvas.height);
    } else {
      particles.addVoiceRevealed(words, canvas.width, canvas.height, kind);
    }
    debug.logPoet(kind, words);
    
    // Log raw Poet HTTP response for debugging
    if (rawResponse) {
      debug.logLLMPoet("raw HTTP response", JSON.stringify(rawResponse, null, 2));
    }
  });
}

if (director) {
  director.onResult((result) => {
    awaitingLLM = false;

    // Log raw content to debug overlay (never displayed to user in dual mode)
    if (result.content) {
      debug.logLLM("raw response", result.content);
    }
    
    // Log raw HTTP response JSON for debugging
    if (result.rawResponse) {
      debug.logLLMDirector("raw HTTP response", JSON.stringify(result.rawResponse, null, 2));
    }

    // Classify response and fire visual feedback
    const responseType = classifyResponse(result.toolCalls);
    if (responseType === "affirm") {
      flashAffirm();
      debug.log("SIM", "response: AFFIRM");
    } else if (responseType === "deflect") {
      flashDeflect();
      debug.log("SIM", "response: DEFLECT");
    }

    const savedPhrase = lastUserPhrase;
    lastUserPhrase = null;

    // Execute tool calls against the engine
    const actionDescriptions: string[] = [];
    if (result.toolCalls.length > 0) {
      const outcomes = toolBridge.execute(result.toolCalls);
      for (let i = 0; i < result.toolCalls.length; i++) {
        const tc = result.toolCalls[i];
        const name = tc.function.name;
        const args = tc.function.arguments;
        if (name === "speak" || name === "whisper") {
          // In dual mode these shouldn't happen, but handle gracefully
          debug.log("SPEAK", `${name}(${args})`);
        } else if (name === "apply_preset") {
          debug.logPreset(args, outcomes[i]);
          actionDescriptions.push(`applied ${args}`);
        } else {
          debug.logTool(name, args, outcomes[i]);
          actionDescriptions.push(`${name}(${args})`);
        }
      }
    }

    // Calculate magnitude of what the Director just did
    const magnitude = calculateMagnitude(result.toolCalls);
    const style = magnitudeToStyle(magnitude, !!savedPhrase);
    const actionSummary = actionDescriptions.length > 0
      ? actionDescriptions.slice(0, 5).join(", ")
      : null;

    const directive: PoetDirective = { magnitude, style, actionSummary };
    debug.log("SIM", `magnitude: ${magnitude.toFixed(2)} → style: ${style}`);

    // Only trigger the Poet if the magnitude warrants words
    if (poet && poet.enabled && style !== "silence") {
      poet.speak(buildPoetContext(savedPhrase, directive));
    }
  });
} else {
  // Ambient fallback — poetic fragments emerge letter by letter, like the world dreaming
  ambientVoice.onWords((words) => {
    particles.addVoiceRevealed(words, canvas.width, canvas.height, "voice");
    debug.log("SPEAK", `ambient: "${words}"`);
  });
}

// --- System calculation counters for SIM logging
let lastDriftCount = 0;
let lastPulseCount = 0;

let lastUserPhrase: string | null = null;

function classifyResponse(toolCalls: ToolCall[]): "affirm" | "deflect" | "ambient" {
  if (!lastUserPhrase) return "ambient"; // no user input → ambient, no special flash

  // Check if any tool call indicates engagement with user input
  let hasEcho = false;
  let hasAction = false;
  let hasVoiceOnly = false;

  for (const tc of toolCalls) {
    const name = tc.function.name;
    if (name === "speak") {
      try {
        const args = JSON.parse(tc.function.arguments);
        if (args.kind === "echo" || args.kind === "transform" || args.kind === "name") {
          hasEcho = true;
        } else {
          hasVoiceOnly = true;
        }
      } catch { hasVoiceOnly = true; }
    } else if (["shift_mood", "transition_to", "set_param", "drift_param", "pulse_param"].includes(name)) {
      hasAction = true;
    }
  }

  if (hasEcho || hasAction) return "affirm";
  if (hasVoiceOnly || toolCalls.length === 0) return "deflect";
  return "deflect";
}

function flashAffirm(): void {
  // Warm pulse — the world heard you and responded
  params.set("pulse", 1.0);
  params.drift("intensity", Math.min(params.get("intensity") + 0.25, 1.0), 0.6);
  // Brief warm hue nudge toward current + golden tint
  const currentHue = params.get("hue");
  params.drift("hue", currentHue + 0.03, 1.5);
}

function flashDeflect(): void {
  // Cool subtle ripple — the world noticed but chose not to engage
  params.set("pulse", 0.4);
  params.drift("intensity", Math.max(params.get("intensity") - 0.1, 0.15), 1.5);
  params.drift("speed", Math.max(params.get("speed") - 0.2, 0.3), 2.0);
}

// --- Auto-themed reactions: keystroke/click behavior adapts to current visual state ---

interface MoodReaction {
  name: string;
  keystroke: { pop: number; pulse: number; params?: Record<string, { target: number; dur: number }> };
  click:     { pop: number; pulse: number; params?: Record<string, { target: number; dur: number }> };
  /** Param conditions: each [param, minValue] pair must be met for this mood to score. */
  signature: [string, number][];
}

const MOOD_REACTIONS: MoodReaction[] = [
  // Explosive / fireworks — high bloom + strobe or high speed + intensity
  { name: "explosive", signature: [["bloom", 0.8], ["strobe", 0.2]],
    keystroke: { pop: 0.6, pulse: 0.4, params: { bloom: { target: 1.5, dur: 0.3 }, strobe: { target: 0.3, dur: 0.15 } }},
    click:     { pop: 1.0, pulse: 1.0, params: { bloom: { target: 2.0, dur: 0.5 }, strobe: { target: 0.6, dur: 0.3 }, warp: { target: 1.5, dur: 0.6 } }},
  },
  // Chaotic / glitchy — high glitch or aberration
  { name: "chaotic", signature: [["glitch", 0.3], ["aberration", 0.3]],
    keystroke: { pop: 0.5, pulse: 0.3, params: { glitch: { target: 0.5, dur: 0.2 }, aberration: { target: 0.5, dur: 0.2 } }},
    click:     { pop: 0.8, pulse: 0.7, params: { glitch: { target: 0.8, dur: 0.4 }, invert: { target: 0.5, dur: 0.3 }, aberration: { target: 0.8, dur: 0.4 } }},
  },
  // Stormy / intense — high speed + warp
  { name: "stormy", signature: [["speed", 2.0], ["warp", 1.0]],
    keystroke: { pop: 0.4, pulse: 0.3, params: { aberration: { target: 0.3, dur: 0.2 }, warp: { target: 1.5, dur: 0.3 } }},
    click:     { pop: 0.8, pulse: 0.8, params: { strobe: { target: 0.4, dur: 0.3 }, aberration: { target: 0.5, dur: 0.4 }, speed: { target: 3.0, dur: 0.5 } }},
  },
  // Psychedelic — high spin or symmetry + saturation
  { name: "psychedelic", signature: [["spin", 0.3], ["saturation", 1.3]],
    keystroke: { pop: 0.3, pulse: 0.2, params: { spin: { target: 0.5, dur: 0.3 }, saturation: { target: 1.8, dur: 0.3 } }},
    click:     { pop: 0.6, pulse: 0.6, params: { symmetry: { target: 6, dur: 0.5 }, spin: { target: 1.0, dur: 0.5 }, warp: { target: 1.5, dur: 0.5 } }},
  },
  // Crystalline — high cells or symmetry + contrast
  { name: "crystalline", signature: [["cells", 0.4], ["contrast", 1.5]],
    keystroke: { pop: 0.4, pulse: 0.2, params: { cells: { target: 0.6, dur: 0.3 }, bloom: { target: 0.5, dur: 0.3 } }},
    click:     { pop: 0.7, pulse: 0.5, params: { cells: { target: 0.8, dur: 0.5 }, symmetry: { target: 8, dur: 0.5 }, contrast: { target: 2.0, dur: 0.4 } }},
  },
  // Watery — high wobble + bloom
  { name: "watery", signature: [["wobble", 0.3], ["bloom", 0.4]],
    keystroke: { pop: 0.2, pulse: 0.15, params: { wobble: { target: 0.5, dur: 0.4 } }},
    click:     { pop: 0.4, pulse: 0.3, params: { wobble: { target: 0.8, dur: 0.6 }, bloom: { target: 0.8, dur: 0.5 } }},
  },
  // Volcanic — high ridge + warmth + warp
  { name: "volcanic", signature: [["ridge", 0.4], ["warmth", 0.4]],
    keystroke: { pop: 0.5, pulse: 0.3, params: { ridge: { target: 0.6, dur: 0.3 }, warmth: { target: 0.8, dur: 0.3 } }},
    click:     { pop: 0.9, pulse: 0.8, params: { warp: { target: 2.0, dur: 0.5 }, ridge: { target: 0.8, dur: 0.5 }, bloom: { target: 1.0, dur: 0.4 } }},
  },
  // Bright / energetic — high intensity + speed (generic catch-all for active states)
  { name: "energetic", signature: [["intensity", 0.7], ["speed", 1.5]],
    keystroke: { pop: 0.4, pulse: 0.25, params: { bloom: { target: 0.8, dur: 0.3 } }},
    click:     { pop: 0.7, pulse: 0.6, params: { bloom: { target: 1.2, dur: 0.5 }, saturation: { target: 1.5, dur: 0.4 } }},
  },
];

// Default subtle reaction when no mood matches strongly
const DEFAULT_REACTION: MoodReaction = {
  name: "neutral",
  signature: [],
  keystroke: { pop: 0.15, pulse: 0.08 },
  click:     { pop: 0.3, pulse: 0.3 },
};

/**
 * Score each mood against current params. Returns the best-matching mood
 * and a confidence 0-1 (how many signature params are met).
 */
function detectMood(): { mood: MoodReaction; confidence: number } {
  let best = DEFAULT_REACTION;
  let bestScore = 0;

  for (const mood of MOOD_REACTIONS) {
    if (mood.signature.length === 0) continue;
    let matched = 0;
    for (const [param, threshold] of mood.signature) {
      if (params.get(param) >= threshold) matched++;
    }
    const score = matched / mood.signature.length;
    if (score > bestScore) {
      bestScore = score;
      best = mood;
    }
  }

  return { mood: best, confidence: bestScore };
}

/** Apply a mood reaction (keystroke or click), scaled by confidence. */
function applyMoodReaction(reaction: MoodReaction["keystroke"] | MoodReaction["click"], confidence: number): void {
  const scale = 0.3 + confidence * 0.7; // Even weak matches get 30% effect
  // Derive energy from current params so pop sound matches the vibe
  const energy = Math.min(1, (
    params.get("speed") / 3 +
    params.get("intensity") +
    params.get("strobe") * 2 +
    params.get("glitch") * 2
  ) / 3);
  
  // Trigger drum sounds for clicks, impact for keystrokes
  if ('params' in reaction && reaction.params) {
    // This is a click reaction - trigger drums based on mood
    const { mood, confidence: moodConf } = detectMood();
    const drumIntensity = reaction.pop * scale;
    
    switch (mood.name) {
      case 'explosive':
        audio.playPop(0.8, 0.9);
        break;
      case 'chaotic':
        audio.playPop(0.6, 0.7);
        break;
      case 'stormy':
        audio.playPop(0.7, 0.8);
        break;
      case 'psychedelic':
        audio.playPop(0.5, 0.6);
        break;
      case 'crystalline':
        audio.playPop(0.4, 0.3);
        break;
      case 'watery':
        audio.playPop(0.3, 0.2);
        break;
      case 'volcanic':
        audio.playPop(0.8, 0.9);
        break;
      case 'energetic':
        audio.playPop(0.6, 0.7);
        break;
      default:
        audio.playPop(0.4, 0.4);
    }
  } else {
    // This is a keystroke reaction - use impact
    const intensity = reaction.pop * scale;
    const energy = Math.min(reaction.pop * 2, 1.0); // Higher energy for stronger reactions
    audio.playPop(intensity, energy);
  }
  
  params.set("pulse", Math.min(params.get("pulse") + reaction.pulse * scale, 1.0));
  if (reaction.params) {
    for (const [name, { target, dur }] of Object.entries(reaction.params)) {
      // Blend toward target based on confidence
      const current = params.get(name);
      const blended = current + (target - current) * scale;
      params.drift(name, blended, dur);
    }
  }
}

// --- Word input (type into the void) ---
let awaitingLLM = false;
const reactor = new InputReactor(params);

const wordInput = new WordInput(particles, {
  pauseMs: 800,

  onKeystroke: (char, bufLen) => {
    // InputReactor handles speed-scaled pulse, intensity, speed drifts
    reactor.onKeystroke(char, bufLen);
    lastUserInteraction = clock.elapsed;

    // Auto-themed keystroke reaction — adapts to current visual state
    const { mood, confidence } = detectMood();
    applyMoodReaction(mood.keystroke, confidence);
  },

  onPhrase: (phrase) => {
    lastUserInteraction = clock.elapsed;
    lastUserPhrase = phrase; // track so we can classify the LLM response

    // Immediate local reactions — color words, mood words, typing speed
    const reactions = reactor.onPhrase(phrase);
    if (reactions.length > 0) {
      debug.log("REACT", reactions.join(", "));
      
      // Check if any reaction is a preset name and apply it directly
      for (const reaction of reactions) {
        const moodMatch = reaction.match(/mood: (\w+)/);
        if (moodMatch) {
          const moodName = moodMatch[1];
          // Check if this mood matches a preset name
          const presetNames = [
            "noir", "vaporwave", "glitch_art", "underwater", "fire", "ice",
            "psychedelic", "minimal", "cosmic", "industrial", "dream", "nightmare",
            "crystal", "organic", "digital", "zen", "storm", "aurora", "lava",
            "fireworks", "jello", "cloth", "sparkle_field", "electric_storm", "lightning"
          ];
          
          if (presetNames.includes(moodName)) {
            // Apply the preset directly, bypassing LLM
            debug.logDirector("direct preset application", `applying preset "${moodName}" from mood detection`);
            
            // Use the tool bridge to apply the preset
            const toolCall = {
                id: "direct-preset-" + Date.now(),
                type: "function" as const,
                function: { name: "apply_preset", arguments: JSON.stringify({ preset: moodName, intensity_scale: 1.0 }) }
            };
            const results = toolBridge.execute([toolCall]);
            debug.logDirector("direct preset result", results[0]);
            
            // Don't send to LLM if we applied a preset directly
            return;
          }
        }
      }
    }
    debug.log("INPUT", `phrase: "${phrase}"`);

    if (director && director.enabled) {
      awaitingLLM = true;
      // Show a thinking whisper while we wait
      const thinkingHints = [
        "listening...", "...", "hearing you", "shifting",
        "the words land", "absorbing", "considering",
      ];
      const hint = thinkingHints[Math.floor(Math.random() * thinkingHints.length)];
      setTimeout(() => {
        if (awaitingLLM) {
          particles.addWhisper(hint, canvas.width, canvas.height);
        }
      }, 600 + Math.random() * 400);

      const ctx = buildDirectorContext(phrase);
      debug.log("SIM", "sending to Director: pending=false, failures=0");
      director.respond(ctx);
    } else {
      // No LLM or Director disabled — ambient voice responds to user
      debug.log("SIM", "Director unavailable - ambient fallback");
      ambientVoice.respondToUser(phrase);
    }
  },
});

// Define initial parameters
// --- Core (existing) ---
params.define("intensity", 0, 1, 0.5);
params.define("speed", 0.1, 4, 1);
params.define("hue", 0, 1, 0);
params.define("amplitude", 0, 1, 0);
params.define("bass", 0, 1, 0);
params.define("brightness", 0, 1, 0);
params.define("pulse", 0, 1, 0);

// --- Color & Tone ---
params.define("saturation", 0, 2, 1);       // 0=grayscale, 1=normal, 2=oversaturated
params.define("contrast", 0, 3, 1);          // 0=flat, 1=normal, 3=extreme
params.define("warmth", -1, 1, 0);           // -1=cool blue shift, 0=neutral, 1=warm orange shift
params.define("gamma", 0.2, 3, 1);           // <1=brighter midtones, >1=darker midtones
params.define("invert", 0, 1, 0);            // 0=normal, 1=fully inverted colors

// --- Geometry & Space ---
params.define("zoom", 0.2, 5, 1);            // camera zoom (affects pattern scale)
params.define("rotation", -3.14, 3.14, 0);   // global rotation in radians
params.define("symmetry", 0, 12, 0);         // 0=none, 2-12=kaleidoscope fold count
params.define("mirror_x", 0, 1, 0);          // 0=off, 1=mirror horizontally
params.define("mirror_y", 0, 1, 0);          // 0=off, 1=mirror vertically

// --- Pattern & Texture ---
params.define("warp", 0, 3, 0.5);            // domain warp strength
params.define("noise_scale", 0.5, 10, 3);    // noise frequency / detail scale
params.define("octaves", 1, 8, 5);           // fractal noise octave count
params.define("lacunarity", 1, 4, 2);        // frequency multiplier per octave
params.define("grain", 0, 1, 0);             // film grain / noise overlay
params.define("pixelate", 0, 1, 0);          // 0=smooth, 1=heavily pixelated
params.define("edge", 0, 1, 0);              // 0=soft, 1=hard edges (posterize)
params.define("ridge", 0, 1, 0);             // 0=normal noise, 1=ridged/turbulent noise
params.define("cells", 0, 1, 0);             // 0=off, 1=voronoi/cellular pattern overlay

// --- Motion & Animation ---
params.define("drift_x", -2, 2, 0);          // horizontal drift/pan
params.define("drift_y", -2, 2, 0);          // vertical drift/pan
params.define("spin", -2, 2, 0);             // continuous rotation speed (rad/s)
params.define("wobble", 0, 1, 0);            // sinusoidal coordinate wobble
params.define("strobe", 0, 1, 0);            // 0=off, 1=full strobe flash

// --- Post-processing ---
params.define("bloom", 0, 2, 0);             // glow/bloom intensity
params.define("vignette", 0, 2, 0.5);        // edge darkening
params.define("aberration", 0, 1, 0);        // chromatic aberration
params.define("glitch", 0, 1, 0);            // digital glitch effect
params.define("feedback", 0, 1, 0);          // temporal feedback / trails

// --- Director-Controlled Timeline ---
// Scenes only change when Director explicitly transitions
// This gives the LLM full creative control over narrative flow
const DIRECTOR_SCENES = ["intro", "build", "climax", "outro"];
let timelineEnd = 0;
let lastScheduledScene = "intro";

function extendTimeline(count: number = 4): void {
  // Only seed initial timeline, then Director takes control
  if (timelineEnd === 0) {
    // Start with intro only
    const baseDuration = 30; // Fixed intro duration
    const startTime = 0;
    const endTime = startTime + baseDuration;

    timeline.add({ startTime, endTime, sceneId: "intro", transitionDuration: 0 });
    timelineEnd = endTime;
    lastScheduledScene = "intro";
  }
  // No more auto-extensions - Director controls all subsequent scenes
}

// Seed only the initial intro scene
extendTimeline(1);

// --- Resize handler ---
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  gl!.viewport(0, 0, canvas.width, canvas.height);
  overlay.resize(canvas.width, canvas.height);
  wordInput.resize(canvas.width, canvas.height);
}
window.addEventListener("resize", resize);
resize();

// --- Interaction hint (fades in after 15s of no interaction) ---
let hintShown = false;
let anyInteraction = false;

function markInteraction() {
  anyInteraction = true;
  lastUserInteraction = clock.elapsed;
}

window.addEventListener("keydown", markInteraction, { once: true });
window.addEventListener("click", markInteraction, { once: true });
window.addEventListener("mousemove", markInteraction, { once: true });

// --- Manual mode toggle (F1 key) ---
window.addEventListener("keydown", (e) => {
  if (e.key === "F1") {
    e.preventDefault();
    manualMode.toggle();
  }
});

// --- Debug interface for Playwright tests ---
(window as unknown as Record<string, unknown>).__OAV__ = {
  get params() { return params.snapshot(); },
  get elapsed() { return clock.elapsed; },
  get particleCount() { return particles.count; },
  get particles() { return particles.particles.map(p => ({ text: p.text, kind: p.kind, opacity: p.opacity, x: p.x, y: p.y })); },
  get audioStarted() { return audioStarted; },
  get audio() { return audio; }, // Add audio object for debug overlay
  get director() { return director; }, // Expose director for manual mode
  get manualMode() { return manualMode; }, // Expose manual mode
  setParam: (name: string, value: number) => params.set(name, value),
  driftParam: (name: string, target: number, duration: number) => params.drift(name, target, duration),
  applyPreset: (preset: string) => toolBridge.execute([{
    id: "test", type: "function",
    function: { name: "apply_preset", arguments: JSON.stringify({ preset }) },
  }]),
  /** Immediately set all params for a preset (no drift) — for testing. */
  setPresetImmediate: (preset: string) => {
    const resetVals = PRESETS["reset"];
    const presetVals = PRESETS[preset];
    if (!presetVals) return;
    // First reset all params to baseline
    for (const [name, value] of Object.entries(resetVals)) {
      if (params.has(name)) params.set(name, value as number);
    }
    // Then apply preset values immediately
    for (const [name, value] of Object.entries(presetVals)) {
      if (params.has(name)) params.set(name, value as number);
    }
  },
  clearParticles: () => particles.clear(),
  // GPU systems
  gpuParticles,
  gpuSprings,
  firework: (x: number, y: number, intensity?: number) => gpuParticles.firework(x, y, intensity),
  sparkle: (x: number, y: number, count?: number) => gpuParticles.sparkle(x, y, count),
  pokeSprings: (x: number, y: number, radius?: number, force?: number) => gpuSprings.poke(x, y, radius ?? 0.3, force ?? 0.5),
  // Debug overlays
  debug,
  audioDebug,
};

// --- Scene transition tracking ---
let lastActiveSceneId = "";
let directorDisabledLogged = false;

// --- Main loop ---
let lastTime = 0;

function frame(now: number) {
  const nowSec = now / 1000;
  const dt = lastTime === 0 ? 0.016 : nowSec - lastTime;
  lastTime = nowSec;

  clock.tick(dt);

  // Clean up old timeline entries (Director controls when to add new scenes)
  if (timelineEnd > 0 && clock.elapsed > timelineEnd + 300) {
    timeline.prune(clock.elapsed - 60); // Keep last 60 seconds for context
  }

  input.tick(dt);
  input.applyTo(params, dt);

  // Tap gesture → mood-appropriate pulse reaction (replaces old click handler)
  if (input.tapped) {
    const { mood, confidence } = detectMood();
    applyMoodReaction(mood.click, confidence);
    lastUserInteraction = clock.elapsed;
  }

  audio.update();
  params.set("amplitude", audio.amplitude);
  params.set("bass", audio.bass);
  params.set("brightness", audio.brightness);
  
    // Log audio analysis results (only significant events)
  if (audio.beatHit) {
    debug.log("AUDIO-STREAM", `BEAT hit (amp:${audio.amplitude.toFixed(3)}, bass:${audio.bass.toFixed(3)})`);
  }

  // Derive audio mood from visual params (every frame, but setMood smooths internally)
  const moodEnergy = Math.min(1, (
    params.get("speed") / 3 +
    params.get("intensity") +
    params.get("strobe") * 2 +
    params.get("glitch") * 2
  ) / 3);
  const moodWarmth = params.get("warmth");
  const moodTexture = Math.min(1, (
    params.get("grain") +
    params.get("glitch") +
    params.get("aberration") +
    params.get("warp") / 3
  ) / 2);
  // EnhancedAudio doesn't have setMood - mood is handled through visual params

  // Scene-reactive audio mix + detect scene transitions for titles
  const currentTransition = timeline.getTransitionState(clock.elapsed);
  if (currentTransition) {
    const sceneId = currentTransition.current.sceneId;
    // EnhancedAudio doesn't have setSceneMix - scene mixing handled through parameters

    // Fire themed title when the active scene changes (works with repeating scenes)
    if (sceneId !== lastActiveSceneId) {
      lastActiveSceneId = sceneId;
      debug.log("SCENE", `→ ${sceneId}`);
      particles.showSceneTitle(sceneId, canvas.width, canvas.height);
    }
  }

  // Decay click pulse
  const currentPulse = params.get("pulse");
  if (currentPulse > 0.001) {
    params.set("pulse", currentPulse * Math.exp(-dt * 3.0));
  } else if (currentPulse > 0) {
    params.set("pulse", 0);
  }

  // Advance param drifts and pulses
  const activeDrifts = params.activeDrifts;
  const activePulses = params.activePulses;
  params.tick(dt);
  
  // Log parameter interpolation activity only when count changes significantly
  if (activeDrifts !== lastDriftCount || activePulses !== lastPulseCount) {
    debug.log("SIM", `param interpolation: ${activeDrifts} drifts, ${activePulses} pulses`);
    lastDriftCount = activeDrifts;
    lastPulseCount = activePulses;
  }

  // Update LLM director or ambient voice (director may self-disable on failures)
  if (director && director.enabled) {
    // Only build context when the director actually needs it (avoids snapshot() allocation every frame)
    if (director.needsUpdate(clock.elapsed)) {
      director.update(buildDirectorContext(null));
    }
  } else {
    // Director disabled or absent — ambient voice provides poetry
    ambientVoice.update(clock.elapsed);
    // Log once when Director disables mid-session
    if (director && !director.enabled && !directorDisabledLogged) {
      directorDisabledLogged = true;
      debug.logError("Director disabled", `${director.failures} failures — ambient fallback`);
    }
  }

  // Show interaction hint if no activity after 15s
  if (!hintShown && !anyInteraction && clock.elapsed > 15) {
    hintShown = true;
    particles.addWhisper("touch the void · type into the dark", canvas.width, canvas.height);
  }

  // Update GPU particle and spring systems
  gpuParticles.update(dt, clock.elapsed);
  gpuSprings.update(dt, clock.elapsed);

  // Update manual mode sliders if active
  if (manualMode.isEnabled) {
    manualMode.updateSliders();
  }

  // Tap gesture: firework burst + optional spring poke
  if (input.tapped) {
    // Firework burst at tap location
    gpuParticles.firework(input.tapX, input.tapY, 0.5);
    
    // Only poke springs if there's an active mesh
    if (gpuSprings.nodeCount > 0) {
      gpuSprings.poke(input.tapX, input.tapY, 0.3, 0.5);
    }
  }

  // Feed mouse drag into spring system (only if active mesh)
  if (gpuSprings.nodeCount > 0) {
    if (input.pressed) {
      gpuSprings.mouseX = input.dragX;
      gpuSprings.mouseY = input.dragY;
      gpuSprings.mouseForce = input.dragEnergy * 5;
    } else {
      gpuSprings.mouseForce = 0;
    }
    // Audio-reactive jiggle on the spring mesh
    gpuSprings.jiggle = audio.bass * 0.5;
    
    // Mouse interaction affects audio parameters
    if (audioStarted) {
      const mouseX = input.mouseX;
      const mouseY = input.mouseY;
      const mouseEnergy = input.dragEnergy;
      
      // Mouse position affects filter and LFO
      const filterFreq = 200 + mouseX * 3000; // 200Hz to 3200Hz based on X
      const lfoRate = 0.1 + mouseY * 2.0; // 0.1Hz to 2.1Hz based on Y
      const reverbWet = Math.min(mouseEnergy * 0.5, 0.8); // More movement = more reverb
      
      // Trigger drums based on drag energy
      if (mouseEnergy > 0.3) {
        const drumIntensity = Math.min(mouseEnergy, 1.0);
        
        // Different drums based on drag position
        if (mouseX < 0.3) {
          // Left side - kicks
        } else if (mouseX > 0.7) {
          // Right side - snares
        } else {
          // Center - hihats
        }
        
        // Add bass on strong drags
        if (mouseEnergy > 0.7) {
        }
      }
    }
  } else {
    gpuSprings.mouseForce = 0;
    gpuSprings.jiggle = 0;
  }

  // Update and render text particles (audio-reactive)
  particles.update(dt, audio.bass, audio.amplitude);
  
  // Auto-switch drone preset when visual preset changes (check once per frame)
  if (audioStarted) {
    const currentPreset = toolBridge.activeTheme;
    if (currentPreset && currentPreset !== lastAudioPreset) {
      audio.setDronePreset(currentPreset);
      lastAudioPreset = currentPreset;
    }
  }
  overlay.render(particles.particles);
  
  // Create trailing particles on mouse movement for dreamlike effect
  if (audioStarted && input.dragEnergy > 0.1 && gpuParticles) {
    const trailIntensity = Math.min(input.dragEnergy * 0.3, 1.0);
    const mouseX = input.mouseX;
    const mouseY = input.mouseY;
    
    // Create ethereal trail particles
    if (Math.random() < trailIntensity) {
      const trailColor = [
        0.6 + mouseX * 0.4, // R varies with horizontal position
        0.4 + mouseY * 0.3, // G varies with vertical position  
        0.8 + audio.bass * 0.2  // B pulses with bass
      ];
      
      gpuParticles.sparkle(
        mouseX + (Math.random() - 0.5) * 0.1,
        mouseY + (Math.random() - 0.5) * 0.1,
        1
      );
    }
  }

  const transition = timeline.getTransitionState(clock.elapsed);
  
  // Safety check: ensure we always have a valid scene (fallback to intro if needed)
  if (!transition || !transition.current) {
    console.warn("[MAIN] No active scene found, falling back to intro");
    timeline.add({
      startTime: 0,
      endTime: Number.MAX_SAFE_INTEGER,
      sceneId: "intro",
      transitionDuration: 0
    });
  }

  renderer.draw({
    time: clock.elapsed,
    beat: clock.beat,
    params,
    transition,
    overlayTexture: overlay.texture,
  });

  // Update debug overlay (only renders DOM when visible)
  if (debug.visible) {
    const dbgFrame: DebugFrame = {
      elapsed: clock.elapsed,
      dt,
      fps: dt > 0 ? 1 / dt : 0,
      scene: currentTransition?.current.sceneId ?? "?",
      sceneProgress: currentTransition?.current.progress ?? 0,
      activePreset: toolBridge.activeTheme,
      particleCount: particles.count,
      audioStarted,
      moodEnergy: moodEnergy,
      moodWarmth: moodWarmth,
      moodTexture: moodTexture,
      moodName: detectMood().mood.name,
      moodConfidence: detectMood().confidence,
      params: params.snapshot(),
      // GPU systems
      gpuParticleCount: (gpuParticles as any).count ?? 0,
      gpuSpringNodes: gpuSprings.nodeCount,
      gpuSprings: gpuSprings.springCount,
      // Director / Poet / Input status
      directorEnabled: director?.enabled ?? false,
      directorPending: awaitingLLM,
      directorFailures: (director as any)?._consecutiveFailures ?? 0,
      poetEnabled: poet?.enabled ?? false,
      inputEnergy: input.dragEnergy,
      inputHold: input.holdDuration,
      inputFlurry: input.clickFlurry,
      inputStillness: input.stillness,
      inputPressed: input.pressed,
    };
    debug.update(dbgFrame);

    // Audio debug frame (separate overlay)
    if (audioDebug.visible) {
      const audioDbgFrame = {
        // Audio analysis
        amplitude: audio.amplitude,
        brightness: audio.brightness,
        bass: audio.bass,
        mid: audio.mid,
        high: audio.high,
        beatHit: audio.beatHit,
        rhythmicIntensity: audio.rhythmicIntensity,
        spectralCentroid: audio.spectralCentroid,
        // Audio parameters (if enhanced audio is available)
        subLevel: (audio as any).getParams?.()?.subLevel ?? 0,
        harmonicLevel: (audio as any).getParams?.()?.harmonicLevel ?? 0,
        noiseLevel: (audio as any).getParams?.()?.noiseLevel ?? 0,
        padLevel: (audio as any).getParams?.()?.padLevel ?? 0,
        filterFreq: (audio as any).getParams?.()?.filterFreq ?? 800,
        filterRes: (audio as any).getParams?.()?.filterRes ?? 1.5,
        lfoRate: (audio as any).getParams?.()?.lfoRate ?? 0.5,
        lfoDepth: (audio as any).getParams?.()?.lfoDepth ?? 0.3,
        reverbWet: (audio as any).getParams?.()?.reverbWet ?? 0.3,
        delayTime: (audio as any).getParams?.()?.delayTime ?? 0.3,
        delayFeedback: (audio as any).getParams?.()?.delayFeedback ?? 0.4,
        distortion: (audio as any).getParams?.()?.distortion ?? 0.1,
        masterLevel: (audio as any).getParams?.()?.masterLevel ?? 0.7,
        tempo: (audio as any).getParams?.()?.tempo ?? 120,
        audioStarted,
      };
      audioDebug.update(audioDbgFrame);
    }
  }

  requestAnimationFrame(frame);
}

// First mousedown starts audio (AudioContext requires user gesture)
let audioStarted = false;
let lastAudioPreset = '';

canvas.addEventListener("mousedown", () => {
  if (!audioStarted) {
    audio.init();
    audio.playDrone();
    audioStarted = true;
    
    console.log('[Audio] Started ambient audio system');
  }
  lastUserInteraction = clock.elapsed;
});

// Start rendering immediately (audio starts on click)
requestAnimationFrame(frame);
