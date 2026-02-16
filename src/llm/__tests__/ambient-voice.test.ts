import { describe, it, expect, vi } from "vitest";
import { AmbientVoice } from "../director";

describe("AmbientVoice", () => {
  it("fires a word after the interval", () => {
    const voice = new AmbientVoice(5, 5); // Fixed 5s interval for predictability
    const cb = vi.fn();
    voice.onWords(cb);

    // Before interval — no call
    voice.update(3);
    expect(cb).not.toHaveBeenCalled();

    // After interval — should fire
    voice.update(6);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(typeof cb.mock.calls[0][0]).toBe("string");
  });

  it("fires multiple times over long elapsed", () => {
    const voice = new AmbientVoice(2, 2);
    const cb = vi.fn();
    voice.onWords(cb);

    voice.update(3);
    expect(cb).toHaveBeenCalledTimes(1);

    voice.update(6);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("does not fire if no callback set", () => {
    const voice = new AmbientVoice(1, 1);
    // Should not throw
    voice.update(5);
  });

  it("respondToUser queues poetic responses that include the user's word", () => {
    const voice = new AmbientVoice(1, 1);
    const cb = vi.fn();
    voice.onWords(cb);

    voice.respondToUser("ocean");

    // Drain the response queue by calling update multiple times
    voice.update(2);
    voice.update(6);
    voice.update(10);

    // Should have fired at least 2 responses
    expect(cb.mock.calls.length).toBeGreaterThanOrEqual(2);
    // At least one response should reference the user's word
    const allWords = cb.mock.calls.map((c: string[]) => c[0]).join(" ");
    expect(allWords).toContain("ocean");
  });

  it("tells micro-stories over multiple updates", () => {
    const voice = new AmbientVoice(1, 1);
    const phrases: string[] = [];
    voice.onWords((w) => phrases.push(w));

    // Run enough updates to trigger a story (after 3-5 standalone fragments)
    for (let t = 2; t < 80; t += 2) {
      voice.update(t);
    }

    // Should have many phrases including story sequences
    expect(phrases.length).toBeGreaterThan(5);
    // Phrases should not all be the same
    const unique = new Set(phrases);
    expect(unique.size).toBeGreaterThan(3);
  });
});
