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

// --- Level 3: Musical (dynamic score generation) ---

const composeMusicTool: ToolDefinition = {
  type: "function",
  function: {
    name: "compose_music",
    description: "Generate a dynamic musical phrase that matches the current visual mood and intensity. The LLM can specify mood (peaceful, intense, mysterious, happy, dramatic, neutral) and intensity (0-1) to control the musical character.",
    parameters: {
      type: "object",
      properties: {
        mood: {
          type: "string",
          description: "Musical mood: peaceful, intense, mysterious, happy, dramatic, neutral",
          enum: ["peaceful", "intense", "mysterious", "happy", "dramatic", "neutral"],
        },
        intensity: {
          type: "number",
          description: "Musical intensity [0-1] - affects note density and dynamics",
          minimum: 0,
          maximum: 1,
        },
        duration: {
          type: "number",
          description: "Phrase duration in beats [4-32]",
          minimum: 4,
          maximum: 32,
        },
      },
      required: ["mood"],
    },
  },
};

const setMusicTempoTool: ToolDefinition = {
  type: "function",
  function: {
    name: "set_music_tempo",
    description: "Change the musical tempo in BPM. Affects the speed of the music generation.",
    parameters: {
      type: "object",
      properties: {
        tempo: {
          type: "number",
          description: "Tempo in BPM [60-180]",
          minimum: 60,
          maximum: 180,
        },
      },
      required: ["tempo"],
    },
  },
};

const setMusicKeyTool: ToolDefinition = {
  type: "function",
  function: {
    name: "set_music_key",
    description: "Change the musical key (C, D, E, F, G, A, B). Affects the tonal center of the music.",
    parameters: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Musical key: C, D, E, F, G, A, B",
          enum: ["C", "D", "E", "F", "G", "A", "B"],
        },
      },
      required: ["key"],
    },
  },
};

const setMusicMoodTool: ToolDefinition = {
  type: "function",
  function: {
    name: "set_music_mood",
    description: "Change the musical mood and harmonic complexity. Affects chord progressions and note choices.",
    parameters: {
      type: "object",
      properties: {
        mood: {
          type: "string",
          description: "Musical mood: peaceful, intense, mysterious, happy, dramatic, neutral",
          enum: ["peaceful", "intense", "mysterious", "happy", "dramatic", "neutral"],
        },
        harmony: {
          type: "number",
          description: "Harmonic complexity [0-1] - affects chord richness",
          minimum: 0,
          maximum: 1,
        },
        complexity: {
          type: "number",
          description: "Note density and melodic complexity [0-1]",
          minimum: 0.1,
          maximum: 1.0,
        },
      },
      required: ["mood"],
    },
  },
};

const triggerMusicSFXTool: ToolDefinition = {
  type: "function",
  function: {
    name: "trigger_music_sfx",
    description: "Trigger a musical sound effect based on simulation events. Available types: beat, transition, explosion, glitch, ambient.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "SFX type: beat, transition, explosion, glitch, ambient",
          enum: ["beat", "transition", "explosion", "glitch", "ambient"],
        },
        intensity: {
          type: "number",
          description: "SFX intensity [0-1]",
          minimum: 0,
          maximum: 1,
        },
      },
      required: ["type"],
    },
  },
};

