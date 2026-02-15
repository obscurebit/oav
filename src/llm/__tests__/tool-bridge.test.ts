import { describe, it, expect, vi } from "vitest";
import { ToolBridge } from "../tool-bridge";
import { ParameterStore } from "../../engine/params";
import { Timeline } from "../../engine/timeline";
import { TextParticleSystem } from "../../overlay/text-particles";
import type { ToolCall } from "../tools";

function makeBridge() {
  const params = new ParameterStore();
  params.define("intensity", 0, 1, 0.5);
  params.define("speed", 0.1, 4, 1);
  params.define("hue", 0, 1, 0);

  const timeline = new Timeline();
  timeline.add({ startTime: 0, endTime: 30, sceneId: "intro" });

  const particles = new TextParticleSystem();

  const bridge = new ToolBridge({
    params,
    timeline,
    particles,
    canvasWidth: () => 1000,
    canvasHeight: () => 800,
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
    it("adds a voice particle by default", () => {
      const { bridge, particles } = makeBridge();
      bridge.execute([call("speak", { words: "closer" })]);
      expect(particles.count).toBe(1);
      expect(particles.particles[0].kind).toBe("voice");
      expect(particles.particles[0].text).toBe("closer");
    });

    it("adds a name particle when kind=name", () => {
      const { bridge, particles } = makeBridge();
      bridge.execute([call("speak", { words: "the hour of edges", kind: "name" })]);
      expect(particles.particles[0].kind).toBe("name");
    });

    it("adds a transform particle", () => {
      const { bridge, particles } = makeBridge();
      bridge.execute([call("speak", { words: "gravity between frequencies", kind: "transform" })]);
      expect(particles.particles[0].kind).toBe("transform");
    });

    it("adds an echo particle", () => {
      const { bridge, particles } = makeBridge();
      bridge.execute([call("speak", { words: "yes", kind: "echo" })]);
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
      expect(particles.count).toBe(1);
      expect(params.activeDrifts).toBeGreaterThan(0);
      expect(params.activePulses).toBe(1);
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
