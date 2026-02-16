import { describe, it, expect } from "vitest";
import { extractThinkingFragments } from "../director";

describe("extractThinkingFragments", () => {
  it("extracts poetic/evocative phrases from think blocks", () => {
    const content = `<think>Silence grows heavy. Warmth rises. I should respond with something poetic.</think>
{"words": "closer"}`;
    const fragments = extractThinkingFragments(content);
    expect(fragments.length).toBeGreaterThan(0);
    // "silence grows heavy" or "warmth rises" should survive; "I should..." should not
    expect(fragments.some((f) => f.includes("silence") || f.includes("warmth"))).toBe(true);
    expect(fragments.every((f) => !f.startsWith("i should"))).toBe(true);
  });

  it("filters out meta-reasoning phrases", () => {
    const content = `<think>I should use the speak tool. Let me think about the mood. The visitor seems curious. Okay, let's tackle this.</think>`;
    const fragments = extractThinkingFragments(content);
    expect(fragments).toEqual([]);
  });

  it("filters out technical process phrases", () => {
    const content = `<think>The visuals need to reflect that. I should adjust the parameters. But intensity is 0.02.</think>`;
    const fragments = extractThinkingFragments(content);
    expect(fragments).toEqual([]);
  });

  it("filters out tool name references", () => {
    const content = `<think>I'll use drift_param to shift the mood. Maybe apply_preset would work. Silence deepens.</think>`;
    const fragments = extractThinkingFragments(content);
    expect(fragments.every((f) => !f.includes("drift_param"))).toBe(true);
    expect(fragments.every((f) => !f.includes("apply_preset"))).toBe(true);
    // "silence deepens" should survive (doesn't start with blocked word, no technical terms)
    expect(fragments.some((f) => f.includes("silence"))).toBe(true);
  });

  it("filters out phrases starting with conjunctions and process words", () => {
    const content = `<think>But the colors are wrong. So we need more bloom. Okay, let's tackle this. However the warmth is low.</think>`;
    const fragments = extractThinkingFragments(content);
    expect(fragments).toEqual([]);
  });

  it("filters out phrases containing numbers", () => {
    const content = `<think>Intensity is 0.5 right now. Speed at 2.0 feels right. Embers glow softly.</think>`;
    const fragments = extractThinkingFragments(content);
    expect(fragments.every((f) => !/\d/.test(f))).toBe(true);
    expect(fragments.some((f) => f.includes("embers"))).toBe(true);
  });

  it("returns empty for no think blocks", () => {
    const content = `{"words": "closer", "kind": "voice"}`;
    expect(extractThinkingFragments(content)).toEqual([]);
  });

  it("limits to 3 fragments max", () => {
    const content = `<think>Embers glow. Ash drifts. Salt remembers. Frost clings. Echoes linger. Shadows breathe. Dust settles. Stars hum. Roots deepen. Mist curls.</think>`;
    const fragments = extractThinkingFragments(content);
    expect(fragments.length).toBeLessThanOrEqual(3);
  });

  it("lowercases fragments", () => {
    const content = `<think>Colors Shifting Slowly.</think>`;
    const fragments = extractThinkingFragments(content);
    if (fragments.length > 0) {
      expect(fragments[0]).toBe(fragments[0].toLowerCase());
    }
  });

  it("handles multiple think blocks", () => {
    const content = `<think>Warmth rises.</think> some text <think>Ash drifts slowly.</think>`;
    const fragments = extractThinkingFragments(content);
    expect(fragments.length).toBeGreaterThanOrEqual(1);
  });

  it("skips very short phrases (<=3 chars)", () => {
    const content = `<think>No. Ok. Yes. Frequencies hum beneath.</think>`;
    const fragments = extractThinkingFragments(content);
    // "No", "Ok", "Yes" should be filtered (<=3 chars)
    expect(fragments.every((f) => f.length > 3)).toBe(true);
  });

  it("allows genuinely poetic fragments through", () => {
    const content = `<think>Embers glow softly. Ash remembers everything. Salt and silence. Deeper than any name.</think>`;
    const fragments = extractThinkingFragments(content);
    expect(fragments.length).toBeGreaterThan(0);
    // These are all poetic — no process words, no numbers, no pronouns
    for (const f of fragments) {
      expect(f).not.toMatch(/\d/);
      expect(f).not.toMatch(/^(i |the |but |so |okay)/);
    }
  });
});
