/**
 * Tool definitions for the LLM Director.
 * Three abstraction levels: Poetic, Parametric, Structural.
 * Uses OpenAI-compatible function calling format.
 */

// --- Tool call types ---

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

// --- OpenAI function schema format ---

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// --- Level 1: Poetic (high-level, feeling-based) ---

const speakTool: ToolDefinition = {
  type: "function",
  function: {
    name: "speak",
    description:
      "Utter words into the visual world. Words appear as drifting text particles. Use this to express poetic fragments, responses to the visitor, or ambient observations.",
    parameters: {
      type: "object",
      properties: {
        words: {
          type: "string",
          description: "The words to speak. Short fragments, max 12 words. Oblique, poetic, never explanatory.",
        },
        kind: {
          type: "string",
          enum: ["voice", "echo", "name", "transform"],
          description:
            "voice=ambient utterance, echo=response to visitor, name=name the current moment (larger, longer), transform=recontextualize a visitor's word",
        },
      },
      required: ["words"],
    },
  },
};

const shiftMoodTool: ToolDefinition = {
  type: "function",
  function: {
    name: "shift_mood",
    description:
      "Shift the feeling of the visual world using a natural language feeling. The engine interprets the feeling and adjusts parameters smoothly.",
    parameters: {
      type: "object",
      properties: {
        feeling: {
          type: "string",
          enum: ["warmer", "cooler", "darker", "brighter", "faster", "slower", "deeper", "lighter", "chaotic", "calm", "electric", "dissolving"],
          description: "The feeling to shift toward.",
        },
      },
      required: ["feeling"],
    },
  },
};

const whisperTool: ToolDefinition = {
  type: "function",
  function: {
    name: "whisper",
    description:
      "Surface a fragment of your inner thinking as a faint, small, fast-drifting visual element. Use sparingly to hint at the intelligence behind the experience.",
    parameters: {
      type: "object",
      properties: {
        fragment: {
          type: "string",
          description: "A short fragment of thought. Max 8 words. Cryptic, partial, like overhearing a mind.",
        },
      },
      required: ["fragment"],
    },
  },
};

// --- All controllable parameter names ---
export const ALL_PARAM_NAMES = [
  // Core
  "intensity", "speed", "hue",
  // Color & Tone
  "saturation", "contrast", "warmth", "gamma", "invert",
  // Geometry & Space
  "zoom", "rotation", "symmetry", "mirror_x", "mirror_y",
  // Pattern & Texture
  "warp", "noise_scale", "octaves", "lacunarity",
  "grain", "pixelate", "edge", "ridge", "cells",
  // Motion & Animation
  "drift_x", "drift_y", "spin", "wobble", "strobe",
  // Post-processing
  "bloom", "vignette", "aberration", "glitch", "feedback",
];

// --- Level 2: Parametric (mid-level, direct control) ---

const setParamTool: ToolDefinition = {
  type: "function",
  function: {
    name: "set_param",
    description: "Immediately set a visual parameter to a specific value.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          enum: ALL_PARAM_NAMES,
          description: "Parameter name. See descriptions in drift_param.",
        },
        value: {
          type: "number",
          description: "Target value. Each param has its own range — see drift_param description.",
        },
      },
      required: ["name", "value"],
    },
  },
};

