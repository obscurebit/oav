import { Clock, ParameterStore, Timeline, Input, InputReactor } from "./engine";
import {
  Renderer,
  SceneRegistry,
  IntroScene,
  BuildScene,
  ClimaxScene,
  OutroScene,
} from "./renderer";
import { Audio } from "./audio";
import { TextParticleSystem, TextOverlay, WordInput } from "./overlay";
import { Director, AmbientVoice, ToolBridge } from "./llm";
import type { DirectorContext, ToolCall } from "./llm";

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
});

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
const director = apiKey
  ? new Director({
      apiKey,
      ...(useProxy ? {} : { apiUrl: `${baseUrl}/chat/completions` }),
      ...(model ? { model } : {}),
    })
  : null;

const ambientVoice = new AmbientVoice(5, 12);

if (director) {
  director.onResult((result) => {
    awaitingLLM = false;

    // Classify response and fire visual feedback
    const responseType = classifyResponse(result.toolCalls);
    if (responseType === "affirm") {
      flashAffirm();
      console.log("[Director] ✓ affirmed user input");
    } else if (responseType === "deflect") {
      flashDeflect();
      console.log("[Director] ○ deflected / ambient response");
    }
    // Clear the phrase tracker after processing
    lastUserPhrase = null;

    // Execute tool calls against the engine
    if (result.toolCalls.length > 0) {
      const outcomes = toolBridge.execute(result.toolCalls);
      console.log("[Director] tools:", outcomes);
    }

    // Surface thinking fragments as whisper particles
    for (const fragment of result.thinkingFragments) {
      particles.addWhisper(fragment, canvas.width, canvas.height);
    }
  });
} else {
  // Ambient fallback — poetic fragments emerge letter by letter, like the world dreaming
  ambientVoice.onWords((words) => {
    particles.addVoiceRevealed(words, canvas.width, canvas.height, "voice");
  });
}

// --- LLM response visual feedback ---
// Classify whether the LLM "engaged" with user input or deflected/went ambient,
// then fire a distinct visual reaction so the user feels the world responding.
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
  keystroke: { pop: number; pulse: number; params?: Record<string, { target: number; dur: number }> };
  click:     { pop: number; pulse: number; params?: Record<string, { target: number; dur: number }> };
  /** Param conditions: each [param, minValue] pair must be met for this mood to score. */
  signature: [string, number][];
}

const MOOD_REACTIONS: MoodReaction[] = [
  // Explosive / fireworks — high bloom + strobe or high speed + intensity
  { signature: [["bloom", 0.8], ["strobe", 0.2]],
    keystroke: { pop: 0.6, pulse: 0.4, params: { bloom: { target: 1.5, dur: 0.3 }, strobe: { target: 0.3, dur: 0.15 } }},
    click:     { pop: 1.0, pulse: 1.0, params: { bloom: { target: 2.0, dur: 0.5 }, strobe: { target: 0.6, dur: 0.3 }, warp: { target: 1.5, dur: 0.6 } }},
  },
  // Chaotic / glitchy — high glitch or aberration
  { signature: [["glitch", 0.3], ["aberration", 0.3]],
    keystroke: { pop: 0.5, pulse: 0.3, params: { glitch: { target: 0.5, dur: 0.2 }, aberration: { target: 0.5, dur: 0.2 } }},
    click:     { pop: 0.8, pulse: 0.7, params: { glitch: { target: 0.8, dur: 0.4 }, invert: { target: 0.5, dur: 0.3 }, aberration: { target: 0.8, dur: 0.4 } }},
  },
  // Stormy / intense — high speed + warp
  { signature: [["speed", 2.0], ["warp", 1.0]],
    keystroke: { pop: 0.4, pulse: 0.3, params: { aberration: { target: 0.3, dur: 0.2 }, warp: { target: 1.5, dur: 0.3 } }},
    click:     { pop: 0.8, pulse: 0.8, params: { strobe: { target: 0.4, dur: 0.3 }, aberration: { target: 0.5, dur: 0.4 }, speed: { target: 3.0, dur: 0.5 } }},
  },
  // Psychedelic — high spin or symmetry + saturation
  { signature: [["spin", 0.3], ["saturation", 1.3]],
    keystroke: { pop: 0.3, pulse: 0.2, params: { spin: { target: 0.5, dur: 0.3 }, saturation: { target: 1.8, dur: 0.3 } }},
    click:     { pop: 0.6, pulse: 0.6, params: { symmetry: { target: 6, dur: 0.5 }, spin: { target: 1.0, dur: 0.5 }, warp: { target: 1.5, dur: 0.5 } }},
  },
  // Crystalline — high cells or symmetry + contrast
  { signature: [["cells", 0.4], ["contrast", 1.5]],
    keystroke: { pop: 0.4, pulse: 0.2, params: { cells: { target: 0.6, dur: 0.3 }, bloom: { target: 0.5, dur: 0.3 } }},
    click:     { pop: 0.7, pulse: 0.5, params: { cells: { target: 0.8, dur: 0.5 }, symmetry: { target: 8, dur: 0.5 }, contrast: { target: 2.0, dur: 0.4 } }},
  },
  // Watery — high wobble + bloom
  { signature: [["wobble", 0.3], ["bloom", 0.4]],
    keystroke: { pop: 0.2, pulse: 0.15, params: { wobble: { target: 0.5, dur: 0.4 } }},
    click:     { pop: 0.4, pulse: 0.3, params: { wobble: { target: 0.8, dur: 0.6 }, bloom: { target: 0.8, dur: 0.5 } }},
  },
  // Volcanic — high ridge + warmth + warp
  { signature: [["ridge", 0.4], ["warmth", 0.4]],
    keystroke: { pop: 0.5, pulse: 0.3, params: { ridge: { target: 0.6, dur: 0.3 }, warmth: { target: 0.8, dur: 0.3 } }},
    click:     { pop: 0.9, pulse: 0.8, params: { warp: { target: 2.0, dur: 0.5 }, ridge: { target: 0.8, dur: 0.5 }, bloom: { target: 1.0, dur: 0.4 } }},
  },
  // Bright / energetic — high intensity + speed (generic catch-all for active states)
  { signature: [["intensity", 0.7], ["speed", 1.5]],
    keystroke: { pop: 0.4, pulse: 0.25, params: { bloom: { target: 0.8, dur: 0.3 } }},
    click:     { pop: 0.7, pulse: 0.6, params: { bloom: { target: 1.2, dur: 0.5 }, saturation: { target: 1.5, dur: 0.4 } }},
  },
];

