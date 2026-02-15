import { describe, it, expect } from "vitest";
import { ParameterStore } from "../params";

describe("ParameterStore drift", () => {
  it("drifts a param toward target over duration", () => {
    const ps = new ParameterStore();
    ps.define("intensity", 0, 1, 0.2);
    ps.drift("intensity", 0.8, 2);

    expect(ps.activeDrifts).toBe(1);

    // Halfway through — smoothstep at t=0.5 is 0.5
    ps.tick(1.0);
    expect(ps.get("intensity")).toBeCloseTo(0.5, 1);

    // Complete
    ps.tick(1.5);
    expect(ps.get("intensity")).toBeCloseTo(0.8, 2);
    expect(ps.activeDrifts).toBe(0);
  });

  it("replaces existing drift on same param", () => {
    const ps = new ParameterStore();
    ps.define("speed", 0.1, 4, 1);
    ps.drift("speed", 3, 5);
    ps.drift("speed", 0.5, 2);
    expect(ps.activeDrifts).toBe(1);
  });

  it("ignores drift on unknown param", () => {
    const ps = new ParameterStore();
    ps.drift("nonexistent", 1, 1);
    expect(ps.activeDrifts).toBe(0);
  });

  it("ignores drift with zero duration", () => {
    const ps = new ParameterStore();
    ps.define("hue", 0, 1, 0);
    ps.drift("hue", 0.5, 0);
    expect(ps.activeDrifts).toBe(0);
  });

  it("clamps drifted value to param bounds", () => {
    const ps = new ParameterStore();
    ps.define("intensity", 0, 1, 0.5);
    ps.drift("intensity", 5, 1); // target exceeds max
    ps.tick(2);
    expect(ps.get("intensity")).toBe(1); // clamped to max
  });
});

describe("ParameterStore pulse", () => {
  it("creates a temporary oscillation", () => {
    const ps = new ParameterStore();
    ps.define("intensity", 0, 1, 0.5);
    ps.pulse("intensity", 0.2, 1, 3);

    expect(ps.activePulses).toBe(1);

    // After some time, value should differ from base
    ps.tick(0.25); // quarter period — sin should be ~1
    const val = ps.get("intensity");
    expect(val).not.toBeCloseTo(0.5, 1);
  });

  it("pulse expires after duration", () => {
    const ps = new ParameterStore();
    ps.define("speed", 0.1, 4, 1);
    ps.pulse("speed", 0.3, 1, 2);
    ps.tick(3);
    expect(ps.activePulses).toBe(0);
  });

  it("ignores pulse on unknown param", () => {
    const ps = new ParameterStore();
    ps.pulse("nonexistent", 0.1, 1, 1);
    expect(ps.activePulses).toBe(0);
  });

  it("multiple pulses can stack", () => {
    const ps = new ParameterStore();
    ps.define("hue", 0, 1, 0.5);
    ps.pulse("hue", 0.1, 1, 3);
    ps.pulse("hue", 0.05, 2, 3);
    expect(ps.activePulses).toBe(2);
  });
});
