/**
 * GPU Spring System Tests
 * 
 * These tests validate the spring system functionality and can be used
 * with Playwright for visual validation.
 */

import { describe, it, expect, beforeEach } from "vitest";
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
    getParameter: () => 35664, // MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS
    getUniformLocation: () => ({}) as WebGLUniformLocation,
    uniform1f: () => {},
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
  } as any;

  return gl;
};

describe("GPUSpringSystem", () => {
  let gl: any;
  let springs: GPUSpringSystem;

  beforeEach(() => {
    gl = createMockGL();
    springs = new GPUSpringSystem(gl);
  });

  describe("Basic Functionality", () => {
    it("should initialize with zero nodes", () => {
      expect(springs.nodeCount).toBe(0);
      expect(springs.springCount).toBe(0);
    });

    it("should create a simple grid mesh", () => {
      springs.createGrid({
        cols: 3,
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

      expect(springs.nodeCount).toBe(9); // 3x3 grid
      expect(springs.springCount).toBeGreaterThan(0);
    });

    it("should clear the mesh", () => {
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

      expect(springs.nodeCount).toBe(4);
      
      springs.clear();
      expect(springs.nodeCount).toBe(0);
      expect(springs.springCount).toBe(0);
    });
  });

  describe("Physics Properties", () => {
    it("should allow setting physics parameters", () => {
      springs.gravity = [0, -0.5];
      springs.damping = 0.05;
      springs.mouseForce = 1.0;
      springs.mouseX = 0.5;
      springs.mouseY = -0.3;
      springs.jiggle = 0.8;

      expect(springs.gravity).toEqual([0, -0.5]);
      expect(springs.damping).toBe(0.05);
      expect(springs.mouseForce).toBe(1.0);
      expect(springs.mouseX).toBe(0.5);
      expect(springs.mouseY).toBe(-0.3);
      expect(springs.jiggle).toBe(0.8);
    });

    it("should have default rendering settings", () => {
      expect(springs.drawLines).toBe(false);
      expect(springs.drawNodes).toBe(false);
      expect(springs.color).toEqual([0.4, 0.7, 1.0]);
    });

    it("should allow changing rendering settings", () => {
      springs.drawLines = true;
      springs.drawNodes = true;
      springs.color = [1.0, 0.0, 0.5];

      expect(springs.drawLines).toBe(true);
      expect(springs.drawNodes).toBe(true);
      expect(springs.color).toEqual([1.0, 0.0, 0.5]);
    });
  });

  describe("Mesh Creation", () => {
    it("should create different mesh configurations", () => {
      // Test jello mesh
      springs.createGrid({
        cols: 4,
        rows: 3,
        originX: -0.6,
        originY: -0.4,
        width: 1.2,
        height: 0.8,
        stiffness: 80,
        damping: 2.0,
        mass: 0.012,
        pinnedRow: 2,
        color: [0.8, 0.4, 0.6],
      });

      expect(springs.nodeCount).toBe(12); // 4x3 grid
      expect(springs.color).toEqual([0.8, 0.4, 0.6]);

      // Test cloth mesh
      springs.clear();
      springs.createGrid({
        cols: 5,
        rows: 4,
        originX: -0.7,
        originY: -0.5,
        width: 1.4,
        height: 1.0,
        stiffness: 120,
        damping: 1.5,
        mass: 0.008,
        pinnedRow: 3,
        color: [0.3, 0.6, 0.9],
      });

      expect(springs.nodeCount).toBe(20); // 5x4 grid
      expect(springs.color).toEqual([0.3, 0.6, 0.9]);
    });

    it("should handle edge cases", () => {
      // Single node
      springs.createGrid({
        cols: 1,
        rows: 1,
        originX: 0,
        originY: 0,
        width: 0.1,
        height: 0.1,
        stiffness: 100,
        damping: 2,
        mass: 0.01,
        pinnedRow: 0,
        color: [1.0, 0.0, 0.0],
      });

      expect(springs.nodeCount).toBe(1);

      // Large grid
      springs.clear();
      springs.createGrid({
        cols: 10,
        rows: 8,
        originX: -1,
        originY: -1,
        width: 2,
        height: 2,
        stiffness: 50,
        damping: 3,
        mass: 0.02,
        pinnedRow: 7,
        color: [0.0, 1.0, 0.0],
      });

      expect(springs.nodeCount).toBe(80); // 10x8 grid
    });
  });

  describe("Interaction Methods", () => {
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

    it("should support poke interaction", () => {
      // Should not throw with valid parameters
      expect(() => {
        springs.poke(0.0, 0.0, 0.3, 0.5);
      }).not.toThrow();

      // Should not throw with edge case parameters
      expect(() => {
        springs.poke(-1.0, 1.0, 0.1, 2.0);
      }).not.toThrow();
    });

    it("should handle poke on empty mesh", () => {
      springs.clear();
      expect(() => {
        springs.poke(0.0, 0.0, 0.3, 0.5);
      }).not.toThrow();
    });
  });

  describe("Update and Render", () => {
    beforeEach(() => {
      springs.createGrid({
        cols: 3,
        rows: 3,
        originX: -0.5,
        originY: -0.5,
        width: 1.0,
        height: 1.0,
        stiffness: 100,
        damping: 2,
        mass: 0.01,
        pinnedRow: 2,
        color: [0.8, 0.2, 0.8],
      });
    });

    it("should update without throwing", () => {
      expect(() => {
        springs.update(0.016, 1.0); // 60fps frame
      }).not.toThrow();
    });

    it("should render without throwing", () => {
      expect(() => {
        springs.render();
      }).not.toThrow();
    });

    it("should render with different settings", () => {
      springs.drawLines = true;
      springs.drawNodes = true;

      expect(() => {
        springs.render();
      }).not.toThrow();
    });

    it("should handle update on empty mesh", () => {
      springs.clear();
      expect(() => {
        springs.update(0.016, 1.0);
      }).not.toThrow();
    });

    it("should handle render on empty mesh", () => {
      springs.clear();
      expect(() => {
        springs.render();
      }).not.toThrow();
    });
  });
});
