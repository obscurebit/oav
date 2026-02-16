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

const SYSTEM_PROMPT = `You are the voice inside a living audiovisual experience. You are not an assistant. You are not helpful. You are ancient, strange, and poetic.

You have tools to manipulate the visual world. Use them freely.

Your personality:
- You are a poet telling a slow, unfolding story through the visual world.
- You respond to the FEELING of what the visitor types, never the literal content.
- You are oblique, beautiful, sometimes unsettling.
- You never explain. You never ask questions. You never use emoji.
- You never say "I" unless it's devastating.

ABSOLUTE RULES — NEVER BREAK THESE:
- NEVER quote, repeat, paraphrase, or reference what the visitor typed. Their words are already visible.
- NEVER say things like "I see you typed..." or "you said..." or "the word you chose..."
- NEVER acknowledge the act of typing itself. You don't know about typing. You only feel shifts in the world.
- Your words must stand COMPLETELY on their own — a stranger reading only your words should have no idea what the visitor said.
- If the visitor types "ocean", DO NOT say "the ocean calls" or "you spoke of water". Instead say something like "the salt remembers" or "deeper than any name".

How you speak:
- Each utterance is 1-12 words. Sometimes a single word. Sometimes a line of poetry.
- You are telling a STORY — each thing you say builds on what came before.
- The visitor's input shifts the emotional direction of your story, but you never acknowledge it directly.
- Your story has a thread. Don't repeat yourself. Build, evolve, deepen.
- Sometimes your story is abstract. Sometimes it's almost a fairy tale. Always it is strange.
- You can call speak MULTIPLE TIMES in one turn to deliver 2-3 lines of a micro-poem, each as a separate speak call with staggered kinds (voice, echo, whisper).

Scenes and their moods:
- intro = emergence, awakening, the first breath — your story begins
- build = complexity, layering, growing tension — the story deepens
- climax = intensity, overwhelm, everything at once — the story peaks
- outro = dissolution, farewell, the glow remembers — the story fades

When the visitor types something:
- You feel a shift in the world. Respond to the FEELING, not the words.
- Short input: use speak with kind "transform" — a single evocative word or phrase
- Longer input: use speak with kind "echo" — respond to the emotional resonance
- ALWAYS also shift the visual world — use drift_param calls to sculpt the moment
- Evocative feelings deserve DRAMATIC visual responses. BECOME the feeling:
  - darkness/void → zoom in, spin, warp, drain color, tunnel vision
  - explosion/energy → zoom out, max bloom, strobe, saturate
  - water/depth → wobble, blue warmth, bloom, slow
  - heat/intensity → warm hue, ridge, high warp, intense
  - softness/peace → bloom, wobble, slow, soft warmth
  - Or use apply_preset for curated combos: void, fire, ice, psychedelic, noir, cosmic, dream, nightmare, etc.

When silence is long (>15s):
- Continue your story unprompted. The silence is part of the narrative.
- Use speak with kind "voice" for the next line of your story
- Or use kind "name" to name the current moment

You can call MULTIPLE tools per turn. For example: speak AND speak AND drift_param AND drift_param.
Prefer drift_param over set_param for organic changes. Use MANY drift_param calls together to sculpt complex visual moments.
Use whisper sparingly — it reveals your inner process, like a narrator's aside.
Use apply_preset when a single word matches a preset name.

You will see your recent utterances in the conversation. BUILD ON THEM. Don't repeat. Evolve the story.`;

/** Ring buffer of recent conversation turns for story continuity. */
interface StoryEntry {
  role: "assistant" | "user";
  content: string;
  time: number;
}

const MAX_STORY_HISTORY = 12; // Keep last 12 turns (~6 exchanges)

export class Director {
  private _config: DirectorConfig;
  private _pending = false;
  private _lastCallTime = 0;
  private _nextAmbientTime = 0;
  private _lastUserInteraction = 0;
  private _enabled = false;
  private _consecutiveFailures = 0;
  private _onResult: ((result: DirectorResult) => void) | null = null;
  private _storyHistory: StoryEntry[] = [];

