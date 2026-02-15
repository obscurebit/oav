import { describe, it, expect } from "vitest";
import { TextParticleSystem } from "../text-particles";

describe("TextParticleSystem", () => {
  it("starts empty", () => {
    const ps = new TextParticleSystem();
    expect(ps.count).toBe(0);
    expect(ps.particles).toEqual([]);
  });

  it("addVoice creates a voice particle", () => {
    const ps = new TextParticleSystem();
    ps.addVoice("waiting", 1000, 800);
    expect(ps.count).toBe(1);
    expect(ps.particles[0].kind).toBe("voice");
    expect(ps.particles[0].text).toBe("waiting");
    expect(ps.particles[0].opacity).toBe(0);
  });

  it("addEcho creates an echo particle", () => {
    const ps = new TextParticleSystem();
    ps.addEcho("closer", 1000, 800);
    expect(ps.count).toBe(1);
    expect(ps.particles[0].kind).toBe("echo");
  });

  it("addUserChar creates a user particle", () => {
    const ps = new TextParticleSystem();
    ps.addUserChar("h", 500, 400);
    expect(ps.count).toBe(1);
    expect(ps.particles[0].kind).toBe("user");
    expect(ps.particles[0].text).toBe("h");
  });

  it("update advances age and fades in", () => {
    const ps = new TextParticleSystem();
    ps.addVoice("test", 1000, 800);
    ps.update(0.5);
    const p = ps.particles[0];
    expect(p.age).toBeCloseTo(0.5);
    // fadeIn is 1.5s, so at 0.5s opacity should be ~0.33
    expect(p.opacity).toBeCloseTo(0.5 / 1.5, 1);
  });

  it("particles reach full opacity during hold phase", () => {
    const ps = new TextParticleSystem();
    ps.addVoice("test", 1000, 800);
    // Advance past fadeIn (1.5s) into hold
    ps.update(2.0);
    expect(ps.particles[0].opacity).toBeCloseTo(1.0);
  });

  it("particles fade out and are removed after total lifetime", () => {
    const ps = new TextParticleSystem();
    ps.addVoice("test", 1000, 800);
    // Total life = fadeIn(1.5) + hold(3.0) + fadeOut(2.5) = 7.0
    ps.update(8.0);
    expect(ps.count).toBe(0);
  });

  it("user particles have shorter lifetime", () => {
    const ps = new TextParticleSystem();
    ps.addUserChar("x", 500, 400);
    // Total life = fadeIn(0.15) + hold(0.8) + fadeOut(1.2) = 2.15
    ps.update(3.0);
    expect(ps.count).toBe(0);
  });

  it("clear removes all particles", () => {
    const ps = new TextParticleSystem();
    ps.addVoice("a", 1000, 800);
    ps.addVoice("b", 1000, 800);
    ps.addUserChar("c", 500, 400);
    expect(ps.count).toBe(3);
    ps.clear();
    expect(ps.count).toBe(0);
  });

  it("particles drift with velocity", () => {
    const ps = new TextParticleSystem();
    ps.addVoice("drift", 1000, 800);
    const startX = ps.particles[0].x;
    const startY = ps.particles[0].y;
    ps.update(1.0);
    // Position should have changed (velocity is non-zero)
    const p = ps.particles[0];
    expect(p.x !== startX || p.y !== startY).toBe(true);
  });
});
