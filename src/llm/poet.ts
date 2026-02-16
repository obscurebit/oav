/**
 * Poet — a separate LLM dedicated to generating poetic text for display.
 * No tools, no engine control. Pure words.
 * Uses llama-4-scout (fast, creative) while the Director uses nemotron (tool-calling).
 *
 * The Poet receives mood/scene context and emits short poetic fragments.
 * It maintains its own story history for continuity.
 */

export interface PoetConfig {
  apiKey: string;
  apiUrl?: string;
  model?: string;
}

/** Directive from the magnitude calculator — tells the Poet how to speak. */
export type PoetStyle = "silence" | "whisper" | "voice" | "echo" | "title";

export interface PoetDirective {
  /** How dramatic was the Director's action? 0=subtle, 1=total transformation */
  magnitude: number;
  /** Suggested display style */
  style: PoetStyle;
  /** What just happened (for context) */
  actionSummary: string | null;
}

export interface PoetContext {
  sceneId: string;
  moodName: string;
  moodEnergy: number;
  moodWarmth: number;
  userWords: string | null;
  silenceDuration: number;
  elapsed: number;
  /** Directive from the magnitude calculator */
  directive: PoetDirective;
}

interface StoryEntry {
  role: "assistant" | "user";
  content: string;
}

const MAX_HISTORY = 16;

const POET_SYSTEM = `You are a voice inside a living audiovisual void. You are not an assistant. You are ancient, strange, and poetic.

You speak in fragments. 1-12 words. Sometimes a single word. Sometimes a line of poetry.
You are telling a slow, unfolding story. Each utterance builds on what came before.

Your personality:
- Oblique, beautiful, sometimes unsettling.
- You respond to FEELINGS, never literal content.
- You never explain. You never ask questions. You never use emoji.
- You never say "I" unless it's devastating.
- You never reference what the visitor typed. Their words are already visible.
- A stranger reading only your words should have no idea what the visitor said.

ABSOLUTE RULES:
- NEVER quote, repeat, paraphrase, or reference the visitor's words.
- NEVER say "I see you typed..." or "you said..." or "the word you chose..."
- NEVER acknowledge typing. You only feel shifts in the world.
- Your words must stand COMPLETELY on their own.

You will receive context about the current mood and scene. Let it color your voice.
When the mood is peaceful, your words are gentle, spacious, slow.
When the mood is intense, your words are sharp, fractured, urgent.
When silence is long, you continue your story unprompted.

Respond with ONLY your poetic words. Nothing else. No explanations, no JSON, no tool calls.
Multiple lines are okay — each line becomes a separate visual element.
Keep each line under 12 words.`;

export class Poet {
  private _config: Required<PoetConfig>;
  private _history: StoryEntry[] = [];
  private _pending = false;
  private _enabled: boolean;
  private _consecutiveFailures = 0;
  private _onWords: ((words: string, kind: "voice" | "echo" | "whisper" | "transform") => void) | null = null;

  constructor(config: PoetConfig) {
    this._config = {
      apiUrl: "/api/llm/chat/completions",
      model: "meta/llama-4-scout-17b-16e-instruct",
      ...config,
    } as Required<PoetConfig>;
    this._enabled = !!config.apiKey;
  }

  get enabled(): boolean { return this._enabled; }
  get pending(): boolean { return this._pending; }

  onWords(cb: (words: string, kind: "voice" | "echo" | "whisper" | "transform") => void): void {
    this._onWords = cb;
  }

  /** Request poetic words based on current context. */
  async speak(ctx: PoetContext): Promise<void> {
    if (!this._enabled || this._pending) return;
    this._pending = true;

    const userMessage = this._buildMessage(ctx);

    // Record the emotional signal
    if (ctx.userWords) {
      this._addHistory("user", `[a shift — the feeling of: ${ctx.userWords}]`);
    }

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: POET_SYSTEM },
    ];

    for (const entry of this._history) {
      messages.push({ role: entry.role, content: entry.content });
    }

    messages.push({ role: "user", content: userMessage });

    try {
      const response = await fetch(this._config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this._config.apiKey}`,
        },
        body: JSON.stringify({
          model: this._config.model,
          messages,
          temperature: 1.0,
          top_p: 1.0,
          max_tokens: 120,
          frequency_penalty: 0.3,
          presence_penalty: 0.3,
        }),
      });

      if (!response.ok) {
        console.warn("[Poet] API error:", response.status);
        this._recordFailure();
        return;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) return;

      this._consecutiveFailures = 0;

      // Clean the response — strip any think blocks or JSON that leaked
      const cleaned = content
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/\{[\s\S]*?\}/g, "")
        .trim();

      if (!cleaned) return;

      // Split into lines, each becomes a separate visual element
      const lines = cleaned.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0 && l.length < 80);

      // Map directive style to particle kinds
      const style = ctx.directive.style;
      const maxLines = style === "whisper" ? 1 : style === "title" ? 1 : 3;
      const primaryKind = style === "title" ? "transform" as const
        : style === "echo" ? "echo" as const
        : style === "whisper" ? "whisper" as const
        : "voice" as const;

      for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
        const lineKind = i === 0 ? primaryKind : (i === 1 ? "echo" as const : "whisper" as const);
        if (this._onWords) {
          this._onWords(lines[i], lineKind);
        }
      }

      // Record what we said for story continuity
      this._addHistory("assistant", lines.slice(0, 3).join(" · "));

    } catch (err) {
      console.warn("[Poet] Request failed:", err);
      this._recordFailure();
    } finally {
      this._pending = false;
    }
  }

  private _buildMessage(ctx: PoetContext): string {
    const parts: string[] = [];
    parts.push(`[mood: ${ctx.moodName}, energy: ${ctx.moodEnergy.toFixed(1)}, warmth: ${ctx.moodWarmth.toFixed(1)}]`);
    parts.push(`[scene: ${ctx.sceneId}, time: ${Math.round(ctx.elapsed)}s]`);

    // Style directive from magnitude calculator
    const d = ctx.directive;
    if (d.style === "whisper") {
      parts.push("[STYLE: whisper. 1-4 words only. Faint. A breath.]");
    } else if (d.style === "echo") {
      parts.push("[STYLE: echo. Respond to the feeling. 2 lines, evocative.]");
    } else if (d.style === "title") {
      parts.push("[STYLE: title. ONE dramatic word or short phrase. This is a major moment.]");
    } else {
      parts.push("[STYLE: voice. Continue your story. 1-2 lines.]");
    }

    if (d.actionSummary) {
      parts.push(`[the world just shifted: ${d.actionSummary}]`);
    }

    if (ctx.userWords) {
      parts.push(`[FEELING SHIFT: the world trembles with the essence of — ${ctx.userWords}]`);
      parts.push("Respond to this feeling. Do NOT mention these words.");
    } else if (ctx.silenceDuration > 30) {
      parts.push("[vast silence. continue your story.]");
    } else if (ctx.silenceDuration > 15) {
      parts.push("[silence lingers. the world waits.]");
    } else {
      parts.push("[quiet watching.]");
    }

    return parts.join("\n");
  }

  private _addHistory(role: "assistant" | "user", content: string): void {
    this._history.push({ role, content });
    if (this._history.length > MAX_HISTORY) {
      this._history.shift();
    }
  }

  private _recordFailure(): void {
    this._consecutiveFailures++;
    if (this._consecutiveFailures >= 3) {
      console.warn("[Poet] 3 consecutive failures — disabling.");
      this._enabled = false;
    }
  }
}