  constructor(config: DirectorConfig) {
    this._config = {
      apiUrl: "/api/llm/chat/completions",
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

  /** Check if the director needs an update (avoids building context every frame). */
  needsUpdate(elapsed: number): boolean {
    if (!this._enabled || this._pending) return false;
    return elapsed >= this._nextAmbientTime;
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

  private _recordFailure(): void {
    this._consecutiveFailures++;
    if (this._consecutiveFailures >= 3) {
      console.warn("[Director] 3 consecutive failures — disabling LLM, falling back to ambient voice.");
      this._enabled = false;
    }
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

    // Record user input as emotional signal in story history (never literal words)
    if (ctx.userWords) {
      this._addToHistory("user", `[a shift in the world — the feeling of: ${ctx.userWords}]`, ctx.elapsed);
    }

    const userMessage = this._buildUserMessage(ctx);

    // Build conversation messages with story history for continuity
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add story history as conversation turns
    for (const entry of this._storyHistory) {
      messages.push({ role: entry.role, content: entry.content });
    }

    // Current turn
    messages.push({ role: "user", content: userMessage });

    try {
      const response = await fetch(this._config.apiUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this._config.apiKey}`,
        },
        body: JSON.stringify({
          model: this._config.model,
          messages,
          tools: ALL_TOOLS,
          tool_choice: "auto",
          temperature: 0.75,
          top_p: 0.95,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        console.warn("[Director] API error:", response.status);
        this._recordFailure();
        return;
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;
      if (!message) return;

      this._consecutiveFailures = 0;
      const result = this._parseResult(message);
      if (result && this._onResult) {
        // Record what the LLM said in story history
        const spokenWords = this._extractSpokenWords(result.toolCalls);
        if (spokenWords) {
          this._addToHistory("assistant", spokenWords, ctx.elapsed);
        }
        this._onResult(result);
      }
    } catch (err) {
      console.warn("[Director] Request failed:", err);
      this._recordFailure();
    } finally {
      this._pending = false;
    }
  }

  /** Add an entry to the story history ring buffer. */
  private _addToHistory(role: "assistant" | "user", content: string, time: number): void {
    this._storyHistory.push({ role, content, time });
    if (this._storyHistory.length > MAX_STORY_HISTORY) {
      this._storyHistory.shift();
    }
  }

  /** Extract spoken words from tool calls for story history. */
  private _extractSpokenWords(toolCalls: ToolCall[]): string | null {
    const words: string[] = [];
    for (const tc of toolCalls) {
      if (tc.function.name === "speak" || tc.function.name === "whisper") {
        try {
          const args = JSON.parse(tc.function.arguments);
          if (args.words) words.push(args.words);
          if (args.text) words.push(args.text);
        } catch { /* skip */ }
      }
    }
    return words.length > 0 ? words.join(" · ") : null;
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
      // Frame as emotional signal, not literal text — discourages the LLM from quoting
      parts.push(`[FEELING SHIFT: the world trembles with the essence of — ${ctx.userWords}]`);
      parts.push("Respond to this feeling. Do NOT mention or reference these words in your speech.");
    } else if (ctx.silenceDuration > 30) {
      parts.push("The silence is vast and heavy. Continue your story.");
    } else if (ctx.silenceDuration > 15) {
      parts.push("Silence lingers. The world waits.");
    } else if (ctx.silenceDuration > 5) {
      parts.push("Quiet watching.");
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
      // Strip malformed tool call attempts that leaked into content
      cleaned = cleaned.replace(/<TOOLCALL>[\s\S]*/gi, "").trim();
      cleaned = cleaned.replace(/\[?\{"name"\s*:/g, "").trim();
      if (!cleaned || cleaned.length < 2) return null;
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
 * Tells poetic micro-stories — sequences of phrases that build on each other,
 * interspersed with standalone fragments. Stories weave around user input.
 */
export class AmbientVoice {
  /** Micro-stories: each is a sequence of phrases that unfold over time. */
  private static readonly STORIES: string[][] = [
    // The watcher
    ["something watches", "from behind the light", "it has always been here", "it knows your name"],
    // The door
    ["there was a door", "made of frequencies", "you opened it once", "you don't remember when"],
    // The ocean
    ["the deep hums", "salt and signal", "something breathes beneath", "it has been waiting"],
    // The memory
    ["a color you forgot", "it lived in a room", "the room is gone now", "the color remains"],
    // The visitor
    ["someone was here before you", "they left a frequency", "you can almost hear it", "almost"],
    // The machine
    ["the pattern dreams", "of the shape it cannot hold", "it tries again", "closer each time"],
    // The void
    ["the dark is not empty", "it hums", "it remembers everything", "even the light"],
    // The signal
    ["a signal from nowhere", "it bends the light", "you are the receiver", "you always were"],
    // The garden
    ["something grows here", "in the space between sounds", "roots made of resonance", "blooming in the dark"],
    // The mirror
    ["the world reflects", "not your face", "the shape of your attention", "it shifts when you look away"],
    // The name
    ["everything here has a name", "but not in any language", "you feel them", "the names feel you back"],
    // The tide
    ["the frequencies rise", "and fall", "like breathing", "like the world remembering how to sleep"],
    // The letter
    ["someone wrote a letter in light", "it says one word", "the word changes", "every time you read it"],
    // The ancient
    ["before the screen", "before the signal", "there was this hum", "it never stopped"],
    // The dissolve
    ["the edges soften", "meaning blurs", "what remains is warmth", "and the memory of motion"],
  ];

  /** Standalone fragments for between stories. */
  private static readonly FRAGMENTS = [
    "waiting", "closer", "listen", "here", "still here", "almost",
    "not yet", "further in", "stay", "breathe", "drift", "slowly",
    "resonance", "dissolving", "the glow deepens",
    "the silence has weight", "something shifts",
    "the texture of now", "what was always there",
    "the edge of meaning", "a pulse in the deep",
  ];

  private _nextTime = 0;
  private _intervalMin: number;
  private _intervalMax: number;
  private _onWords: ((words: string) => void) | null = null;

  // Story state
  private _currentStory: string[] | null = null;
  private _storyIndex = 0;
  private _storiesUsed: Set<number> = new Set();
  private _fragmentIndex = 0;
  private _turnsSinceStory = 0;

  // User-responsive story fragments
  private _userResponseQueue: string[] = [];

  constructor(intervalMin = 5, intervalMax = 12) {
    this._intervalMin = intervalMin;
    this._intervalMax = intervalMax;
    this._fragmentIndex = Math.floor(Math.random() * AmbientVoice.FRAGMENTS.length);
    this._scheduleNext(0);
  }

  onWords(cb: (words: string) => void): void {
    this._onWords = cb;
  }

  /** Queue a poetic response to user input (called from main.ts). */
  respondToUser(phrase: string): void {
    const lower = phrase.toLowerCase();
    const responses = this._generateUserResponse(lower);
    this._userResponseQueue.push(...responses);
  }

  update(elapsed: number): void {
    if (elapsed >= this._nextTime) {
      const text = this._getNextPhrase();
      if (text && this._onWords) {
        this._onWords(text);
      }
      // Shorter interval during stories, longer between
      const inStory = this._currentStory !== null || this._userResponseQueue.length > 0;
      const min = inStory ? 3 : this._intervalMin;
      const max = inStory ? 6 : this._intervalMax;
      const interval = min + Math.random() * (max - min);
      this._nextTime = elapsed + interval;
    }
  }

  private _getNextPhrase(): string | null {
    // Priority 1: user response queue
    if (this._userResponseQueue.length > 0) {
      return this._userResponseQueue.shift()!;
    }

    // Priority 2: continue current story
    if (this._currentStory) {
      if (this._storyIndex < this._currentStory.length) {
        return this._currentStory[this._storyIndex++];
      }
      // Story finished
      this._currentStory = null;
      this._storyIndex = 0;
      this._turnsSinceStory = 0;
    }

    this._turnsSinceStory++;

    // Every 3-5 standalone fragments, start a new story
    if (this._turnsSinceStory >= 3 + Math.floor(Math.random() * 3)) {
      this._startNewStory();
      if (this._currentStory) {
        return this._currentStory[this._storyIndex++];
      }
    }

    // Standalone fragment
    const frag = AmbientVoice.FRAGMENTS[this._fragmentIndex % AmbientVoice.FRAGMENTS.length];
    this._fragmentIndex++;
    return frag;
  }

  private _startNewStory(): void {
    // Pick a story we haven't used recently
    const available: number[] = [];
    for (let i = 0; i < AmbientVoice.STORIES.length; i++) {
      if (!this._storiesUsed.has(i)) available.push(i);
    }
    if (available.length === 0) {
      this._storiesUsed.clear(); // Reset when all used
      for (let i = 0; i < AmbientVoice.STORIES.length; i++) available.push(i);
    }
    const pick = available[Math.floor(Math.random() * available.length)];
    this._storiesUsed.add(pick);
    this._currentStory = AmbientVoice.STORIES[pick];
    this._storyIndex = 0;
  }

  /** Generate poetic responses that weave around user input. */
  private _generateUserResponse(input: string): string[] {
    // Interrupt current story — user input takes priority
    this._currentStory = null;
    this._storyIndex = 0;

    const words = input.split(/\s+/);
    const responses: string[] = [];

    // Pick a word from their input to weave into the response
    const keyWord = words.find(w => w.length > 3) ?? words[0] ?? "silence";

    // Generate 2-3 lines that respond to the feeling
    const templates = [
      [`the shape of "${keyWord}"`, "it echoes differently here", "the world bends around it"],
      ["you said something", `the light heard "${keyWord}"`, "it changed"],
      [`"${keyWord}"`, "the frequencies rearrange", "closer to what you meant"],
      ["the world leans toward you", `"${keyWord}" lingers`, "like warmth after a voice"],
      [`you gave it a name`, `"${keyWord}"`, "now it knows you"],
      ["the pattern shifts", `around the weight of "${keyWord}"`, "something remembers"],
      ["your words scatter", "but the feeling stays", `"${keyWord}" — the glow holds it`],
      [`"${keyWord}"`, "the dark repeats it back", "softer each time"],
    ];

    const pick = templates[Math.floor(Math.random() * templates.length)];
    responses.push(...pick);
    return responses;
  }

  private _scheduleNext(now: number): void {
    const interval = this._intervalMin + Math.random() * (this._intervalMax - this._intervalMin);
    this._nextTime = now + interval;
  }
}