const driftParamTool: ToolDefinition = {
  type: "function",
  function: {
    name: "drift_param",
    description:
      `Smoothly transition a parameter to a target value over a duration. Creates organic, gradual changes.
Parameter ranges:
- intensity (0-1): overall brightness/energy
- speed (0.1-4): animation speed
- hue (0-1): color hue (0=red, 0.15=yellow, 0.33=green, 0.5=cyan, 0.6=blue, 0.8=purple)
- saturation (0-2): color saturation (0=grayscale, 1=normal, 2=oversaturated)
- contrast (0-3): color contrast (0=flat, 1=normal, 3=extreme)
- warmth (-1 to 1): color temperature (-1=cool blue, 0=neutral, 1=warm orange)
- gamma (0.2-3): brightness curve (<1=brighter, >1=darker midtones)
- invert (0-1): color inversion (0=normal, 1=fully inverted)
- zoom (0.2-5): camera zoom (smaller=zoomed out, larger=zoomed in)
- rotation (-3.14 to 3.14): static rotation in radians
- symmetry (0-12): kaleidoscope fold count (0=off, 2-12=mirror segments)
- mirror_x (0-1): horizontal mirror (0=off, 1=on)
- mirror_y (0-1): vertical mirror (0=off, 1=on)
- warp (0-3): domain warp strength (0=none, 3=extreme distortion)
- noise_scale (0.5-10): pattern detail scale (low=large shapes, high=fine detail)
- octaves (1-8): fractal noise layers (more=more detail)
- lacunarity (1-4): frequency multiplier per octave
- grain (0-1): film grain overlay
- pixelate (0-1): pixelation (0=smooth, 1=blocky)
- edge (0-1): posterize/hard edges (0=smooth, 1=4 color levels)
- ridge (0-1): ridged/turbulent noise overlay
- cells (0-1): voronoi/cellular pattern overlay
- drift_x (-2 to 2): horizontal pan speed
- drift_y (-2 to 2): vertical pan speed
- spin (-2 to 2): continuous rotation speed (rad/s)
- wobble (0-1): sinusoidal coordinate distortion
- strobe (0-1): strobe flash effect
- bloom (0-2): glow/bloom intensity
- vignette (0-2): edge darkening
- aberration (0-1): chromatic aberration
- glitch (0-1): digital glitch effect
- feedback (0-1): temporal trails`,
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          enum: ALL_PARAM_NAMES,
          description: "Parameter name.",
        },
        target: {
          type: "number",
          description: "Target value within the parameter's range.",
        },
        duration: {
          type: "number",
          description: "Duration in seconds (0.5 to 15).",
        },
      },
      required: ["name", "target", "duration"],
    },
  },
};

const pulseParamTool: ToolDefinition = {
  type: "function",
  function: {
    name: "pulse_param",
    description:
      "Create a temporary sinusoidal oscillation on a parameter. Adds rhythmic, breathing motion. Combine with any parameter for unique effects.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          enum: ALL_PARAM_NAMES,
          description: "Parameter name.",
        },
        amplitude: {
          type: "number",
          description: "Oscillation amplitude (0.01 to 0.5).",
        },
        period: {
          type: "number",
          description: "Oscillation period in seconds (0.5 to 8).",
        },
        duration: {
          type: "number",
          description: "How long the pulse lasts in seconds (1 to 20).",
        },
      },
      required: ["name", "amplitude", "period", "duration"],
    },
  },
};

// --- Level 3: Structural (low-level, scene control) ---

const transitionToTool: ToolDefinition = {
  type: "function",
  function: {
    name: "transition_to",
    description:
      "Trigger a crossfade transition to a different scene. Scenes auto-cycle fluidly, so only use this for dramatic shifts. Use 'outro' sparingly — it's a rare moment of dissolution and silence, not a regular phase.",
    parameters: {
      type: "object",
      properties: {
        scene_id: {
          type: "string",
          enum: ["intro", "build", "climax", "outro"],
          description: "intro=emergence/awakening, build=complexity/layering, climax=intensity/overwhelm, outro=dissolution/silence (rare, dramatic).",
        },
        duration: {
          type: "number",
          description: "Crossfade duration in seconds (1 to 8).",
        },
      },
      required: ["scene_id", "duration"],
    },
  },
};

const spawnParticlesTool: ToolDefinition = {
  type: "function",
  function: {
    name: "spawn_particles",
    description:
      "Create a burst of text particles. Use for emphasis, celebration, or overwhelming moments.",
    parameters: {
      type: "object",
      properties: {
        texts: {
          type: "array",
          items: { type: "string" },
          description: "Array of text strings to spawn as particles (1-8 items).",
        },
        kind: {
          type: "string",
          enum: ["voice", "echo", "whisper"],
          description: "Visual style for the particles.",
        },
      },
      required: ["texts"],
    },
  },
};

// --- Level 3+: GPU effects ---

const fireworkTool: ToolDefinition = {
  type: "function",
  function: {
    name: "firework",
    description: "Trigger a firework burst at a position. Creates bright particles that fall with gravity and fade.",
    parameters: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "X position in normalized coordinates [-1, 1].",
        },
        y: {
          type: "number",
          description: "Y position in normalized coordinates [-1, 1].",
        },
        intensity: {
          type: "number",
          description: "Intensity of the burst (0.1 to 2.0). Default 1.0.",
        },
      },
      required: ["x", "y"],
    },
  },
};

