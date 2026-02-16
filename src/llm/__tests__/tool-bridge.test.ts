import { describe, it, expect, vi } from "vitest";
import { ToolBridge } from "../tool-bridge";
import { ParameterStore } from "../../engine/params";
import { Timeline } from "../../engine/timeline";
import { TextParticleSystem } from "../../overlay/text-particles";
import { Clock } from "../../engine/clock";
import type { ToolCall } from "../tools";

function makeBridge() {
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

  const timeline = new Timeline();
  timeline.add({ startTime: 0, endTime: 30, sceneId: "intro" });

  const particles = new TextParticleSystem();

  const bridge = new ToolBridge({
    params,
    timeline,
    particles,
    canvasWidth: () => 800,
    canvasHeight: () => 800,
    clock: new Clock(), // Add Clock to test initialization
  });

  return { bridge, params, timeline, particles };
}

function call(name: string, args: Record<string, unknown>): ToolCall {
  return {
    id: `test-${name}`,
    type: "function",
    function: { name, arguments: JSON.stringify(args) },
  };
}

describe("ToolBridge", () => {
  describe("speak", () => {
    it("adds voice particles with letter-by-letter reveal", () => {
      const { bridge, particles } = makeBridge();
      bridge.execute([call("speak", { words: "closer" })]);
      // "closer" = 6 characters, each spawned as a separate particle
      expect(particles.count).toBe(6);
      expect(particles.particles[0].kind).toBe("voice");
      expect(particles.particles[0].text).toBe("c");
    });

    it("adds name particles with letter-by-letter reveal", () => {
      const { bridge, particles } = makeBridge();
      bridge.execute([call("speak", { words: "the hour of edges", kind: "name" })]);
      // spaces are skipped, so 14 non-space chars
      expect(particles.count).toBe(14);
      expect(particles.particles[0].kind).toBe("name");
    });

    it("adds transform particles with letter-by-letter reveal", () => {
      const { bridge, particles } = makeBridge();
      bridge.execute([call("speak", { words: "gravity between frequencies", kind: "transform" })]);
      expect(particles.particles[0].kind).toBe("transform");
      expect(particles.count).toBeGreaterThan(1);
    });

    it("adds echo particles with letter-by-letter reveal", () => {
      const { bridge, particles } = makeBridge();
      bridge.execute([call("speak", { words: "yes", kind: "echo" })]);
      expect(particles.count).toBe(3);
      expect(particles.particles[0].kind).toBe("echo");
    });
  });

  describe("whisper", () => {
    it("adds a whisper particle", () => {
      const { bridge, particles } = makeBridge();
      bridge.execute([call("whisper", { fragment: "warmth rises" })]);
      expect(particles.count).toBe(1);
      expect(particles.particles[0].kind).toBe("whisper");
    });
  });

  describe("shift_mood", () => {
    it("starts drifts for known feelings", () => {
      const { bridge, params } = makeBridge();
      bridge.execute([call("shift_mood", { feeling: "warmer" })]);
      expect(params.activeDrifts).toBeGreaterThan(0);
    });

    it("ignores unknown feelings", () => {
      const { bridge, params } = makeBridge();
      const results = bridge.execute([call("shift_mood", { feeling: "banana" })]);
      expect(results[0]).toContain("unknown feeling");
      expect(params.activeDrifts).toBe(0);
    });
  });

  describe("set_param", () => {
    it("sets a param immediately", () => {
      const { bridge, params } = makeBridge();
      bridge.execute([call("set_param", { name: "intensity", value: 0.9 })]);
      expect(params.get("intensity")).toBeCloseTo(0.9);
    });

    it("ignores unknown params", () => {
      const { bridge } = makeBridge();
      const results = bridge.execute([call("set_param", { name: "bogus", value: 1 })]);
      expect(results[0]).toContain("unknown param");
    });
  });

  describe("drift_param", () => {
    it("starts a drift", () => {
      const { bridge, params } = makeBridge();
      bridge.execute([call("drift_param", { name: "hue", target: 0.7, duration: 3 })]);
      expect(params.activeDrifts).toBe(1);
    });

    it("clamps duration", () => {
      const { bridge, params } = makeBridge();
      bridge.execute([call("drift_param", { name: "hue", target: 0.5, duration: 100 })]);
      // Should still create a drift (clamped to 15)
      expect(params.activeDrifts).toBe(1);
    });
  });

  describe("pulse_param", () => {
    it("starts a pulse", () => {
      const { bridge, params } = makeBridge();
      bridge.execute([call("pulse_param", { name: "intensity", amplitude: 0.1, period: 2, duration: 5 })]);
      expect(params.activePulses).toBe(1);
    });
  });

  describe("spawn_particles", () => {
    it("creates multiple particles", () => {
      const { bridge, particles } = makeBridge();
      bridge.execute([call("spawn_particles", { texts: ["one", "two", "three"], kind: "voice" })]);
      expect(particles.count).toBe(3);
    });

    it("limits to 8 particles", () => {
      const { bridge, particles } = makeBridge();
      const texts = Array.from({ length: 20 }, (_, i) => `word${i}`);
      bridge.execute([call("spawn_particles", { texts })]);
      expect(particles.count).toBe(8);
    });
  });

  describe("multiple tool calls", () => {
    it("executes all calls in sequence", () => {
      const { bridge, params, particles } = makeBridge();
      const results = bridge.execute([
        call("speak", { words: "closer" }),
        call("shift_mood", { feeling: "warmer" }),
        call("pulse_param", { name: "intensity", amplitude: 0.1, period: 2, duration: 5 }),
      ]);
      expect(results.length).toBe(3);
      expect(particles.count).toBe(6); // "closer" = 6 letter particles
      expect(params.activeDrifts).toBeGreaterThan(0);
      expect(params.activePulses).toBe(1);
    });
  });

  describe("apply_preset", () => {
    it("applies a named preset and starts drifts", () => {
      const { bridge, params } = makeBridge();
      const results = bridge.execute([call("apply_preset", { preset: "noir" })]);
      expect(results[0]).toContain("applied preset");
      expect(results[0]).toContain("noir");
      expect(params.activeDrifts).toBeGreaterThan(0);
      // Noir fires a pulse
      expect(params.get("pulse")).toBeCloseTo(1.0);
    });

    it("scales preset intensity", () => {
      const { bridge, params } = makeBridge();
      bridge.execute([call("apply_preset", { preset: "fire", intensity_scale: 0.5 })]);
      expect(params.activeDrifts).toBeGreaterThan(0);
      expect(params.get("pulse")).toBeCloseTo(0.5);
    });

    it("rejects unknown presets", () => {
      const { bridge } = makeBridge();
      const results = bridge.execute([call("apply_preset", { preset: "banana" })]);
      expect(results[0]).toContain("unknown preset");
    });

    it("reset preset drifts all params back to defaults", () => {
      const { bridge, params } = makeBridge();
      // First apply something dramatic
      bridge.execute([call("apply_preset", { preset: "psychedelic" })]);
      // Then reset
      bridge.execute([call("apply_preset", { preset: "reset" })]);
      // Should have many active drifts heading back to defaults
      expect(params.activeDrifts).toBeGreaterThan(10);
    });
  });

  describe("new params in set/drift", () => {
    it("can set new visual params", () => {
      const { bridge, params } = makeBridge();
      bridge.execute([call("set_param", { name: "bloom", value: 1.5 })]);
      expect(params.get("bloom")).toBeCloseTo(1.5);
    });

    it("can drift new visual params", () => {
      const { bridge, params } = makeBridge();
      bridge.execute([call("drift_param", { name: "warp", target: 2.0, duration: 2 })]);
      expect(params.activeDrifts).toBe(1);
    });
  });

  describe("unknown tool", () => {
    it("logs warning and returns error", () => {
      const { bridge } = makeBridge();
      const results = bridge.execute([call("nonexistent_tool", {})]);
      expect(results[0]).toContain("unknown tool");
    });
  });
});
