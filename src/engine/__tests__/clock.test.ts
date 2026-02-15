import { describe, it, expect } from "vitest";
import { Clock } from "../clock";

describe("Clock", () => {
  it("starts at zero", () => {
    const c = new Clock();
    expect(c.elapsed).toBe(0);
    expect(c.delta).toBe(0);
    expect(c.beat).toBe(0);
  });

  it("accumulates elapsed time", () => {
    const c = new Clock();
    c.tick(0.016);
    c.tick(0.016);
    expect(c.elapsed).toBeCloseTo(0.032);
    expect(c.delta).toBeCloseTo(0.016);
  });

  it("computes beat from BPM", () => {
    const c = new Clock(120); // 2 beats per second
    c.tick(1.0);
    expect(c.beat).toBeCloseTo(2.0);
    c.tick(0.5);
    expect(c.beat).toBeCloseTo(3.0);
  });

  it("pauses and resumes", () => {
    const c = new Clock();
    c.tick(1.0);
    c.pause();
    c.tick(1.0);
    expect(c.elapsed).toBeCloseTo(1.0);
    expect(c.delta).toBe(0);
    c.resume();
    c.tick(0.5);
    expect(c.elapsed).toBeCloseTo(1.5);
  });

  it("seeks to a specific time", () => {
    const c = new Clock();
    c.tick(5.0);
    c.seek(2.0);
    expect(c.elapsed).toBeCloseTo(2.0);
  });

  it("seek clamps to zero", () => {
    const c = new Clock();
    c.seek(-10);
    expect(c.elapsed).toBe(0);
  });

  it("resets fully", () => {
    const c = new Clock();
    c.tick(5.0);
    c.pause();
    c.reset();
    expect(c.elapsed).toBe(0);
    expect(c.delta).toBe(0);
    expect(c.paused).toBe(false);
  });

  it("clamps BPM to at least 1", () => {
    const c = new Clock();
    c.bpm = -10;
    expect(c.bpm).toBe(1);
  });
});