const sparkleTool: ToolDefinition = {
  type: "function",
  function: {
    name: "sparkle",
    description: "Create gentle ambient sparkles at a position. Use for magical moments or subtle effects.",
    parameters: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "X position in normalized coordinates [-1, 1].",
        },
        y: {
          type: "number",
          description: "Y position in normalized coordinates [-1, 1].",
        },
        count: {
          type: "number",
          description: "Number of sparkles (5 to 50). Default 10.",
        },
      },
      required: ["x", "y"],
    },
  },
};

const pokeSpringsTool: ToolDefinition = {
  type: "function",
  function: {
    name: "poke_springs",
    description: "Poke the spring mesh, causing it to jiggle and deform. Creates organic jello-like movement.",
    parameters: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "X position in normalized coordinates [-1, 1].",
        },
        y: {
          type: "number",
          description: "Y position in normalized coordinates [-1, 1].",
        },
        radius: {
          type: "number",
          description: "Radius of influence (0.1 to 1.0). Default 0.3.",
        },
        force: {
          type: "number",
          description: "Force strength (0.1 to 2.0). Default 0.5.",
        },
      },
      required: ["x", "y"],
    },
  },
};

// --- Level 3+: Preset combos (high-level named effects) ---

const applyPresetTool: ToolDefinition = {
  type: "function",
  function: {
    name: "apply_preset",
    description:
      `Apply a named visual preset — a curated combination of parameter changes that create a specific aesthetic. Each preset smoothly transitions multiple params at once.
Available presets:
- "noir": desaturated, high contrast, dark, grain
- "vaporwave": pink/cyan hue, high saturation, bloom, pixelate
- "glitch_art": glitch, aberration, edge, strobe
- "underwater": blue hue, low contrast, wobble, bloom
- "fire": red/orange hue, high intensity, warp, ridge
- "ice": cyan hue, low saturation, high contrast, cells
- "psychedelic": high saturation, spin, symmetry, warp, bloom
- "minimal": low intensity, no warp, no effects, clean
- "cosmic": purple hue, bloom, high octaves, zoom out
- "industrial": desaturated, ridge, grain, high contrast, edge
- "dream": soft bloom, gentle wobble, warm tones
- "nightmare": inverted, glitch, high speed, aberration
- "crystal": high contrast, cells, symmetry, cool hues
- "organic": high warp, warm tones, soft bloom
- "digital": pixelate, edge, glitch, high speed
- "zen": very slow, minimal effects, calm
- "storm": high speed, warp, strobe, aberration
- "aurora": green/blue hue, bloom, wobble
- "lava": red/orange hue, high warp, ridge
- "fireworks": warm burst colors, high contrast, dark sky + GPU firework bursts
- "jello": soft, wobbling spring mesh with pink/purple hues + interactive jello physics
- "cloth": fabric-like hanging mesh with blue tones, realistic cloth behavior + higher resolution
- "sparkle_field": cool blue/purple tones with ambient sparkle particles across screen
- "electric_storm": high energy, strobing, with electric particle bursts + jiggling spring mesh

Word presets - dramatic scene titles with matching visual themes:
- Intro words: "emergence", "genesis", "the_void_stirs", "first_light", "awakening", "from_nothing", "signal", "origin"
- Build words: "complexity", "the_pattern_grows", "deep_structure", "convergence", "lattice", "unfolding", "tessellation"  
- Climax words: "rupture", "supernova", "the_storm", "critical_mass", "detonation", "singularity", "overload", "ignition"
- Outro words: "dissolution", "ash", "the_long_fade", "entropy", "remnant", "afterglow", "silence", "return"
- "void": extreme zoom, spin, warp, darkobe, vivid color, zoomed out, fast, warm bursts
- "void": near-zero intensity, invert, slow, dark
- "reset": return all params to defaults`,
    parameters: {
      type: "object",
      properties: {
        preset: {
          type: "string",
          enum: [
            "noir", "vaporwave", "glitch_art", "underwater", "fire", "ice",
            "psychedelic", "minimal", "cosmic", "industrial", "dream", "nightmare",
            "crystal", "organic", "digital", "zen", "storm", "aurora", "lava", 
            "fireworks", "jello", "cloth", "sparkle_field", "electric_storm",
            "emergence", "genesis", "the_void_stirs", "first_light", "awakening", "from_nothing", "signal", "origin",
            "complexity", "the_pattern_grows", "deep_structure", "convergence", "lattice", "unfolding", "tessellation",
            "rupture", "supernova", "the_storm", "critical_mass", "detonation", "singularity", "overload", "ignition",
            "dissolution", "ash", "the_long_fade", "entropy", "remnant", "afterglow", "silence", "return",
            "void", "reset",
          ],
          description: "The preset to apply.",
        },
        intensity_scale: {
          type: "number",
          description: "Optional scale factor 0.1-2.0 for how strongly to apply the preset (default 1.0).",
        },
      },
      required: ["preset"],
    },
  },
};

