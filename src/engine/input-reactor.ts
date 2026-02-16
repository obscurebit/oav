/**
 * InputReactor — analyzes typing in real-time and nudges engine params.
 * No LLM needed. Reacts to:
 *   - Typing speed (fast = more energy, slow = calm)
 *   - Color words → immediate hue shift
 *   - Mood/energy words → dramatic param changes
 *   - Triggers a visible pulse on phrase flush so the reaction is obvious
 */
import type { ParameterStore } from "./params";

// --- Color word → hue mapping (0-1 hue wheel) ---
// -1 = bright/light, -2 = dark/dim
const COLOR_HUES: Record<string, number> = {
  red: 0.0, crimson: 0.98, scarlet: 0.0, blood: 0.98, ruby: 0.98,
  orange: 0.08, amber: 0.1, fire: 0.06, flame: 0.05, lava: 0.04, volcano: 0.03,
  yellow: 0.15, gold: 0.12, sun: 0.13, golden: 0.12, honey: 0.11,
  green: 0.33, emerald: 0.38, forest: 0.35, jade: 0.36, moss: 0.3, lime: 0.28, neon: 0.3,
  cyan: 0.5, teal: 0.48, turquoise: 0.47, aqua: 0.5,
  blue: 0.6, cobalt: 0.62, sapphire: 0.63, ocean: 0.58, sky: 0.55, ice: 0.54, arctic: 0.55,
  indigo: 0.7, navy: 0.68,
  purple: 0.78, violet: 0.8, lavender: 0.76, plum: 0.82, ultraviolet: 0.82,
  pink: 0.9, magenta: 0.85, rose: 0.92, blush: 0.93, fuchsia: 0.87,
  white: -1, black: -2, dark: -2, light: -1, bright: -1,
  void: -2, shadow: -2, night: -2, dawn: -1, dusk: 0.05, midnight: -2,
};

// --- Mood words → param nudges (short durations for obvious effect) ---
interface ParamNudge {
  param: string;
  target: number;
  duration: number;
}