// --- All controllable parameter names ---
export const ALL_PARAM_NAMES = [
  // Core
  "intensity", "speed", "hue",
  // Color & Tone
  "saturation", "contrast", "warmth", "gamma", "invert",
  // Color Palette
  "hue2", "hue3", "color_split", "palette_shift",
  // Geometry & Space
  "zoom", "rotation", "symmetry", "mirror_x", "mirror_y",
  // Pattern & Texture
  "warp", "noise_scale", "octaves", "lacunarity",
  "grain", "pixelate", "edge", "ridge", "cells",
  // Motion & Animation
  "drift_x", "drift_y", "spin", "wobble", "strobe",
  // Post-processing
  "bloom", "vignette", "aberration", "glitch", "feedback",
  // Special Modes
  "fire_mode",
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

// --- Level 3: Musical (dynamic score generation) ---

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

const enhancedFireworkTool: ToolDefinition = {
  type: "function",
  function: {
    name: "enhanced_firework",
    description: "Create a professional firework display with multiple stages, trails, and sparkles. Choose from chrysanthemum (classic burst), willow (long falling trails), palm (vertical burst), crossette (multiple explosions), or salute (bright flash).",
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
        type: {
          type: "string",
          description: "Firework type: chrysanthemum, willow, palm, crossette, salute",
          enum: ["chrysanthemum", "willow", "palm", "crossette", "salute"],
        },
        color: {
          type: "string",
          description: "Firework color: red, blue, green, gold, purple, white, rainbow",
          enum: ["red", "blue", "green", "gold", "purple", "white", "rainbow"],
        },
        intensity: {
          type: "number",
          description: "Firework intensity [0.1-2.0]. Default 1.0.",
          minimum: 0.1,
          maximum: 2.0,
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

🎨 VISUAL PRESETS (with matching audio):\n🔥 INTENSE/ENERGETIC:
- "fire": hot, intense, high energy, aggressive, passionate (matching intense audio)
- "lightning": electrical, intense, dramatic, powerful, stormy (matching intense audio)
- "storm": turbulent, intense, chaotic, aggressive, energetic (matching intense audio)
- "nightmare": distorted, aggressive, dark, unsettling, intense (matching intense audio)
- "electric_storm": high energy, strobing, electric, chaotic, intense (matching intense audio)

❄️ COLD/COOL:
- "ice": cold, icy, crystalline, sharp, minimalist, clean (matching cool audio)
- "aurora": atmospheric, flowing, cool, ethereal, gentle (matching peaceful audio)
- "crystal": clear, bright, geometric, structured, clean (matching clear audio)
- "underwater": flowing, muffled, cool, deep, mysterious (matching mysterious audio)

🌊 WARM/ORGANIC:
- "lava": hot, flowing, organic, intense, volcanic (matching intense audio)
- "organic": natural, flowing, warm, textured, alive (matching warm audio)
- "dream": soft, gentle, warm, ethereal, peaceful (matching gentle audio)

🌌 PSYCHEDELIC/ABSTRACT:
- "psychedelic": trippy, resonant, colorful, warped, surreal (matching trippy audio)
- "vaporwave": nostalgic, dreamy, synthetic, retro, cool (matching dreamy audio)
- "glitch_art": distorted, digital, chaotic, noisy, broken (matching chaotic audio)
- "cosmic": spacious, ethereal, vast, mysterious, otherworldly (matching ethereal audio)

🏙️ INDUSTRIAL/MECHANICAL:
- "industrial": mechanical, harsh, metallic, structured, gritty (matching harsh audio)
- "digital": electronic, sharp, pixelated, clean, modern (matching technical audio)
- "minimal": clean, simple, restrained, quiet, focused (matching calm audio)
- "noir": dark, moody, cinematic, dramatic, mysterious (matching moody audio)

🧘 PEACEFUL/CALM:
- "zen": peaceful, calm, meditative, slow, balanced (matching serene audio)
- "minimal": clean, simple, restrained, quiet, focused (matching calm audio)
- "dream": soft, gentle, warm, ethereal, peaceful (matching peaceful audio)
- "aurora": atmospheric, flowing, cool, ethereal, gentle (matching peaceful audio)

🎭 DRAMATIC/CINEMATIC:
- "noir": dark, moody, cinematic, dramatic, mysterious (matching dramatic audio)
- "lightning": electrical, intense, dramatic, powerful, stormy (matching intense audio)
- "fireworks": celebratory, bright, explosive, joyful, festive (matching joyful audio)
- "nightmare": distorted, aggressive, dark, unsettling, intense (matching intense audio)

💡 Each preset includes matching audio atmosphere. Use apply_preset for complete audiovisual experiences.\n\n🎯 CONTEXT AWARENESS: This tool changes both visual and audio parameters simultaneously. Consider the current emotional state and typing activity when choosing a preset.`,
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

// --- Audio-only preset tool ---

const applyAudioPresetTool: ToolDefinition = {
  type: "function",
  function: {
    name: "apply_audio_preset",
    description:
      `Apply a named typing audio preset — curated audio parameter combinations that create specific typing sound atmospheres. These affect ONLY typing sounds and clear ambient audio layers.

🎹 TYPING PRESETS (rhythm, noise, percussive):
- "morse_code": rhythmic beeps like morse code (high frequency, rhythmic)
- "typewriter": mechanical typewriter clicks (noisy, percussive)
- "subtle_beat": gentle background rhythm (soft, warm)
- "impact_beat": strong percussive hits (powerful, rhythmic)
- "static_hiss": continuous static noise (noisy, ambient)
- "static_beat": static with rhythmic pulses (noisy, rhythmic)
- "loud_static_beep": piercing static beeps (harsh, high energy)
- "quiet_static_beep": soft background static beeps (gentle, ambient)
- "raindrops": gentle raindrop sounds (soft, natural)

🎹 LEGACY AMBIENT PRESETS (also available but better with apply_ambient_audio_preset):
- "noir", "vaporwave", "glitch_art", "underwater", "fire", "ice",
- "psychedelic", "minimal", "cosmic", "industrial", "dream", "nightmare",
- "crystal", "organic", "digital", "zen", "storm", "aurora", "lava"

💡 Use this for typing atmospheres. Use apply_ambient_audio_preset for mood setting.\n\n🎯 CONTEXT AWARENESS: This tool clears all ambient audio layers to focus purely on typing sounds. Consider the current visual mood when choosing a typing preset.`,
    parameters: {
      type: "object",
      properties: {
        preset: {
          type: "string",
          enum: [
            "morse_code", "typewriter", "subtle_beat", "impact_beat", "static_hiss", 
            "static_beat", "loud_static_beep", "quiet_static_beep", "raindrops",
            "noir", "vaporwave", "glitch_art", "underwater", "fire", "ice",
            "psychedelic", "minimal", "cosmic", "industrial", "dream", "nightmare",
            "crystal", "organic", "digital", "zen", "storm", "aurora", "lava"
          ],
          description: "The audio preset to apply.",
        },
        intensity_scale: {
          type: "number",
          description: "Optional scale factor 0.1-2.0 for how strongly to apply the audio preset (default 1.0).",
        },
      },
      required: ["preset"],
    },
  },
};

// --- Ambient audio preset tool ---

const applyAmbientAudioPresetTool: ToolDefinition = {
  type: "function",
  function: {
    name: "apply_ambient_audio_preset",
    description:
      `Apply a named ambient audio preset — curated atmospheric soundscapes that set the overall mood. These focus on traditional audio parameters (sub bass, harmonics, pads, reverb) without typing-specific effects.

🎵 AMBIENT PRESETS (atmospheric soundscapes):
- "noir": dark, moody atmosphere
- "vaporwave": dreamy, nostalgic atmosphere
- "glitch_art": distorted, glitchy atmosphere
- "underwater": flowing, muffled atmosphere
- "fire": hot, intense atmosphere
- "ice": cold, icy atmosphere
- "psychedelic": trippy, resonant atmosphere
- "minimal": clean, minimal atmosphere
- "cosmic": spacious, ethereal atmosphere
- "industrial": mechanical, harsh atmosphere
- "dream": soft, gentle atmosphere
- "nightmare": distorted, aggressive atmosphere
- "crystal": clear, bright atmosphere
- "organic": natural, flowing atmosphere
- "digital": electronic, sharp atmosphere
- "zen": peaceful, calm atmosphere
- "storm": turbulent, intense atmosphere
- "aurora": atmospheric, flowing atmosphere
- "lava": hot, intense atmosphere

💡 Use this for mood setting. Use apply_audio_preset for typing sounds.\n\n🎯 CONTEXT AWARENESS: This tool sets the foundational audio atmosphere. Consider current visual mood and typing activity when choosing an ambient preset.`,
    parameters: {
      type: "object",
      properties: {
        preset: {
          type: "string",
          enum: [
            "noir", "vaporwave", "glitch_art", "underwater", "fire", "ice",
            "psychedelic", "minimal", "cosmic", "industrial", "dream", "nightmare",
            "crystal", "organic", "digital", "zen", "storm", "aurora", "lava"
          ],
          description: "The ambient audio preset to apply.",
        },
        intensity_scale: {
          type: "number",
          description: "Optional scale factor 0.1-2.0 for how strongly to apply the ambient preset (default 1.0).",
        },
      },
      required: ["preset"],
    },
  },
};

// --- Audio preset listing tool ---

const listAudioPresetsTool: ToolDefinition = {
  type: "function",
  function: {
    name: "list_audio_presets",
    description:
      `List all available audio presets with their descriptions. Use this to discover typing and ambient audio options.

Returns a comprehensive list of:
🎹 TYPING PRESETS (apply_audio_preset):
- morse_code, typewriter, subtle_beat, impact_beat, static_hiss, static_beat, loud_static_beep, quiet_static_beep, raindrops

🎵 AMBIENT PRESETS (apply_ambient_audio_preset):
- noir, vaporwave, glitch_art, underwater, fire, ice, psychedelic, minimal, cosmic, industrial, dream, nightmare, crystal, organic, digital, zen, storm, aurora, lava

🎨 VISUAL+AUDIO PRESETS (apply_preset):
- All visual presets with matching audio atmospheres`,
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

// --- Visual preset listing tool ---

const listVisualPresetsTool: ToolDefinition = {
  type: "function",
  function: {
    name: "list_visual_presets",
    description:
      `List all available visual presets with descriptive tags and mood indicators. Use this to discover visual styles that match the current emotional state.

🎨 VISUAL PRESETS (apply_preset):
🔥 INTENSE/ENERGETIC:
- "fire": hot, intense, high energy, aggressive, passionate
- "lightning": electrical, intense, dramatic, powerful, stormy
- "storm": turbulent, intense, chaotic, aggressive, energetic
- "nightmare": distorted, aggressive, dark, unsettling, intense
- "electric_storm": high energy, strobing, electric, chaotic, intense

❄️ COLD/COOL:
- "ice": cold, icy, crystalline, sharp, minimalist, clean
- "aurora": atmospheric, flowing, cool, ethereal, gentle
- "crystal": clear, bright, geometric, structured, clean
- "underwater": flowing, muffled, cool, deep, mysterious

🌊 WARM/ORGANIC:
- "lava": hot, flowing, organic, intense, volcanic
- "fire": hot, intense, warm, energetic, passionate
- "organic": natural, flowing, warm, textured, alive
- "dream": soft, gentle, warm, ethereal, peaceful

🌌 PSYCHEDELIC/ABSTRACT:
- "psychedelic": trippy, resonant, colorful, warped, surreal
- "vaporwave": nostalgic, dreamy, synthetic, retro, cool
- "glitch_art": distorted, digital, chaotic, noisy, broken
- "cosmic": spacious, ethereal, vast, mysterious, otherworldly

🏙️ INDUSTRIAL/MECHANICAL:
- "industrial": mechanical, harsh, metallic, structured, gritty
- "digital": electronic, sharp, pixelated, clean, modern
- "minimal": clean, simple, restrained, quiet, focused
- "noir": dark, moody, cinematic, dramatic, mysterious

🧘 PEACEFUL/CALM:
- "zen": peaceful, calm, meditative, slow, balanced
- "minimal": clean, simple, restrained, quiet, focused
- "dream": soft, gentle, warm, ethereal, peaceful
- "aurora": atmospheric, flowing, cool, ethereal, gentle

🎭 DRAMATIC/CINEMATIC:
- "noir": dark, moody, cinematic, dramatic, mysterious
- "lightning": electrical, intense, dramatic, powerful, stormy
- "fireworks": celebratory, bright, explosive, joyful, festive
- "nightmare": distorted, aggressive, dark, unsettling, intense

💡 Tags help match presets to emotional states. Use apply_preset to apply both visual and matching audio.`,
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

// --- Lofi Music Tools ---

const playLofiTrackTool: ToolDefinition = {
  type: "function",
  function: {
    name: "play_lofi_track",
    description: "Play a lofi music track by ID. Use this to set the background music atmosphere.",
    parameters: {
      type: "object",
      properties: {
        track_id: {
          type: "string",
          description: "ID of the lofi track to play (e.g., 'rainy-study', 'midnight-coffee', 'dream-waves', 'nostalgic-beats', 'upbeat-morning')",
        },
      },
      required: ["track_id"],
    },
  },
};

const crossfadeLofiTrackTool: ToolDefinition = {
  type: "function",
  function: {
    name: "crossfade_lofi_track",
    description: "Smoothly crossfade to a new lofi track. Use this for seamless music transitions.",
    parameters: {
      type: "object",
      properties: {
        track_id: {
          type: "string",
          description: "ID of the lofi track to crossfade to",
        },
        duration: {
          type: "number",
          description: "Crossfade duration in seconds (default: 2)",
        },
      },
      required: ["track_id"],
    },
  },
};

const stopLofiTool: ToolDefinition = {
  type: "function",
  function: {
    name: "stop_lofi",
    description: "Stop lofi music playback. Use this to create silence or transition to no music.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

const setLofiVolumeTool: ToolDefinition = {
  type: "function",
  function: {
    name: "set_lofi_volume",
    description: "Set the volume of lofi music (0.0 to 1.0). Use this to adjust music intensity.",
    parameters: {
      type: "object",
      properties: {
        volume: {
          type: "number",
          description: "Volume level from 0.0 (silent) to 1.0 (full volume)",
        },
      },
      required: ["volume"],
    },
  },
};

const enableLofiTool: ToolDefinition = {
  type: "function",
  function: {
    name: "enable_lofi",
    description: "Enable or disable lofi music system. Use this to turn music on/off.",
    parameters: {
      type: "object",
      properties: {
        enabled: {
          type: "boolean",
          description: "True to enable lofi music, false to disable",
        },
      },
      required: ["enabled"],
    },
  },
};

const listLofiTracksTool: ToolDefinition = {
  type: "function",
  function: {
    name: "list_lofi_tracks",
    description: "List all available lofi tracks with their descriptions and moods. Use this to discover music options.",
    parameters: {
      type: "object",
      properties: {},
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
  // Level 3: Musical (dynamic score generation)
  composeMusicTool,
  setMusicTempoTool,
  setMusicKeyTool,
  setMusicMoodTool,
  triggerMusicSFXTool,
  // Level 3+: GPU effects
  fireworkTool,
  sparkleTool,
  pokeSpringsTool,
  enhancedFireworkTool,
  // Preset combos
  applyPresetTool,
  applyAudioPresetTool,
  applyAmbientAudioPresetTool,
  listAudioPresetsTool,
  listVisualPresetsTool,
  // Lofi music controls
  playLofiTrackTool,
  crossfadeLofiTrackTool,
  stopLofiTool,
  setLofiVolumeTool,
  enableLofiTool,
  listLofiTracksTool,
];

/** Engine-only tools for the Director in dual-LLM mode (no speak/whisper — Poet handles words). */
export const ENGINE_TOOLS: ToolDefinition[] = [
  shiftMoodTool,
  setParamTool,
  driftParamTool,
  pulseParamTool,
  transitionToTool,
  spawnParticlesTool,
  // Level 3: Musical (dynamic score generation)
  composeMusicTool,
  setMusicTempoTool,
  setMusicKeyTool,
  setMusicMoodTool,
  triggerMusicSFXTool,
  // Level 3+: GPU effects
  fireworkTool,
  sparkleTool,
  pokeSpringsTool,
  enhancedFireworkTool,
  // Preset combos
  applyPresetTool,
  applyAudioPresetTool,
  applyAmbientAudioPresetTool,
  listAudioPresetsTool,
  listVisualPresetsTool,
  // Lofi music controls
  playLofiTrackTool,
  crossfadeLofiTrackTool,
  stopLofiTool,
  setLofiVolumeTool,
  enableLofiTool,
  listLofiTracksTool,
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