// Default subtle reaction when no mood matches strongly
const DEFAULT_REACTION: MoodReaction = {
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
  audio.playPop(reaction.pop * scale);
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
      console.log("[InputReactor]", reactions.join(", "));
    }

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
      director.respond(ctx);
    } else {
      // No LLM — tell the ambient voice about the user's words so it can weave them into its story
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

// --- Infinite timeline: cycles through scenes with varied durations ---
const SCENE_CYCLE = ["intro", "build", "climax", "outro"];
let timelineEnd = 0;

function extendTimeline(cycles: number = 1): void {
  for (let c = 0; c < cycles; c++) {
    for (let i = 0; i < SCENE_CYCLE.length; i++) {
      const sceneId = SCENE_CYCLE[i];
      // Vary durations: 20-40s per scene, with climax shorter and outro longer
      let baseDuration = 25 + Math.random() * 15;
      if (sceneId === "climax") baseDuration = 18 + Math.random() * 12;
      if (sceneId === "outro") baseDuration = 25 + Math.random() * 20;
      if (sceneId === "intro" && timelineEnd === 0) baseDuration = 20 + Math.random() * 10; // first intro shorter

      const transitionDuration = i === 0 && timelineEnd === 0 ? 0 : 2 + Math.random() * 3;
      const startTime = timelineEnd;
      const endTime = startTime + baseDuration;

      timeline.add({ startTime, endTime, sceneId, transitionDuration });
      timelineEnd = endTime;
    }
  }
}

// Seed the first two cycles
extendTimeline(2);

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

// --- Main loop ---
let lastTime = 0;

function frame(now: number) {
  const nowSec = now / 1000;
  const dt = lastTime === 0 ? 0.016 : nowSec - lastTime;
  lastTime = nowSec;

  clock.tick(dt);

  // Auto-extend timeline before we run out of scenes, and prune old entries
  if (clock.elapsed > timelineEnd - 60) {
    extendTimeline(1);
    timeline.prune(clock.elapsed);
  }

  input.applyTo(params);
  audio.update();
  params.set("amplitude", audio.amplitude);
  params.set("bass", audio.bass);
  params.set("brightness", audio.brightness);

  // Scene-reactive audio mix + themed scene titles
  const currentTransition = timeline.getTransitionState(clock.elapsed);
  if (currentTransition) {
    audio.setSceneMix(currentTransition.current.sceneId, currentTransition.current.progress);
    // Show themed title on scene change
    particles.showSceneTitle(currentTransition.current.sceneId, canvas.width, canvas.height);
  }

  // Decay click pulse
  const currentPulse = params.get("pulse");
  if (currentPulse > 0.001) {
    params.set("pulse", currentPulse * Math.exp(-dt * 3.0));
  } else if (currentPulse > 0) {
    params.set("pulse", 0);
  }

  // Advance param drifts and pulses
  params.tick(dt);

  // Update LLM director or ambient voice (director may self-disable on failures)
  if (director && director.enabled) {
    // Only build context when the director actually needs it (avoids snapshot() allocation every frame)
    if (director.needsUpdate(clock.elapsed)) {
      director.update(buildDirectorContext(null));
    }
  } else {
    ambientVoice.update(clock.elapsed);
  }

  // Show interaction hint if no activity after 15s
  if (!hintShown && !anyInteraction && clock.elapsed > 15) {
    hintShown = true;
    particles.addWhisper("click anywhere · type into the void", canvas.width, canvas.height);
  }

  // Update and render text particles (audio-reactive)
  particles.update(dt, audio.bass, audio.amplitude);
  overlay.render(particles.particles);

  const transition = timeline.getTransitionState(clock.elapsed);

  renderer.draw({
    time: clock.elapsed,
    beat: clock.beat,
    params,
    transition,
    overlayTexture: overlay.texture,
  });

  requestAnimationFrame(frame);
}

// Click handler — first click starts audio, every click triggers mood-appropriate reaction
let audioStarted = false;
canvas.addEventListener("click", () => {
  if (!audioStarted) {
    audio.init();
    audio.playDrone();
    audioStarted = true;
  }

  // Auto-themed click reaction — adapts to current visual state
  const { mood, confidence } = detectMood();
  applyMoodReaction(mood.click, confidence);
  lastUserInteraction = clock.elapsed;
});

// Start rendering immediately (audio starts on click)
requestAnimationFrame(frame);