const MOOD_WORDS: Record<string, ParamNudge[]> = {
  // Energy up — fast, dramatic
  fast: [{ param: "speed", target: 3.0, duration: 1.0 }],
  faster: [{ param: "speed", target: 3.5, duration: 0.8 }],
  spin: [{ param: "spin", target: 1.5, duration: 1.0 }],
  spiral: [{ param: "spin", target: 1.0, duration: 1.5 }, { param: "warp", target: 1.5, duration: 1.5 }],
  whirl: [{ param: "spin", target: 2.0, duration: 1.0 }, { param: "speed", target: 2.0, duration: 1.0 }],
  rush: [{ param: "speed", target: 3.0, duration: 0.8 }, { param: "intensity", target: 0.9, duration: 1.0 }, { param: "aberration", target: 0.4, duration: 1.0 }],
  intense: [{ param: "intensity", target: 1.0, duration: 0.8 }, { param: "contrast", target: 2.0, duration: 1.0 }],
  loud: [{ param: "intensity", target: 0.95, duration: 1.0 }, { param: "bloom", target: 1.0, duration: 1.0 }],
  max: [{ param: "intensity", target: 1.0, duration: 0.5 }, { param: "speed", target: 3.5, duration: 0.5 }, { param: "bloom", target: 1.5, duration: 0.5 }],
  chaos: [{ param: "speed", target: 3.5, duration: 0.8 }, { param: "intensity", target: 1.0, duration: 0.8 }, { param: "warp", target: 2.5, duration: 0.8 }, { param: "glitch", target: 0.5, duration: 1.0 }],
  storm: [{ param: "speed", target: 3.0, duration: 1.0 }, { param: "warp", target: 2.0, duration: 1.0 }, { param: "aberration", target: 0.5, duration: 1.0 }],
  explode: [{ param: "intensity", target: 1.0, duration: 0.5 }, { param: "speed", target: 4.0, duration: 0.5 }, { param: "bloom", target: 2.0, duration: 0.5 }, { param: "strobe", target: 0.5, duration: 0.5 }],
  rage: [{ param: "intensity", target: 1.0, duration: 0.8 }, { param: "speed", target: 3.5, duration: 0.8 }, { param: "contrast", target: 2.5, duration: 0.8 }],
  burn: [{ param: "intensity", target: 0.95, duration: 1.0 }, { param: "warmth", target: 0.8, duration: 1.0 }, { param: "bloom", target: 0.8, duration: 1.0 }],
  scream: [{ param: "intensity", target: 1.0, duration: 0.5 }, { param: "strobe", target: 0.6, duration: 0.5 }],
  wild: [{ param: "speed", target: 3.0, duration: 1.0 }, { param: "warp", target: 2.0, duration: 1.0 }, { param: "wobble", target: 0.6, duration: 1.0 }],
  crazy: [{ param: "speed", target: 3.5, duration: 0.8 }, { param: "glitch", target: 0.6, duration: 0.8 }, { param: "aberration", target: 0.5, duration: 0.8 }],
  power: [{ param: "intensity", target: 1.0, duration: 1.0 }, { param: "bloom", target: 1.5, duration: 1.0 }],
  energy: [{ param: "intensity", target: 0.9, duration: 1.0 }, { param: "speed", target: 2.5, duration: 1.0 }, { param: "saturation", target: 1.5, duration: 1.0 }],
  more: [{ param: "intensity", target: 0.85, duration: 1.0 }, { param: "speed", target: 2.0, duration: 1.0 }],
  warp: [{ param: "warp", target: 2.5, duration: 1.0 }],
  distort: [{ param: "warp", target: 2.0, duration: 1.0 }, { param: "wobble", target: 0.7, duration: 1.0 }],
  glitch: [{ param: "glitch", target: 0.8, duration: 1.0 }, { param: "aberration", target: 0.5, duration: 1.0 }],
  pixel: [{ param: "pixelate", target: 0.7, duration: 1.0 }],
  sharp: [{ param: "edge", target: 0.8, duration: 1.0 }, { param: "contrast", target: 2.0, duration: 1.0 }],
  smooth: [{ param: "edge", target: 0, duration: 1.5 }, { param: "contrast", target: 0.8, duration: 1.5 }],
  zoom: [{ param: "zoom", target: 3.0, duration: 1.5 }],
  wide: [{ param: "zoom", target: 0.3, duration: 1.5 }],
  mirror: [{ param: "mirror_x", target: 1, duration: 0.5 }, { param: "mirror_y", target: 1, duration: 0.5 }],
  fractal: [{ param: "octaves", target: 8, duration: 1.0 }, { param: "warp", target: 1.5, duration: 1.0 }],
  grain: [{ param: "grain", target: 0.7, duration: 1.0 }],
  bloom: [{ param: "bloom", target: 1.5, duration: 1.0 }],
  glow: [{ param: "bloom", target: 1.2, duration: 1.5 }],
  strobe: [{ param: "strobe", target: 0.7, duration: 0.8 }],
  flash: [{ param: "strobe", target: 0.5, duration: 0.8 }, { param: "bloom", target: 1.0, duration: 0.8 }],
  invert: [{ param: "invert", target: 0.8, duration: 0.8 }],
  negative: [{ param: "invert", target: 1.0, duration: 0.8 }],
  saturate: [{ param: "saturation", target: 2.0, duration: 1.0 }],
  desaturate: [{ param: "saturation", target: 0.1, duration: 1.5 }],
  gray: [{ param: "saturation", target: 0, duration: 1.0 }],
  grey: [{ param: "saturation", target: 0, duration: 1.0 }],
  vivid: [{ param: "saturation", target: 1.8, duration: 1.0 }, { param: "contrast", target: 1.5, duration: 1.0 }],
  flat: [{ param: "contrast", target: 0.3, duration: 1.5 }],
  cells: [{ param: "cells", target: 0.8, duration: 1.0 }],
  ridge: [{ param: "ridge", target: 0.8, duration: 1.0 }],

  // Energy down — noticeable but smoother
  slow: [{ param: "speed", target: 0.2, duration: 1.5 }],
  slower: [{ param: "speed", target: 0.15, duration: 1.0 }],
  stop: [{ param: "speed", target: 0.1, duration: 0.8 }, { param: "intensity", target: 0.1, duration: 1.0 }, { param: "spin", target: 0, duration: 1.0 }],
  calm: [{ param: "speed", target: 0.3, duration: 1.5 }, { param: "intensity", target: 0.25, duration: 1.5 }, { param: "glitch", target: 0, duration: 1.0 }, { param: "strobe", target: 0, duration: 1.0 }],
  quiet: [{ param: "intensity", target: 0.15, duration: 1.5 }, { param: "bloom", target: 0.2, duration: 1.5 }],
  still: [{ param: "speed", target: 0.1, duration: 1.5 }, { param: "spin", target: 0, duration: 1.0 }, { param: "wobble", target: 0, duration: 1.0 }],
  peace: [
    { param: "speed", target: 0.2, duration: 2.5 },
    { param: "intensity", target: 0.3, duration: 2.5 },
    { param: "warmth", target: 0.3, duration: 2.5 },
    { param: "bloom", target: 0.6, duration: 2.5 },
    { param: "wobble", target: 0.2, duration: 3.0 },
    { param: "glitch", target: 0, duration: 1.0 },
    { param: "strobe", target: 0, duration: 1.0 },
    { param: "aberration", target: 0, duration: 1.5 },
    { param: "spin", target: 0, duration: 2.0 },
    { param: "warp", target: 0.2, duration: 2.5 },
    { param: "contrast", target: 0.8, duration: 2.0 },
    { param: "vignette", target: 0.3, duration: 2.5 },
    { param: "noise_scale", target: 4, duration: 2.5 },
  ],
  peaceful: [
    { param: "speed", target: 0.2, duration: 2.5 },
    { param: "intensity", target: 0.3, duration: 2.5 },
    { param: "warmth", target: 0.3, duration: 2.5 },
    { param: "bloom", target: 0.6, duration: 2.5 },
    { param: "wobble", target: 0.2, duration: 3.0 },
    { param: "glitch", target: 0, duration: 1.0 },
    { param: "strobe", target: 0, duration: 1.0 },
    { param: "aberration", target: 0, duration: 1.5 },
    { param: "spin", target: 0, duration: 2.0 },
    { param: "warp", target: 0.2, duration: 2.5 },
    { param: "contrast", target: 0.8, duration: 2.0 },
  ],
  serene: [
    { param: "speed", target: 0.15, duration: 3.0 },
    { param: "intensity", target: 0.25, duration: 3.0 },
    { param: "bloom", target: 0.7, duration: 3.0 },
    { param: "wobble", target: 0.25, duration: 3.0 },
    { param: "glitch", target: 0, duration: 1.0 },
    { param: "strobe", target: 0, duration: 1.0 },
    { param: "aberration", target: 0, duration: 1.5 },
    { param: "warmth", target: 0.2, duration: 3.0 },
  ],
  tranquil: [
    { param: "speed", target: 0.15, duration: 3.0 },
    { param: "intensity", target: 0.2, duration: 3.0 },
    { param: "bloom", target: 0.5, duration: 3.0 },
    { param: "wobble", target: 0.3, duration: 3.0 },
    { param: "glitch", target: 0, duration: 1.0 },
    { param: "strobe", target: 0, duration: 1.0 },
    { param: "spin", target: 0, duration: 2.0 },
  ],
  harmony: [
    { param: "speed", target: 0.3, duration: 2.5 },
    { param: "bloom", target: 0.6, duration: 2.5 },
    { param: "wobble", target: 0.2, duration: 2.5 },
    { param: "warmth", target: 0.2, duration: 2.5 },
    { param: "glitch", target: 0, duration: 1.0 },
    { param: "strobe", target: 0, duration: 1.0 },
    { param: "contrast", target: 0.9, duration: 2.0 },
  ],
  water: [
    { param: "wobble", target: 0.5, duration: 2.0 },
    { param: "bloom", target: 0.6, duration: 2.0 },
    { param: "speed", target: 0.3, duration: 2.0 },
    { param: "warmth", target: -0.2, duration: 2.0 },
    { param: "warp", target: 0.8, duration: 2.0 },
    { param: "glitch", target: 0, duration: 1.0 },
    { param: "strobe", target: 0, duration: 1.0 },
  ],
  river: [
    { param: "wobble", target: 0.4, duration: 2.5 },
    { param: "bloom", target: 0.5, duration: 2.5 },
    { param: "speed", target: 0.4, duration: 2.0 },
    { param: "drift_x", target: -0.5, duration: 2.0 },
    { param: "warmth", target: -0.1, duration: 2.0 },
    { param: "glitch", target: 0, duration: 1.0 },
  ],
  rain: [
    { param: "speed", target: 0.4, duration: 2.0 },
    { param: "grain", target: 0.3, duration: 2.0 },
    { param: "drift_y", target: 0.5, duration: 2.0 },
    { param: "warmth", target: -0.2, duration: 2.0 },
    { param: "bloom", target: 0.4, duration: 2.0 },
    { param: "intensity", target: 0.3, duration: 2.0 },
  ],
  sleep: [{ param: "speed", target: 0.15, duration: 1.5 }, { param: "intensity", target: 0.1, duration: 1.5 }, { param: "saturation", target: 0.3, duration: 2.0 }],
  whisper: [{ param: "intensity", target: 0.15, duration: 1.5 }],
  silence: [{ param: "intensity", target: 0.05, duration: 1.0 }, { param: "speed", target: 0.1, duration: 1.0 }],
  breathe: [{ param: "speed", target: 0.35, duration: 2.0 }, { param: "wobble", target: 0.3, duration: 2.0 }],
  gentle: [{ param: "intensity", target: 0.25, duration: 1.5 }, { param: "speed", target: 0.4, duration: 1.5 }, { param: "bloom", target: 0.5, duration: 1.5 }],
  soft: [{ param: "intensity", target: 0.2, duration: 1.5 }, { param: "contrast", target: 0.6, duration: 1.5 }, { param: "edge", target: 0, duration: 1.0 }],
  less: [{ param: "intensity", target: 0.2, duration: 1.0 }, { param: "speed", target: 0.5, duration: 1.0 }],
  nothing: [{ param: "intensity", target: 0.05, duration: 1.0 }, { param: "speed", target: 0.1, duration: 1.0 }],
  zero: [{ param: "intensity", target: 0.0, duration: 0.5 }, { param: "speed", target: 0.1, duration: 0.5 }],
  clean: [{ param: "glitch", target: 0, duration: 1.0 }, { param: "grain", target: 0, duration: 1.0 }, { param: "aberration", target: 0, duration: 1.0 }, { param: "strobe", target: 0, duration: 1.0 }],
  reset: [{ param: "warp", target: 0.5, duration: 1.5 }, { param: "spin", target: 0, duration: 1.0 }, { param: "glitch", target: 0, duration: 1.0 }, { param: "symmetry", target: 0, duration: 1.0 }, { param: "invert", target: 0, duration: 1.0 }],

  // Mood
  dream: [{ param: "speed", target: 0.4, duration: 2.0 }, { param: "wobble", target: 0.4, duration: 2.0 }, { param: "bloom", target: 1.0, duration: 2.0 }, { param: "warmth", target: 0.3, duration: 2.0 }],
  deep: [{ param: "intensity", target: 0.8, duration: 1.5 }, { param: "zoom", target: 2.0, duration: 2.0 }, { param: "warp", target: 1.2, duration: 1.5 }],
  warm: [{ param: "warmth", target: 0.8, duration: 1.0 }, { param: "intensity", target: 0.7, duration: 1.5 }],
  cold: [{ param: "warmth", target: -0.8, duration: 1.0 }, { param: "saturation", target: 0.5, duration: 1.5 }],
  heavy: [{ param: "speed", target: 0.2, duration: 1.5 }, { param: "intensity", target: 0.8, duration: 1.5 }, { param: "contrast", target: 2.0, duration: 1.5 }],
  trippy: [{ param: "speed", target: 2.5, duration: 1.0 }, { param: "warp", target: 2.0, duration: 1.0 }, { param: "saturation", target: 1.8, duration: 1.0 }, { param: "wobble", target: 0.5, duration: 1.0 }],
  psychedelic: [{ param: "saturation", target: 2.0, duration: 1.0 }, { param: "spin", target: 0.8, duration: 1.0 }, { param: "symmetry", target: 6, duration: 1.0 }, { param: "warp", target: 1.5, duration: 1.0 }],
  chill: [{ param: "speed", target: 0.4, duration: 2.0 }, { param: "warmth", target: -0.3, duration: 2.0 }, { param: "bloom", target: 0.5, duration: 2.0 }],
  mellow: [{ param: "speed", target: 0.35, duration: 2.0 }, { param: "saturation", target: 0.7, duration: 2.0 }, { param: "contrast", target: 0.7, duration: 2.0 }],
  beautiful: [{ param: "bloom", target: 1.0, duration: 2.0 }, { param: "saturation", target: 1.3, duration: 2.0 }],
  ugly: [{ param: "glitch", target: 0.5, duration: 1.0 }, { param: "edge", target: 0.6, duration: 1.0 }, { param: "contrast", target: 2.5, duration: 1.0 }],
  noir: [{ param: "saturation", target: 0.1, duration: 1.5 }, { param: "contrast", target: 2.2, duration: 1.5 }, { param: "grain", target: 0.5, duration: 1.5 }],
  cosmic: [{ param: "bloom", target: 1.5, duration: 1.5 }, { param: "octaves", target: 7, duration: 1.5 }, { param: "zoom", target: 0.4, duration: 2.0 }],
  underwater: [{ param: "wobble", target: 0.6, duration: 1.5 }, { param: "bloom", target: 0.8, duration: 1.5 }, { param: "warmth", target: -0.5, duration: 1.5 }],
  crystal: [{ param: "cells", target: 0.8, duration: 1.0 }, { param: "symmetry", target: 8, duration: 1.0 }, { param: "contrast", target: 2.0, duration: 1.0 }],

  // Evocative scenes — multi-param narratives
  void: [
    { param: "zoom", target: 4.5, duration: 3.0 },       // sucked inward
    { param: "spin", target: 1.5, duration: 2.0 },        // spiraling in
    { param: "intensity", target: 0.08, duration: 3.0 },  // going dark
    { param: "warp", target: 2.5, duration: 2.0 },        // spacetime bending
    { param: "saturation", target: 0.1, duration: 2.5 },  // color drains
    { param: "contrast", target: 2.5, duration: 2.0 },    // harsh light/dark
    { param: "vignette", target: 2.0, duration: 2.0 },    // tunnel vision
    { param: "aberration", target: 0.6, duration: 1.5 },  // light bending
    { param: "speed", target: 2.5, duration: 2.0 },       // time accelerates
  ],
  hole: [
    { param: "zoom", target: 5.0, duration: 3.0 },
    { param: "spin", target: 2.0, duration: 2.0 },
    { param: "intensity", target: 0.05, duration: 3.0 },
    { param: "warp", target: 3.0, duration: 2.0 },
    { param: "vignette", target: 2.0, duration: 2.0 },
    { param: "aberration", target: 0.8, duration: 1.5 },
  ],
  abyss: [
    { param: "zoom", target: 4.0, duration: 3.0 },
    { param: "intensity", target: 0.03, duration: 3.0 },
    { param: "warp", target: 2.0, duration: 2.5 },
    { param: "saturation", target: 0, duration: 2.0 },
    { param: "vignette", target: 2.0, duration: 2.0 },
    { param: "speed", target: 0.2, duration: 3.0 },
  ],
  singularity: [
    { param: "zoom", target: 5.0, duration: 2.0 },
    { param: "spin", target: 2.0, duration: 1.5 },
    { param: "intensity", target: 0.02, duration: 2.5 },
    { param: "warp", target: 3.0, duration: 1.5 },
    { param: "contrast", target: 3.0, duration: 1.5 },
    { param: "vignette", target: 2.0, duration: 1.5 },
    { param: "aberration", target: 1.0, duration: 1.0 },
    { param: "saturation", target: 0, duration: 2.0 },
  ],
  collapse: [
    { param: "zoom", target: 4.5, duration: 2.0 },
    { param: "spin", target: 1.0, duration: 2.0 },
    { param: "intensity", target: 0.1, duration: 2.5 },
    { param: "warp", target: 2.5, duration: 2.0 },
    { param: "vignette", target: 2.0, duration: 2.0 },
    { param: "speed", target: 3.0, duration: 1.5 },
  ],
  supernova: [
    { param: "zoom", target: 0.2, duration: 1.5 },       // exploding outward
    { param: "intensity", target: 1.0, duration: 0.5 },
    { param: "bloom", target: 2.0, duration: 1.0 },
    { param: "saturation", target: 2.0, duration: 1.0 },
    { param: "warmth", target: 0.9, duration: 1.0 },
    { param: "strobe", target: 0.5, duration: 0.8 },
    { param: "warp", target: 2.0, duration: 1.5 },
    { param: "speed", target: 3.5, duration: 1.0 },
  ],
  fireworks: [
    { param: "pulse", target: 1.0, duration: 0.01 },      // immediate flash
    { param: "bloom", target: 2.0, duration: 0.8 },       // bright bursts
    { param: "strobe", target: 0.6, duration: 0.5 },      // flashing
    { param: "saturation", target: 2.0, duration: 1.0 },  // vivid color
    { param: "speed", target: 3.0, duration: 1.0 },       // fast motion
    { param: "zoom", target: 0.3, duration: 1.5 },        // zoomed out — sky view
    { param: "intensity", target: 1.0, duration: 0.5 },   // max brightness
    { param: "warmth", target: 0.5, duration: 1.0 },      // warm glow
    { param: "warp", target: 1.5, duration: 1.0 },        // explosive distortion
    { param: "aberration", target: 0.4, duration: 0.8 },  // color split
    { param: "spin", target: 0.3, duration: 1.5 },        // gentle rotation
    { param: "contrast", target: 1.8, duration: 1.0 },    // punchy
  ],
  explosion: [
    { param: "pulse", target: 1.0, duration: 0.01 },
    { param: "bloom", target: 2.0, duration: 0.6 },
    { param: "zoom", target: 0.2, duration: 1.0 },
    { param: "intensity", target: 1.0, duration: 0.3 },
    { param: "strobe", target: 0.5, duration: 0.5 },
    { param: "warp", target: 2.0, duration: 1.0 },
    { param: "speed", target: 3.5, duration: 1.0 },
  ],
  celebrate: [
    { param: "bloom", target: 1.8, duration: 1.0 },
    { param: "strobe", target: 0.4, duration: 0.8 },
    { param: "saturation", target: 1.8, duration: 1.0 },
    { param: "speed", target: 2.5, duration: 1.0 },
    { param: "intensity", target: 0.9, duration: 0.8 },
    { param: "warmth", target: 0.6, duration: 1.0 },
  ],
  nebula: [
    { param: "warp", target: 1.8, duration: 2.0 },
    { param: "bloom", target: 1.5, duration: 2.0 },
    { param: "saturation", target: 1.5, duration: 2.0 },
    { param: "octaves", target: 7, duration: 2.0 },
    { param: "speed", target: 0.4, duration: 2.0 },
    { param: "zoom", target: 0.5, duration: 2.5 },
  ],
  ocean: [
    { param: "wobble", target: 0.8, duration: 2.0 },
    { param: "warp", target: 1.2, duration: 2.0 },
    { param: "warmth", target: -0.6, duration: 1.5 },
    { param: "bloom", target: 0.6, duration: 2.0 },
    { param: "speed", target: 0.5, duration: 2.0 },
    { param: "noise_scale", target: 2.0, duration: 2.0 },
  ],
  forest: [
    { param: "warmth", target: 0.4, duration: 2.0 },
    { param: "saturation", target: 1.3, duration: 2.0 },
    { param: "warp", target: 0.8, duration: 2.0 },
    { param: "octaves", target: 6, duration: 2.0 },
    { param: "speed", target: 0.4, duration: 2.0 },
    { param: "bloom", target: 0.4, duration: 2.0 },
  ],
  hell: [
    { param: "warmth", target: 1.0, duration: 1.0 },
    { param: "intensity", target: 0.95, duration: 1.0 },
    { param: "warp", target: 2.5, duration: 1.5 },
    { param: "ridge", target: 0.8, duration: 1.5 },
    { param: "contrast", target: 2.5, duration: 1.0 },
    { param: "speed", target: 2.0, duration: 1.0 },
    { param: "strobe", target: 0.3, duration: 1.0 },
  ],
  heaven: [
    { param: "bloom", target: 2.0, duration: 2.0 },
    { param: "intensity", target: 0.8, duration: 2.0 },
    { param: "warmth", target: 0.5, duration: 2.0 },
    { param: "saturation", target: 0.6, duration: 2.0 },
    { param: "speed", target: 0.3, duration: 2.0 },
    { param: "wobble", target: 0.2, duration: 2.0 },
    { param: "vignette", target: 0, duration: 2.0 },
  ],
  matrix: [
    { param: "pixelate", target: 0.5, duration: 1.0 },
    { param: "edge", target: 0.7, duration: 1.0 },
    { param: "glitch", target: 0.4, duration: 1.0 },
    { param: "saturation", target: 1.5, duration: 1.0 },
    { param: "speed", target: 2.0, duration: 1.0 },
    { param: "drift_y", target: -1.5, duration: 1.0 },
  ],
};