// --- Export all tools ---

/** Full tool set (legacy — includes speak/whisper for single-LLM mode). */
export const ALL_TOOLS: ToolDefinition[] = [
  // Level 1: Poetic
  speakTool,
  shiftMoodTool,
  whisperTool,
  // Level 2: Parametric
  setParamTool,
  driftParamTool,
  pulseParamTool,
  // Level 3: Structural
  transitionToTool,
  spawnParticlesTool,
  // Level 3+: GPU effects
  fireworkTool,
  sparkleTool,
  pokeSpringsTool,
  // Preset combos
  applyPresetTool,
];

/** Engine-only tools for the Director in dual-LLM mode (no speak/whisper — Poet handles words). */
export const ENGINE_TOOLS: ToolDefinition[] = [
  shiftMoodTool,
  setParamTool,
  driftParamTool,
  pulseParamTool,
  transitionToTool,
  spawnParticlesTool,
  // GPU effects
  fireworkTool,
  sparkleTool,
  pokeSpringsTool,
  // Preset combos
  applyPresetTool,
];

// --- Feeling → parameter mapping for shift_mood ---

export const MOOD_MAPPINGS: Record<string, Record<string, { target: number; duration: number }>> = {
  warmer:     { hue: { target: 0.08, duration: 1.5 }, warmth: { target: 0.7, duration: 1.5 }, intensity: { target: 0.7, duration: 1.5 } },
  cooler:     { hue: { target: 0.55, duration: 1.5 }, warmth: { target: -0.6, duration: 1.5 }, intensity: { target: 0.4, duration: 2 } },
  darker:     { intensity: { target: 0.15, duration: 2 }, speed: { target: 0.5, duration: 2 }, gamma: { target: 1.8, duration: 2 } },
  brighter:   { intensity: { target: 0.85, duration: 1.5 }, bloom: { target: 0.8, duration: 1.5 }, gamma: { target: 0.7, duration: 1.5 } },
  faster:     { speed: { target: 3.0, duration: 1 }, intensity: { target: 0.7, duration: 1.5 } },
  slower:     { speed: { target: 0.3, duration: 2 }, intensity: { target: 0.35, duration: 2 } },
  deeper:     { hue: { target: 0.75, duration: 2 }, speed: { target: 0.6, duration: 2 }, warp: { target: 1.5, duration: 2 }, zoom: { target: 1.8, duration: 3 } },
  lighter:    { intensity: { target: 0.9, duration: 1.5 }, saturation: { target: 0.6, duration: 2 }, bloom: { target: 0.5, duration: 2 } },
  chaotic:    { speed: { target: 3.5, duration: 0.8 }, intensity: { target: 0.9, duration: 0.8 }, warp: { target: 2.0, duration: 1 }, glitch: { target: 0.4, duration: 1 } },
  calm:       { speed: { target: 0.4, duration: 2 }, intensity: { target: 0.3, duration: 2 }, warp: { target: 0.2, duration: 3 }, glitch: { target: 0, duration: 1 }, strobe: { target: 0, duration: 1 } },
  electric:   { hue: { target: 0.6, duration: 1 }, intensity: { target: 0.95, duration: 0.8 }, speed: { target: 2.5, duration: 1 }, aberration: { target: 0.5, duration: 1 }, bloom: { target: 1.0, duration: 1 } },
  dissolving: { intensity: { target: 0.1, duration: 3 }, speed: { target: 0.2, duration: 3 }, grain: { target: 0.5, duration: 3 }, warp: { target: 0.1, duration: 4 } },
};
