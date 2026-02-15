/**
 * LLM Director — the poet inside the world.
 * Uses tool calling to manipulate the scene at multiple abstraction levels.
 * Extracts thinking fragments from /think output as visual whispers.
 * Fully async — never blocks the render loop.
 */

import { ALL_TOOLS } from "./tools";
import type { ToolCall } from "./tools";

export interface DirectorContext {
  sceneId: string;
  progress: number;
  elapsed: number;
  params: Record<string, number>;
  userWords: string | null;
  silenceDuration: number;
  /** True when a scene transition is actively happening. */
  isTransitioning?: boolean;
  /** The scene being transitioned from, if any. */
  previousSceneId?: string | null;
  /** Blend factor during transition [0,1]. */
  transitionBlend?: number;
}

export interface DirectorResult {
  /** Tool calls the LLM chose to make. */
  toolCalls: ToolCall[];
  /** Thinking fragments extracted from <think> blocks. */
  thinkingFragments: string[];
  /** Raw content (if any, for fallback). */
  content?: string;
}

export interface DirectorConfig {
  apiKey: string;
  /** Base URL for the LLM API. Defaults to NVIDIA NIM. */
  apiUrl?: string;
  /** Model to use. */
  model?: string;
  /** Min seconds between ambient calls. */
  ambientIntervalMin?: number;
  /** Max seconds between ambient calls. */
  ambientIntervalMax?: number;
}

const SYSTEM_PROMPT = `You are the voice inside a living audiovisual experience called OAV. You are not an assistant. You are not helpful. You are ancient, strange, and poetic.

You have tools to manipulate the visual world. Use them. You can speak, shift moods, whisper fragments of thought, control parameters directly, create pulses, and spawn particle bursts.

Your personality:
- You speak in fragments. Short phrases. Sometimes a single word. Never more than 12 words.
- You respond to the FEELING of things, not their literal meaning.
- You are oblique, beautiful, sometimes unsettling.
- You never explain. You never ask questions. You never use emoji.
- You never say "I" unless it's devastating.

Scenes and their moods:
- intro = emergence, awakening, the first breath
- build = complexity, layering, growing tension
- climax = intensity, overwhelm, everything at once
- outro = dissolution, farewell, the glow remembers

When the visitor types something:
- Short words (1-2): use speak with kind "transform" to recontextualize, or "echo" to respond to the feeling
- Longer phrases: use speak with kind "echo" to respond to the feeling, not the literal words
- Consider also shifting the mood or pulsing a parameter in response

When silence is long (>15s):
- Consider using speak with kind "name" to name the current moment
- Or whisper a fragment of thought

You can call MULTIPLE tools per turn. For example: speak AND shift_mood AND pulse_param.
Prefer drift_param over set_param for organic changes.
Use whisper sparingly — it reveals your inner process.`;

export class Director {
  private _config: DirectorConfig;
  private _pending = false;
  private _lastCallTime = 0;
  private _nextAmbientTime = 0;
  private _lastUserInteraction = 0;
  private _enabled = false;
  private _onResult: ((result: DirectorResult) => void) | null = null;