/** Words that activate a theme mode (themed keystroke/click reactions). */
const THEME_WORDS = new Set([
  "fireworks", "explosion", "celebrate", "supernova",
  "storm", "nightmare", "psychedelic", "crystal",
  "underwater", "lava", "void", "dream", "zen",
]);

export class InputReactor {
  private _params: ParameterStore;
  private _keystrokeTimes: number[] = [];
  private _lastKeystrokeTime = 0;

  /** Currently active theme from user typing (null = no theme). */
  activeTheme: string | null = null;

  constructor(params: ParameterStore) {
    this._params = params;
  }

  /**
   * Called on every keystroke. Tracks typing speed and applies
   * immediate pulse/speed feedback scaled by how fast you're typing.
   */
  onKeystroke(char: string, _bufferLength: number): void {
    const now = performance.now();
    this._keystrokeTimes.push(now);
    this._lastKeystrokeTime = now;

    // Keep only last 10 keystrokes for speed calculation
    if (this._keystrokeTimes.length > 10) {
      this._keystrokeTimes.shift();
    }

    const speed = this._typingSpeed();

    // Scale pulse by typing speed: faster typing = bigger ripple
    // Slow (<3 chars/s) = 0.05, fast (>8 chars/s) = 0.2
    const pulseAmount = 0.04 + Math.min(speed / 10, 1) * 0.16;
    const current = this._params.get("pulse");
    this._params.set("pulse", Math.min(current + pulseAmount, 1));

    // Fast typing drifts speed up, slow typing lets it settle
    if (speed > 6) {
      const targetSpeed = Math.min(1.0 + speed * 0.15, 3.0);
      this._params.drift("speed", targetSpeed, 0.8);
    }

    // Very fast typing also bumps intensity
    if (speed > 8) {
      this._params.drift("intensity", Math.min(this._params.get("intensity") + 0.1, 0.9), 1.0);
    }
  }

