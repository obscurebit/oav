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
          enum: ["intensity", "speed", "hue"],
          description: "Parameter name.",
        },
        value: {
          type: "number",
          description: "Target value. intensity: 0-1, speed: 0.1-4.0, hue: 0-1 (0=red, 0.3=green, 0.6=blue, 0.8=purple).",
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
      "Smoothly transition a parameter to a target value over a duration. Creates organic, gradual changes.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          enum: ["intensity", "speed", "hue"],
          description: "Parameter name.",
        },
        target: {
          type: "number",
          description: "Target value to drift toward.",
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
      "Create a temporary sinusoidal oscillation on a parameter. Adds rhythmic, breathing motion.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          enum: ["intensity", "speed", "hue"],
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
      "Trigger a crossfade transition to a different scene. Use when the moment calls for a dramatic shift.",
    parameters: {
      type: "object",
      properties: {
        scene_id: {
          type: "string",
          enum: ["intro", "build", "climax", "outro"],
          description: "The scene to transition to.",
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

// --- Export all tools ---

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
];

// --- Feeling → parameter mapping for shift_mood ---

export const MOOD_MAPPINGS: Record<string, Record<string, { target: number; duration: number }>> = {
  warmer:     { hue: { target: 0.08, duration: 4 }, intensity: { target: 0.7, duration: 3 } },
  cooler:     { hue: { target: 0.55, duration: 4 }, intensity: { target: 0.4, duration: 3 } },
  darker:     { intensity: { target: 0.15, duration: 5 }, speed: { target: 0.5, duration: 4 } },
  brighter:   { intensity: { target: 0.85, duration: 3 }, hue: { target: 0.15, duration: 4 } },
  faster:     { speed: { target: 3.0, duration: 2 }, intensity: { target: 0.7, duration: 2 } },
  slower:     { speed: { target: 0.3, duration: 4 }, intensity: { target: 0.35, duration: 5 } },
  deeper:     { hue: { target: 0.75, duration: 5 }, speed: { target: 0.6, duration: 4 }, intensity: { target: 0.5, duration: 4 } },
  lighter:    { intensity: { target: 0.9, duration: 3 }, speed: { target: 1.5, duration: 3 }, hue: { target: 0.2, duration: 3 } },
  chaotic:    { speed: { target: 3.5, duration: 1 }, intensity: { target: 0.9, duration: 1 } },
  calm:       { speed: { target: 0.4, duration: 6 }, intensity: { target: 0.3, duration: 6 } },
  electric:   { hue: { target: 0.6, duration: 1.5 }, intensity: { target: 0.95, duration: 1 }, speed: { target: 2.5, duration: 1.5 } },
  dissolving: { intensity: { target: 0.1, duration: 8 }, speed: { target: 0.2, duration: 8 }, hue: { target: 0.8, duration: 6 } },
};