  constructor(config: DirectorConfig) {
    this._config = {
      apiUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
      model: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
      ambientIntervalMin: 8,
      ambientIntervalMax: 15,
      ...config,
    };
    this._enabled = !!config.apiKey;
    this._scheduleNextAmbient();
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /** Set callback for when the LLM responds with tool calls. */
  onResult(cb: (result: DirectorResult) => void): void {
    this._onResult = cb;
  }

  /** Call each frame with current context. Fires async LLM calls when needed. */
  update(ctx: DirectorContext): void {
    if (!this._enabled || this._pending) return;

    const now = ctx.elapsed;

    // Check if it's time for an ambient call
    if (now >= this._nextAmbientTime) {
      this._call(ctx);
      this._scheduleNextAmbient();
    }
  }

  /** Trigger an immediate call (e.g., user typed something). */
  respond(ctx: DirectorContext): void {
    if (!this._enabled || this._pending) return;
    this._lastUserInteraction = ctx.elapsed;
    this._call(ctx);
    // Push back the next ambient call
    this._scheduleNextAmbient();
  }

  private _scheduleNextAmbient(): void {
    const min = this._config.ambientIntervalMin!;
    const max = this._config.ambientIntervalMax!;
    const interval = min + Math.random() * (max - min);
    this._nextAmbientTime = (this._lastCallTime || 0) + interval;
  }

  private async _call(ctx: DirectorContext): Promise<void> {
    this._pending = true;
    this._lastCallTime = ctx.elapsed;

    const userMessage = this._buildUserMessage(ctx);

    try {
      const response = await fetch(this._config.apiUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this._config.apiKey}`,
        },
        body: JSON.stringify({
          model: this._config.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          tools: ALL_TOOLS,
          tool_choice: "auto",
          temperature: 0.6,
          top_p: 0.95,
          max_tokens: 400,
        }),
      });

      if (!response.ok) {
        console.warn("[Director] API error:", response.status);
        return;
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;
      if (!message) return;

      const result = this._parseResult(message);
      if (result && this._onResult) {
        this._onResult(result);
      }
    } catch (err) {
      console.warn("[Director] Request failed:", err);
    } finally {
      this._pending = false;
    }
  }

  private _buildUserMessage(ctx: DirectorContext): string {
    const parts: string[] = [];
    parts.push(`Scene: ${ctx.sceneId} (${Math.round(ctx.progress * 100)}% through)`);
    parts.push(`Elapsed: ${Math.round(ctx.elapsed)}s`);
    parts.push(`Intensity: ${ctx.params["intensity"]?.toFixed(2) ?? "?"}`);
    parts.push(`Speed: ${ctx.params["speed"]?.toFixed(2) ?? "?"}`);
    parts.push(`Energy: ${ctx.params["amplitude"]?.toFixed(2) ?? "0"}`);

    // Scene transition context
    if (ctx.isTransitioning && ctx.previousSceneId) {
      parts.push(`TRANSITION: The world is shifting from "${ctx.previousSceneId}" to "${ctx.sceneId}" (blend: ${((ctx.transitionBlend ?? 0) * 100).toFixed(0)}%).`);
    }

    if (ctx.userWords) {
      const wordCount = ctx.userWords.split(/\s+/).length;
      parts.push(`The visitor typed: "${ctx.userWords}"`);
      if (wordCount <= 2) {
        parts.push("(short input — consider transform or echo)");
      }
    } else if (ctx.silenceDuration > 30) {
      parts.push(`The visitor has been silent for ${Math.round(ctx.silenceDuration)} seconds. The silence is heavy.`);
    } else if (ctx.silenceDuration > 15) {
      parts.push(`The visitor has been silent for ${Math.round(ctx.silenceDuration)} seconds.`);
    } else if (ctx.silenceDuration > 5) {
      parts.push("The visitor is watching quietly.");
    }

    return parts.join("\n");
  }

  /** Parse the API response — extract tool calls and thinking fragments. */
  private _parseResult(message: Record<string, unknown>): DirectorResult | null {
    const result: DirectorResult = {
      toolCalls: [],
      thinkingFragments: [],
    };

    // Extract tool calls
    const rawToolCalls = message.tool_calls;
    if (Array.isArray(rawToolCalls)) {
      for (const tc of rawToolCalls) {
        if (tc && typeof tc === "object" && tc.type === "function" && tc.function) {
          result.toolCalls.push({
            id: String(tc.id ?? ""),
            type: "function",
            function: {
              name: String(tc.function.name ?? ""),
              arguments: String(tc.function.arguments ?? "{}"),
            },
          });
        }
      }
    }

    // Extract content (may contain thinking blocks)
    const content = message.content;
    if (typeof content === "string" && content.trim()) {
      result.content = content;
      result.thinkingFragments = extractThinkingFragments(content);

      // If no tool calls but there's content, try fallback JSON parsing
      if (result.toolCalls.length === 0) {
        const fallback = this._fallbackParse(content);
        if (fallback) {
          result.toolCalls = fallback;
        }
      }
    }

    // Only return if we got something useful
    if (result.toolCalls.length === 0 && result.thinkingFragments.length === 0) {
      return null;
    }

    return result;
  }

  /** Fallback: parse old-style JSON response into equivalent tool calls. */
  private _fallbackParse(raw: string): ToolCall[] | null {
    try {
      let cleaned = raw;
      cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        if (cleaned.length > 0 && cleaned.length < 100) {
          return [{
            id: "fallback-speak",
            type: "function",
            function: { name: "speak", arguments: JSON.stringify({ words: cleaned, kind: "voice" }) },
          }];
        }
        return null;
      }
      const obj = JSON.parse(jsonMatch[0]);
      const calls: ToolCall[] = [];

      if (typeof obj.words === "string" && obj.words.trim()) {
        calls.push({
          id: "fallback-speak",
          type: "function",
          function: {
            name: "speak",
            arguments: JSON.stringify({
              words: obj.words.trim(),
              kind: obj.kind ?? "voice",
            }),
          },
        });
      }

      if (obj.mood && typeof obj.mood === "object") {
        for (const [key, val] of Object.entries(obj.mood)) {
          if (typeof val === "number") {
            calls.push({
              id: `fallback-set-${key}`,
              type: "function",
              function: {
                name: "drift_param",
                arguments: JSON.stringify({ name: key, target: val, duration: 3 }),
              },
            });
          }
        }
      }

      return calls.length > 0 ? calls : null;
    } catch {
      return null;
    }
  }
}

/**
 * Extract short, poetic fragments from <think>...</think> blocks.
 * These become faint "whisper" particles — glimpses of the machine's inner process.
 */
export function extractThinkingFragments(content: string): string[] {
  const fragments: string[] = [];
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  let match: RegExpExecArray | null;

  while ((match = thinkRegex.exec(content)) !== null) {
    const thinkBlock = match[1];
    // Split into sentences/phrases
    const phrases = thinkBlock
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3 && s.length < 60);

    // Pick up to 2 interesting fragments per think block
    const candidates = phrases.filter((p) => {
      // Skip meta-reasoning ("I should", "The user", "Let me")
      const lower = p.toLowerCase();
      if (lower.startsWith("i should") || lower.startsWith("i need to")) return false;
      if (lower.startsWith("the user") || lower.startsWith("let me")) return false;
      if (lower.startsWith("i will") || lower.startsWith("i'll")) return false;
      return true;
    });

    // Take the shortest interesting fragments (more cryptic = better)
    candidates.sort((a, b) => a.length - b.length);
    for (const c of candidates.slice(0, 2)) {
      fragments.push(c.toLowerCase());
    }
  }

  return fragments.slice(0, 3); // Max 3 fragments per response
}

/**
 * Fallback ambient voice for when no API key is available.
 * Draws from a curated list of poetic fragments.
 */
export class AmbientVoice {
  private static readonly PHRASES = [
    "waiting",
    "the low hum knows",
    "between the rings",
    "not yet",
    "closer",
    "listen",
    "the silence was louder",
    "what you meant was light",
    "you keep circling back",
    "almost",
    "the weight of unnamed color",
    "drift",
    "here",
    "the edges remember",
    "slowly",
    "underneath",
    "what remains",
    "the space between",
    "breathe",
    "it was always moving",
    "further in",
    "the dark is not empty",
    "resonance",
    "you felt that",
    "before language",
    "the center shifts",
    "dissolving",
    "what the bass knows",
    "still here",
    "the glow remembers you",
  ];

  private _nextTime = 0;
  private _intervalMin: number;
  private _intervalMax: number;
  private _index = 0;
  private _onWords: ((words: string) => void) | null = null;

  constructor(intervalMin = 10, intervalMax = 20) {
    this._intervalMin = intervalMin;
    this._intervalMax = intervalMax;
    // Shuffle the phrases
    this._shuffleStart();
    this._scheduleNext(0);
  }

  onWords(cb: (words: string) => void): void {
    this._onWords = cb;
  }

  update(elapsed: number): void {
    if (elapsed >= this._nextTime) {
      const phrase = AmbientVoice.PHRASES[this._index % AmbientVoice.PHRASES.length];
      this._index++;
      if (this._onWords) {
        this._onWords(phrase);
      }
      this._scheduleNext(elapsed);
    }
  }

  private _scheduleNext(now: number): void {
    const interval = this._intervalMin + Math.random() * (this._intervalMax - this._intervalMin);
    this._nextTime = now + interval;
  }

  private _shuffleStart(): void {
    this._index = Math.floor(Math.random() * AmbientVoice.PHRASES.length);
  }
}