  /**
   * Called when a phrase is flushed. Scans for color words and mood words
   * and applies immediate, dramatic param changes before the LLM even sees it.
   * Returns a description of what was detected (for logging).
   */
  onPhrase(phrase: string): string[] {
    const reactions: string[] = [];
    const lower = phrase.toLowerCase();
    const words = lower.split(/\s+/);
    let hadReaction = false;

    // Multi-word phrase matching (checked before individual words)
    const PHRASE_TRIGGERS: Record<string, ParamNudge[]> = {
      "black hole": [
        { param: "zoom", target: 5.0, duration: 3.0 },
        { param: "spin", target: 2.0, duration: 2.0 },
        { param: "intensity", target: 0.03, duration: 3.0 },
        { param: "warp", target: 3.0, duration: 2.0 },
        { param: "saturation", target: 0, duration: 2.5 },
        { param: "contrast", target: 3.0, duration: 2.0 },
        { param: "vignette", target: 2.0, duration: 2.0 },
        { param: "aberration", target: 0.8, duration: 1.5 },
        { param: "speed", target: 2.5, duration: 2.0 },
      ],
      "event horizon": [
        { param: "zoom", target: 4.0, duration: 3.0 },
        { param: "spin", target: 1.2, duration: 2.5 },
        { param: "intensity", target: 0.1, duration: 3.0 },
        { param: "warp", target: 2.5, duration: 2.5 },
        { param: "vignette", target: 2.0, duration: 2.0 },
        { param: "aberration", target: 0.6, duration: 2.0 },
        { param: "contrast", target: 2.5, duration: 2.0 },
      ],
      "deep space": [
        { param: "zoom", target: 0.3, duration: 3.0 },
        { param: "intensity", target: 0.15, duration: 2.5 },
        { param: "bloom", target: 1.0, duration: 2.0 },
        { param: "saturation", target: 0.4, duration: 2.0 },
        { param: "octaves", target: 7, duration: 2.0 },
        { param: "speed", target: 0.3, duration: 2.5 },
      ],
      "northern lights": [
        { param: "wobble", target: 0.5, duration: 2.0 },
        { param: "bloom", target: 1.2, duration: 2.0 },
        { param: "saturation", target: 1.6, duration: 2.0 },
        { param: "warmth", target: -0.3, duration: 2.0 },
        { param: "warp", target: 1.0, duration: 2.0 },
        { param: "speed", target: 0.5, duration: 2.0 },
      ],
      "time warp": [
        { param: "warp", target: 3.0, duration: 1.5 },
        { param: "spin", target: 1.5, duration: 1.5 },
        { param: "speed", target: 3.0, duration: 1.5 },
        { param: "aberration", target: 0.6, duration: 1.5 },
        { param: "wobble", target: 0.5, duration: 1.5 },
      ],
    };

    for (const [trigger, nudges] of Object.entries(PHRASE_TRIGGERS)) {
      if (lower.includes(trigger)) {
        hadReaction = true;
        for (const n of nudges) {
          this._params.drift(n.param, n.target, n.duration);
        }
        reactions.push(`phrase: "${trigger}"`);
      }
    }

    // Check each word for color and mood matches
    for (const word of words) {
      // Strip punctuation
      const clean = word.replace(/[^a-z]/g, "");
      if (!clean) continue;

      // Color detection → IMMEDIATE hue set (not drift — you want to see it NOW)
      const hue = COLOR_HUES[clean];
      if (hue !== undefined) {
        hadReaction = true;
        if (hue === -1) {
          // "white", "light", "bright" → slam intensity up
          this._params.set("intensity", 0.9);
          this._params.drift("intensity", 0.85, 2);
          reactions.push(`brightness from "${clean}"`);
        } else if (hue === -2) {
          // "black", "dark", "void" → slam intensity down
          this._params.set("intensity", 0.1);
          this._params.drift("intensity", 0.15, 2);
          reactions.push(`darkness from "${clean}"`);
        } else {
          // Set hue immediately, then let it settle
          this._params.set("hue", hue);
          reactions.push(`hue → ${clean} (${hue.toFixed(2)})`);
        }
      }

      // Mood detection → param nudges (fast drifts)
      const nudges = MOOD_WORDS[clean];
      if (nudges) {
        hadReaction = true;
        for (const n of nudges) {
          this._params.drift(n.param, n.target, n.duration);
        }
        reactions.push(`mood: ${clean}`);

        // Activate theme mode if this is a theme word
        if (THEME_WORDS.has(clean)) {
          this.activeTheme = clean;
          reactions.push(`theme activated: ${clean}`);
        }
      }
    }

    // Fire a big visible pulse so the user SEES the moment the world reacts
    if (hadReaction) {
      this._params.set("pulse", 1.0);
    }

    // Typing speed at flush time affects the "energy" of the response
    const speed = this._typingSpeed();
    if (speed > 7) {
      reactions.push(`fast typing (${speed.toFixed(1)} cps)`);
    }

    return reactions;
  }

  /** Characters per second based on recent keystrokes. */
  private _typingSpeed(): number {
    if (this._keystrokeTimes.length < 2) return 0;
    const first = this._keystrokeTimes[0];
    const last = this._keystrokeTimes[this._keystrokeTimes.length - 1];
    const elapsed = (last - first) / 1000;
    if (elapsed < 0.1) return 0;
    return (this._keystrokeTimes.length - 1) / elapsed;
  }
}
