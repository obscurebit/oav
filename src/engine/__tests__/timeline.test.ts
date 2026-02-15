import { describe, it, expect } from "vitest";
import { Timeline } from "../timeline";

describe("Timeline", () => {
  it("returns null for empty timeline", () => {
    const tl = new Timeline();
    expect(tl.getActiveScene(0)).toBeNull();
  });

  it("returns active scene with progress", () => {
    const tl = new Timeline();
    tl.add({ startTime: 0, endTime: 10, sceneId: "intro" });
    const scene = tl.getActiveScene(5);
    expect(scene).not.toBeNull();
    expect(scene!.sceneId).toBe("intro");
    expect(scene!.progress).toBeCloseTo(0.5);
    expect(scene!.localTime).toBeCloseTo(5);
  });

  it("returns null before first scene", () => {
    const tl = new Timeline();
    tl.add({ startTime: 5, endTime: 10, sceneId: "late" });
    expect(tl.getActiveScene(2)).toBeNull();
  });

  it("returns null at exact end time (exclusive)", () => {
    const tl = new Timeline();
    tl.add({ startTime: 0, endTime: 10, sceneId: "intro" });
    expect(tl.getActiveScene(10)).toBeNull();
  });

  it("handles multiple sequential scenes", () => {
    const tl = new Timeline();
    tl.add({ startTime: 0, endTime: 10, sceneId: "a" });
    tl.add({ startTime: 10, endTime: 20, sceneId: "b" });
    expect(tl.getActiveScene(5)!.sceneId).toBe("a");
    expect(tl.getActiveScene(15)!.sceneId).toBe("b");
  });

  it("later entries take priority on overlap", () => {
    const tl = new Timeline();
    tl.add({ startTime: 0, endTime: 15, sceneId: "bg" });
    tl.add({ startTime: 5, endTime: 10, sceneId: "overlay" });
    // At t=7, both cover it, but "overlay" (later entry) wins
    expect(tl.getActiveScene(7)!.sceneId).toBe("overlay");
    // At t=12, only "bg" covers it
    expect(tl.getActiveScene(12)!.sceneId).toBe("bg");
  });

  it("sorts entries by start time", () => {
    const tl = new Timeline();
    tl.add({ startTime: 10, endTime: 20, sceneId: "b" });
    tl.add({ startTime: 0, endTime: 10, sceneId: "a" });
    expect(tl.getActiveScene(5)!.sceneId).toBe("a");
    expect(tl.getActiveScene(15)!.sceneId).toBe("b");
  });

  it("computes total duration", () => {
    const tl = new Timeline();
    tl.add({ startTime: 0, endTime: 10, sceneId: "a" });
    tl.add({ startTime: 10, endTime: 30, sceneId: "b" });
    expect(tl.duration).toBe(30);
  });

  it("reports length", () => {
    const tl = new Timeline();
    expect(tl.length).toBe(0);
    tl.add({ startTime: 0, endTime: 10, sceneId: "a" });
    expect(tl.length).toBe(1);
  });
});

describe("Timeline transitions", () => {
  it("returns null for empty timeline", () => {
    const tl = new Timeline();
    expect(tl.getTransitionState(0)).toBeNull();
  });

  it("returns blend=1 with no transition duration", () => {
    const tl = new Timeline();
    tl.add({ startTime: 0, endTime: 10, sceneId: "a" });
    const ts = tl.getTransitionState(5);
    expect(ts).not.toBeNull();
    expect(ts!.current.sceneId).toBe("a");
    expect(ts!.previous).toBeNull();
    expect(ts!.blend).toBe(1);
  });

  it("returns blend=1 when past transition duration", () => {
    const tl = new Timeline();
    tl.add({ startTime: 0, endTime: 10, sceneId: "a" });
    tl.add({ startTime: 10, endTime: 20, sceneId: "b", transitionDuration: 3 });
    const ts = tl.getTransitionState(15);
    expect(ts!.current.sceneId).toBe("b");
    expect(ts!.previous).toBeNull();
    expect(ts!.blend).toBe(1);
  });

  it("returns partial blend during transition", () => {
    const tl = new Timeline();
    tl.add({ startTime: 0, endTime: 10, sceneId: "a" });
    tl.add({ startTime: 10, endTime: 20, sceneId: "b", transitionDuration: 4 });
    // At t=12, we're 2s into a 4s transition → blend = 0.5
    const ts = tl.getTransitionState(12);
    expect(ts!.current.sceneId).toBe("b");
    expect(ts!.previous).not.toBeNull();
    expect(ts!.previous!.sceneId).toBe("a");
    expect(ts!.blend).toBeCloseTo(0.5);
  });

  it("blend is 0 at exact scene start with transition", () => {
    const tl = new Timeline();
    tl.add({ startTime: 0, endTime: 10, sceneId: "a" });
    tl.add({ startTime: 10, endTime: 20, sceneId: "b", transitionDuration: 5 });
    const ts = tl.getTransitionState(10);
    expect(ts!.blend).toBeCloseTo(0);
    expect(ts!.previous!.sceneId).toBe("a");
  });

  it("first scene has no previous even with transitionDuration", () => {
    const tl = new Timeline();
    tl.add({ startTime: 0, endTime: 10, sceneId: "a", transitionDuration: 3 });
    const ts = tl.getTransitionState(1);
    expect(ts!.current.sceneId).toBe("a");
    expect(ts!.previous).toBeNull();
    expect(ts!.blend).toBeCloseTo(1 / 3);
  });
});
