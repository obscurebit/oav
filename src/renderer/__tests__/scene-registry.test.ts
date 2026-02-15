import { describe, it, expect, vi } from "vitest";
import { SceneRegistry } from "../scene";
import type { Scene, SceneState } from "../scene";

function mockScene(id: string): Scene {
  return {
    id,
    init: vi.fn(),
    draw: vi.fn(),
    dispose: vi.fn(),
  };
}

describe("SceneRegistry", () => {
  it("registers and retrieves a scene", () => {
    const reg = new SceneRegistry();
    const s = mockScene("intro");
    reg.register(s);
    expect(reg.get("intro")).toBe(s);
  });

  it("returns undefined for unknown scene", () => {
    const reg = new SceneRegistry();
    expect(reg.get("nope")).toBeUndefined();
  });

  it("has() checks existence", () => {
    const reg = new SceneRegistry();
    reg.register(mockScene("a"));
    expect(reg.has("a")).toBe(true);
    expect(reg.has("b")).toBe(false);
  });

  it("lists all registered IDs", () => {
    const reg = new SceneRegistry();
    reg.register(mockScene("a"));
    reg.register(mockScene("b"));
    reg.register(mockScene("c"));
    expect(reg.ids.sort()).toEqual(["a", "b", "c"]);
  });

  it("initAll calls init on every scene", () => {
    const reg = new SceneRegistry();
    const s1 = mockScene("a");
    const s2 = mockScene("b");
    reg.register(s1);
    reg.register(s2);

    const fakeGl = {} as WebGL2RenderingContext;
    const fakeVao = {} as WebGLVertexArrayObject;
    reg.initAll(fakeGl, fakeVao);

    expect(s1.init).toHaveBeenCalledWith(fakeGl, fakeVao);
    expect(s2.init).toHaveBeenCalledWith(fakeGl, fakeVao);
  });

  it("disposeAll calls dispose on every scene", () => {
    const reg = new SceneRegistry();
    const s1 = mockScene("a");
    const s2 = mockScene("b");
    reg.register(s1);
    reg.register(s2);

    const fakeGl = {} as WebGL2RenderingContext;
    reg.disposeAll(fakeGl);

    expect(s1.dispose).toHaveBeenCalledWith(fakeGl);
    expect(s2.dispose).toHaveBeenCalledWith(fakeGl);
  });

  it("overwrites scene with same id", () => {
    const reg = new SceneRegistry();
    const s1 = mockScene("x");
    const s2 = mockScene("x");
    reg.register(s1);
    reg.register(s2);
    expect(reg.get("x")).toBe(s2);
    expect(reg.ids).toEqual(["x"]);
  });
});
