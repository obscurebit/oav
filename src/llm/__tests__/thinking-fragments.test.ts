import { describe, it, expect } from "vitest";
import { extractThinkingFragments } from "../director";

describe("extractThinkingFragments", () => {
  it("extracts short phrases from think blocks", () => {
    const content = `<think>The scene is dark. Silence grows heavy. I should respond with something poetic.</think>
{"words": "closer"}`;
    const fragments = extractThinkingFragments(content);
    expect(fragments.length).toBeGreaterThan(0);
    // Should include "the scene is dark" or "silence grows heavy" but not "I should..."
    expect(fragments.some((f) => f.includes("scene") || f.includes("silence"))).toBe(true);
    expect(fragments.every((f) => !f.startsWith("i should"))).toBe(true);
  });

  it("filters out meta-reasoning phrases", () => {
    const content = `<think>I should use the speak tool. Let me think about the mood. The visitor seems curious.</think>`;
    const fragments = extractThinkingFragments(content);
    expect(fragments.every((f) => !f.startsWith("i should"))).toBe(true);
    expect(fragments.every((f) => !f.startsWith("let me"))).toBe(true);
  });

  it("returns empty for no think blocks", () => {
    const content = `{"words": "closer", "kind": "voice"}`;
    expect(extractThinkingFragments(content)).toEqual([]);
  });

  it("limits to 3 fragments max", () => {
    const content = `<think>One. Two. Three. Four. Five. Six. Seven. Eight. Nine. Ten.</think>`;
    const fragments = extractThinkingFragments(content);
    expect(fragments.length).toBeLessThanOrEqual(3);
  });

  it("lowercases fragments", () => {
    const content = `<think>The Colors Are Shifting.</think>`;
    const fragments = extractThinkingFragments(content);
    if (fragments.length > 0) {
      expect(fragments[0]).toBe(fragments[0].toLowerCase());
    }
  });

  it("handles multiple think blocks", () => {
    const content = `<think>Warmth rises.</think> some text <think>The bass deepens.</think>`;
    const fragments = extractThinkingFragments(content);
    expect(fragments.length).toBeGreaterThanOrEqual(1);
  });

  it("skips very short phrases (<=3 chars)", () => {
    const content = `<think>No. Ok. Yes. The frequency hums beneath.</think>`;
    const fragments = extractThinkingFragments(content);
    // "No", "Ok", "Yes" should be filtered (<=3 chars)
    expect(fragments.every((f) => f.length > 3)).toBe(true);
  });
});
