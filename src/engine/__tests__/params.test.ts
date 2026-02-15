import { describe, it, expect } from "vitest";
import { ParameterStore } from "../params";

describe("ParameterStore", () => {
  it("defines and retrieves a parameter", () => {
    const p = new ParameterStore();
    p.define("intensity", 0, 1, 0.5);
    expect(p.get("intensity")).toBe(0.5);
  });

  it("returns 0 for undefined parameters", () => {
    const p = new ParameterStore();
    expect(p.get("nope")).toBe(0);
  });

  it("clamps on define", () => {
    const p = new ParameterStore();
    p.define("x", 0, 1, 5);
    expect(p.get("x")).toBe(1);
  });

  it("clamps on set", () => {
    const p = new ParameterStore();
    p.define("x", 0, 10, 5);
    p.set("x", 20);
    expect(p.get("x")).toBe(10);
    p.set("x", -5);
    expect(p.get("x")).toBe(0);
  });

  it("ignores set for undefined keys", () => {
    const p = new ParameterStore();
    p.set("ghost", 42);
    expect(p.get("ghost")).toBe(0);
  });

  it("patches multiple values", () => {
    const p = new ParameterStore();
    p.define("a", 0, 1, 0);
    p.define("b", 0, 1, 0);
    p.patch({ a: 0.7, b: 0.3, unknown: 99 });
    expect(p.get("a")).toBeCloseTo(0.7);
    expect(p.get("b")).toBeCloseTo(0.3);
  });

  it("computes normalized value", () => {
    const p = new ParameterStore();
    p.define("x", 10, 20, 15);
    expect(p.getNormalized("x")).toBeCloseTo(0.5);
  });

  it("normalized returns 0 for equal min/max", () => {
    const p = new ParameterStore();
    p.define("flat", 5, 5, 5);
    expect(p.getNormalized("flat")).toBe(0);
  });

  it("has() checks existence", () => {
    const p = new ParameterStore();
    p.define("x", 0, 1, 0);
    expect(p.has("x")).toBe(true);
    expect(p.has("y")).toBe(false);
  });

  it("snapshot returns all values", () => {
    const p = new ParameterStore();
    p.define("a", 0, 1, 0.1);
    p.define("b", 0, 1, 0.9);
    const snap = p.snapshot();
    expect(snap).toEqual({ a: 0.1, b: 0.9 });
  });

  it("keys returns all parameter names", () => {
    const p = new ParameterStore();
    p.define("alpha", 0, 1, 0);
    p.define("beta", 0, 1, 0);
    expect(p.keys().sort()).toEqual(["alpha", "beta"]);
  });
});
