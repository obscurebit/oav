import { Clock, ParameterStore, Timeline, Input } from "./engine";
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
import type { DirectorContext } from "./llm";

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
const director = apiKey
  ? new Director({
      apiKey,
      ...(baseUrl ? { apiUrl: `${baseUrl}/chat/completions` } : {}),
      ...(model ? { model } : {}),
    })
  : null;

const ambientVoice = new AmbientVoice(10, 20);

if (director) {
  director.onResult((result) => {
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
  // Ambient fallback — poetic fragments from a curated list
  ambientVoice.onWords((words) => {
    particles.addVoice(words, canvas.width, canvas.height);
  });
}

// --- Word input (type into the void) ---
const wordInput = new WordInput(particles, {
  pauseMs: 1500,
  onPhrase: (phrase) => {
    lastUserInteraction = clock.elapsed;
    if (director) {
      const ctx = buildDirectorContext(phrase);
      director.respond(ctx);
    } else {
      // No LLM — echo back a transformed fragment
      const echoes = [
        "the world heard you",
        "resonating",
        "it shifts",
        "yes",
        "further",
        "the colors remember",
      ];
      const echo = echoes[Math.floor(Math.random() * echoes.length)];
      setTimeout(() => {
        particles.addEcho(echo, canvas.width, canvas.height);
      }, 1500 + Math.random() * 1000);
    }
  },
});

// Define initial parameters
params.define("intensity", 0, 1, 0.5);
params.define("speed", 0.1, 4, 1);
params.define("hue", 0, 1, 0);
params.define("amplitude", 0, 1, 0);
params.define("bass", 0, 1, 0);
params.define("brightness", 0, 1, 0);

// Define timeline with crossfade transitions
timeline.add({ startTime: 0, endTime: 30, sceneId: "intro" });
timeline.add({ startTime: 30, endTime: 60, sceneId: "build", transitionDuration: 3 });
timeline.add({ startTime: 60, endTime: 90, sceneId: "climax", transitionDuration: 2 });
timeline.add({ startTime: 90, endTime: 120, sceneId: "outro", transitionDuration: 4 });

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

// --- Main loop ---
let lastTime = 0;

function frame(now: number) {
  const nowSec = now / 1000;
  const dt = lastTime === 0 ? 0.016 : nowSec - lastTime;
  lastTime = nowSec;

  clock.tick(dt);
  input.applyTo(params);
  audio.update();
  params.set("amplitude", audio.amplitude);
  params.set("bass", audio.bass);
  params.set("brightness", audio.brightness);

  // Advance param drifts and pulses
  params.tick(dt);

  // Update LLM director or ambient voice
  if (director) {
    director.update(buildDirectorContext(null));
  } else {
    ambientVoice.update(clock.elapsed);
  }

  // Update and render text particles
  particles.update(dt);
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

// Start on user gesture (unlocks AudioContext)
document.addEventListener(
  "click",
  () => {
    audio.init();
    audio.playDrone();
    lastUserInteraction = clock.elapsed;
  },
  { once: true }
);

// Start rendering immediately (audio starts on click)
requestAnimationFrame(frame);
