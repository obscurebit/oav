import { describe, it, expect } from "vitest";
import { ParameterStore } from "../params";
import { InputReactor } from "../input-reactor";

function makeReactor() {
  const params = new ParameterStore();
  params.define("intensity", 0, 1, 0.5);
  params.define("speed", 0.1, 4, 1);
  params.define("hue", 0, 1, 0);
  params.define("pulse", 0, 1, 0);
  params.define("saturation", 0, 2, 1);
  params.define("contrast", 0, 3, 1);
  params.define("warmth", -1, 1, 0);
  params.define("gamma", 0.2, 3, 1);
  params.define("invert", 0, 1, 0);
  params.define("zoom", 0.2, 5, 1);
  params.define("rotation", -3.14, 3.14, 0);
  params.define("symmetry", 0, 12, 0);
  params.define("mirror_x", 0, 1, 0);
  params.define("mirror_y", 0, 1, 0);
  params.define("warp", 0, 3, 0.5);
  params.define("noise_scale", 0.5, 10, 3);
  params.define("octaves", 1, 8, 5);
  params.define("lacunarity", 1, 4, 2);
  params.define("grain", 0, 1, 0);
  params.define("pixelate", 0, 1, 0);
  params.define("edge", 0, 1, 0);
  params.define("ridge", 0, 1, 0);
  params.define("cells", 0, 1, 0);
  params.define("drift_x", -2, 2, 0);
  params.define("drift_y", -2, 2, 0);
  params.define("spin", -2, 2, 0);
  params.define("wobble", 0, 1, 0);
  params.define("strobe", 0, 1, 0);
  params.define("bloom", 0, 2, 0);
  params.define("vignette", 0, 2, 0.5);
  params.define("aberration", 0, 1, 0);
  params.define("glitch", 0, 1, 0);
  params.define("feedback", 0, 1, 0);
  const reactor = new InputReactor(params);
  return { reactor, params };
}

describe("InputReactor", () => {
  describe("onKeystroke", () => {
    it("adds pulse on each keystroke", () => {
      const { reactor, params } = makeReactor();
      reactor.onKeystroke("a", 1);
      expect(params.get("pulse")).toBeGreaterThan(0);
    });

    it("scales pulse with typing speed", () => {
      const { reactor, params } = makeReactor();
      // Simulate fast typing
      for (let i = 0; i < 8; i++) {
        reactor.onKeystroke("a", i + 1);
      }
      const fastPulse = params.get("pulse");
      expect(fastPulse).toBeGreaterThan(0.2);
    });
  });

  describe("onPhrase — color words", () => {
    it("detects green and drifts hue", () => {
      const { reactor, params } = makeReactor();
      const reactions = reactor.onPhrase("green");
      expect(reactions[0]).toContain("hue → green");
      // Color now uses set() for immediate effect, no drift needed
      expect(params.get("hue")).toBeCloseTo(0.33);
    });

    it("detects red", () => {
      const { reactor } = makeReactor();
      const reactions = reactor.onPhrase("the sky is red");
      expect(reactions.some((r) => r.includes("red"))).toBe(true);
    });

    it("detects blue in a sentence", () => {
      const { reactor } = makeReactor();
      const reactions = reactor.onPhrase("deep blue ocean");
      expect(reactions.some((r) => r.includes("blue"))).toBe(true);
    });

    it("detects dark and dims intensity", () => {
      const { reactor, params } = makeReactor();
      reactor.onPhrase("dark");
      // Should have started a drift toward low intensity
      expect(params.activeDrifts).toBeGreaterThan(0);
    });

    it("detects bright and boosts intensity", () => {
      const { reactor } = makeReactor();
      const reactions = reactor.onPhrase("bright light");
      expect(reactions.some((r) => r.includes("brightness"))).toBe(true);
    });
  });

  describe("onPhrase — mood words", () => {
    it("detects fast and drifts speed up", () => {
      const { reactor, params } = makeReactor();
      const reactions = reactor.onPhrase("go fast");
      expect(reactions).toContain("mood: fast");
      expect(params.activeDrifts).toBeGreaterThan(0);
    });

    it("detects calm and drifts speed + intensity down", () => {
      const { reactor } = makeReactor();
      const reactions = reactor.onPhrase("calm");
      expect(reactions).toContain("mood: calm");
    });

    it("detects chaos and boosts both speed and intensity", () => {
      const { reactor } = makeReactor();
      const reactions = reactor.onPhrase("pure chaos");
      expect(reactions).toContain("mood: chaos");
    });

    it("handles multiple words in one phrase", () => {
      const { reactor } = makeReactor();
      const reactions = reactor.onPhrase("dark fast chaos");
      expect(reactions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("onPhrase — evocative scene words", () => {
    it("void triggers black-hole-like params (zoom, spin, warp, vignette)", () => {
      const { reactor, params } = makeReactor();
      const reactions = reactor.onPhrase("void");
      expect(reactions).toContain("mood: void");
      // Should have many active drifts for the black hole effect
      expect(params.activeDrifts).toBeGreaterThanOrEqual(5);
      // Pulse fires on reaction
      expect(params.get("pulse")).toBeCloseTo(1.0);
    });

    it("supernova triggers explosion params (bloom, strobe, zoom out)", () => {
      const { reactor, params } = makeReactor();
      const reactions = reactor.onPhrase("supernova");
      expect(reactions).toContain("mood: supernova");
      expect(params.activeDrifts).toBeGreaterThanOrEqual(5);
    });

    it("hell triggers fire-like params (warmth, ridge, warp)", () => {
      const { reactor } = makeReactor();
      const reactions = reactor.onPhrase("hell");
      expect(reactions).toContain("mood: hell");
    });

    it("glitch triggers digital distortion params", () => {
      const { reactor, params } = makeReactor();
      const reactions = reactor.onPhrase("glitch");
      expect(reactions).toContain("mood: glitch");
      expect(params.activeDrifts).toBeGreaterThanOrEqual(1);
    });
  });

  describe("onPhrase — multi-word phrase triggers", () => {
    it("black hole triggers extreme black hole effect", () => {
      const { reactor, params } = makeReactor();
      const reactions = reactor.onPhrase("into the black hole");
      expect(reactions.some((r) => r.includes('phrase: "black hole"'))).toBe(true);
      expect(params.activeDrifts).toBeGreaterThanOrEqual(5);
    });

    it("event horizon triggers gravitational lensing effect", () => {
      const { reactor } = makeReactor();
      const reactions = reactor.onPhrase("crossing the event horizon");
      expect(reactions.some((r) => r.includes('phrase: "event horizon"'))).toBe(true);
    });

    it("time warp triggers distortion", () => {
      const { reactor, params } = makeReactor();
      const reactions = reactor.onPhrase("time warp");
      expect(reactions.some((r) => r.includes('phrase: "time warp"'))).toBe(true);
      expect(params.activeDrifts).toBeGreaterThanOrEqual(3);
    });

    it("phrase triggers combine with individual word matches", () => {
      const { reactor } = makeReactor();
      // "black hole" phrase + "dark" color word
      const reactions = reactor.onPhrase("dark black hole");
      expect(reactions.some((r) => r.includes("black hole"))).toBe(true);
      expect(reactions.some((r) => r.includes("darkness"))).toBe(true);
    });
  });

  describe("onPhrase — no matches", () => {
    it("returns empty array for unrecognized words", () => {
      const { reactor } = makeReactor();
      const reactions = reactor.onPhrase("hello world");
      expect(reactions.length).toBe(0);
    });
  });
});
