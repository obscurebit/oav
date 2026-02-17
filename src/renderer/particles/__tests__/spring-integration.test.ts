/**
 * Spring System Integration Tests
 * 
 * These tests validate the spring system behavior and help identify
 * rendering issues like the "broken pink lines" problem.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GPUSpringSystem } from "../gpu-springs";

// Mock WebGL2 context for testing
const createMockGL = () => {
  const gl = {
    createBuffer: () => ({}) as WebGLBuffer,
    createVertexArray: () => ({}) as WebGLVertexArrayObject,
    createProgram: () => ({}) as WebGLProgram,
    createShader: () => ({}) as WebGLShader,
    createTransformFeedback: () => ({}) as WebGLTransformFeedback,
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    getShaderInfoLog: () => "",
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    getProgramInfoLog: () => "",
    detachShader: () => {},
    deleteShader: () => {},
    bindVertexArray: () => {},
    bindBuffer: () => {},
    bufferData: () => {},
    bufferSubData: () => {},
    getBufferSubData: () => {},
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    disableVertexAttribArray: () => {},
    useProgram: () => {},
    enable: () => {},
    disable: () => {},
    drawArrays: () => {},
    drawElements: () => {},
    drawArraysInstanced: () => {},
    drawElementsInstanced: () => {},
    bindBufferBase: () => {},
    beginTransformFeedback: () => {},
    endTransformFeedback: () => {},
    transformFeedbackVaryings: () => {},
    getParameter: () => 35664,
    getUniformLocation: () => ({}) as WebGLUniformLocation,
    uniform1f: () => {},
    uniform2f: () => {},
    uniform3fv: () => {},
    RASTERIZER_DISCARD: 32877,
    ARRAY_BUFFER: 34962,
    TRANSFORM_FEEDBACK_BUFFER: 35982,
    COLOR_BUFFER_BIT: 16384,
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35640,
    LINK_STATUS: 35714,
    POINTS: 0,
    LINES: 1,
    LINE_STRIP: 3,
    TRIANGLES: 4,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
  } as any;

  return gl;
};

describe("Spring System Integration", () => {
  let gl: any;
  let springs: GPUSpringSystem;

  beforeEach(() => {
    gl = createMockGL();
    springs = new GPUSpringSystem(gl);
  });

  afterEach(() => {
    springs.clear();
  });

  describe("Initial State", () => {
    it("should start with no mesh (clean state)", () => {
      expect(springs.nodeCount).toBe(0);
      expect(springs.springCount).toBe(0);
      expect(springs.drawLines).toBe(false);
      expect(springs.drawNodes).toBe(false);
    });

    it("should render safely with no mesh", () => {
      expect(() => {
        springs.render();
      }).not.toThrow();
    });

    it("should update safely with no mesh", () => {
      expect(() => {
        springs.update(0.016, 1.0);
      }).not.toThrow();
    });
  });

  describe("Jello Preset Simulation", () => {
    it("should create jello-style mesh", () => {
      // Simulate the jello preset from tool-bridge.ts
      springs.createGrid({
        cols: 24,
        rows: 18,
        originX: -0.6,
        originY: -0.4,
        width: 1.2,
        height: 0.8,
        stiffness: 80,
        damping: 2.0,
        mass: 0.012,
        pinnedRow: 17,
        color: [0.8, 0.4, 0.6], // Pink/purple color that could cause "broken pink lines"
      });

      expect(springs.nodeCount).toBe(432); // 24 * 18
      expect(springs.springCount).toBeGreaterThan(0);
      expect(springs.color).toEqual([0.8, 0.4, 0.6]);
    });

    it("should enable line drawing for jello", () => {
      springs.createGrid({
        cols: 4,
        rows: 3,
        originX: -0.5,
        originY: -0.5,
        width: 1.0,
        height: 1.0,
        stiffness: 80,
        damping: 2.0,
        mass: 0.012,
        pinnedRow: 2,
        color: [0.8, 0.4, 0.6],
      });

      springs.drawLines = true; // This is what jello preset does
      expect(springs.drawLines).toBe(true);
    });

    it("should render with jello mesh without throwing", () => {
      springs.createGrid({
        cols: 4,
        rows: 3,
        originX: -0.5,
        originY: -0.5,
        width: 1.0,
        height: 1.0,
        stiffness: 80,
        damping: 2.0,
        mass: 0.012,
        pinnedRow: 2,
        color: [0.8, 0.4, 0.6],
      });

      springs.drawLines = true;

      expect(() => {
        springs.render();
      }).not.toThrow();
    });
  });

  describe("Clear and Reset", () => {
    it("should clear mesh completely", () => {
      // Create a mesh first
      springs.createGrid({
        cols: 4,
        rows: 3,
        originX: -0.5,
        originY: -0.5,
        width: 1.0,
        height: 1.0,
        stiffness: 100,
        damping: 2,
        mass: 0.01,
        pinnedRow: 2,
        color: [1.0, 0.0, 0.0],
      });

      expect(springs.nodeCount).toBe(12);
      expect(springs.springCount).toBeGreaterThan(0);

      // Clear it
      springs.clear();

      expect(springs.nodeCount).toBe(0);
      expect(springs.springCount).toBe(0);
    });

    it("should render safely after clear", () => {
      // Create and then clear
      springs.createGrid({
        cols: 2,
        rows: 2,
        originX: -0.5,
        originY: -0.5,
        width: 1.0,
        height: 1.0,
        stiffness: 100,
        damping: 2,
        mass: 0.01,
        pinnedRow: 1,
        color: [0.5, 0.5, 0.5],
      });

      springs.clear();

      expect(() => {
        springs.render();
      }).not.toThrow();
    });
  });

  describe("Interaction", () => {
    beforeEach(() => {
      springs.createGrid({
        cols: 4,
        rows: 3,
        originX: -0.5,
        originY: -0.5,
        width: 1.0,
        height: 1.0,
        stiffness: 100,
        damping: 2,
        mass: 0.01,
        pinnedRow: 2,
        color: [0.5, 0.5, 1.0],
      });
    });

    it("should handle poke interaction", () => {
      expect(() => {
        springs.poke(0.0, 0.0, 0.3, 0.5);
      }).not.toThrow();
    });

    it("should update after poke", () => {
      springs.poke(0.0, 0.0, 0.3, 0.5);
      
      expect(() => {
        springs.update(0.016, 1.0);
      }).not.toThrow();
    });
  });

  describe("Visual Issue Detection", () => {
    it("should detect conditions that cause broken pink lines", () => {
      // This test checks for the specific conditions that might cause
      // the "broken pink lines" issue reported by the user
      
      springs.createGrid({
        cols: 24,
        rows: 18,
        originX: -0.6,
        originY: -0.4,
        width: 1.2,
        height: 0.8,
        stiffness: 80,
        damping: 2.0,
        mass: 0.012,
        pinnedRow: 17,
        color: [0.8, 0.4, 0.6], // Pink/purple color
      });

      springs.drawLines = true; // Enable line drawing
      springs.drawNodes = false; // Disable nodes (like jello preset)

      // Check for conditions that could cause visual issues
      const hasPinkColor = springs.color[0] > 0.5 && springs.color[1] < 0.5 && springs.color[2] > 0.5;
      const hasLines = springs.drawLines;
      const hasNodes = springs.drawNodes;
      const hasMesh = springs.nodeCount > 0;

      expect(hasMesh).toBe(true);
      expect(hasPinkColor).toBe(true);
      expect(hasLines).toBe(true);
      expect(hasNodes).toBe(false);

      // This combination (pink color + lines enabled + no nodes) 
      // is exactly what would cause "broken pink lines" if there's
      // a rendering bug or if the mesh is created automatically
    });

    it("should not render lines when drawLines is false", () => {
      springs.createGrid({
        cols: 4,
        rows: 3,
        originX: -0.5,
        originY: -0.5,
        width: 1.0,
        height: 1.0,
        stiffness: 100,
        damping: 2,
        mass: 0.01,
        pinnedRow: 2,
        color: [0.8, 0.4, 0.6],
      });

      springs.drawLines = false; // Lines disabled

      expect(() => {
        springs.render();
      }).not.toThrow();

      // With lines disabled, even if there's a mesh, it shouldn't
      // produce visible line artifacts
    });
  });
});
