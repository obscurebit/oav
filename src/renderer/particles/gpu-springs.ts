/**
 * GPU Mass-Spring System — jello, cloth, tendrils, webs.
 *
 * Nodes are connected by springs (Hooke's law + damping).
 * Spring forces are computed on the CPU each frame (WebGL2 has no compute shaders),
 * then uploaded. Position/velocity integration happens on the GPU via transform feedback.
 *
 * Node layout: position(2), velocity(2), restPosition(2), mass(1), pinned(1), force(2) = 10 floats
 * Springs are stored CPU-side as index pairs with stiffness and rest length.
 *
 * Inspired by the spring-centric approach from:
 * "Real-Time Cloth Simulation Using WebGPU" (arxiv 2507.11794)
 */

import { compileShader } from "../gl";
import updateVertSrc from "./spring-update.vert";
import renderVertSrc from "./spring-render.vert";
import renderFragSrc from "./spring-render.frag";
import lineVertSrc from "./spring-line.vert";
import lineFragSrc from "./spring-line.frag";

const FLOATS_PER_NODE = 10;
const MAX_NODES = 4096;

const NODE_ATTRIBS = [
  { name: "aPosition",     size: 2 },
  { name: "aVelocity",     size: 2 },
  { name: "aRestPosition", size: 2 },
  { name: "aMass",         size: 1 },
  { name: "aPinned",       size: 1 },
  { name: "aForce",        size: 2 },
];

const TF_VARYINGS = ["vPosition", "vVelocity", "vRestPosition", "vMass", "vPinned", "vForce"];

export interface Spring {
  a: number;  // node index A
  b: number;  // node index B
  stiffness: number;
  damping: number;
  restLength: number;
}

export interface SpringMeshConfig {
  /** Grid dimensions for auto-generated mesh */
  cols: number;
  rows: number;
  /** World-space bounds [-1, 1] */
  originX: number;
  originY: number;
  width: number;
  height: number;
  /** Spring properties */
  stiffness: number;
  damping: number;
  /** Node mass */
  mass: number;
  /** Which row to pin (0 = top row, -1 = none) */
  pinnedRow: number;
  /** Base color [r, g, b] */
  color: [number, number, number];
}

export class GPUSpringSystem {
  private _gl: WebGL2RenderingContext;

  // Double-buffered
  private _vaos: [WebGLVertexArrayObject, WebGLVertexArrayObject];
  private _vbos: [WebGLBuffer, WebGLBuffer];
  private _current = 0;

  // Programs
  private _updateProgram: WebGLProgram;
  private _renderProgram: WebGLProgram;  // For points
  private _lineProgram: WebGLProgram;   // For lines
  private _tf: WebGLTransformFeedback;

  // Spring line rendering
  private _lineVao: WebGLVertexArrayObject | null = null;
  private _lineIbo: WebGLBuffer | null = null;
  private _lineCount = 0;

  // CPU data
  private _nodeData: Float32Array;
  private _springs: Spring[] = [];
  private _nodeCount = 0;

  // Physics
  gravity: [number, number] = [0, -0.3];
  damping = 0.03;
  mouseForce = 0;
  mouseX = 0;
  mouseY = 0;
  jiggle = 0;

  // Rendering
  color: [number, number, number] = [0.4, 0.7, 1.0];
  drawLines = false; // Disabled by default to prevent line artifacts
  drawNodes = false; // Disabled by default

  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
    this._nodeData = new Float32Array(MAX_NODES * FLOATS_PER_NODE);

    this._updateProgram = this._createUpdateProgram(gl);
    this._renderProgram = this._createRenderProgram(gl);
    this._lineProgram = this._createLineProgram(gl);

    this._vbos = [gl.createBuffer()!, gl.createBuffer()!];
    this._vaos = [gl.createVertexArray()!, gl.createVertexArray()!];

    for (let i = 0; i < 2; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vbos[i]);
      gl.bufferData(gl.ARRAY_BUFFER, this._nodeData, gl.DYNAMIC_DRAW);
      this._setupVAO(gl, this._vaos[i], this._vbos[i], this._updateProgram);
    }

    this._tf = gl.createTransformFeedback()!;
  }

  /** Create a rectangular grid mesh (jello, cloth, etc.) */
  createGrid(config: SpringMeshConfig): void {
    const { cols, rows, originX, originY, width, height, stiffness, damping: springDamp, mass, pinnedRow } = config;
    this.color = config.color;

    const nodeCount = cols * rows;
    if (nodeCount > MAX_NODES) {
      console.warn(`[Springs] Grid ${cols}x${rows}=${nodeCount} exceeds MAX_NODES ${MAX_NODES}`);
      return;
    }

    console.log(`[Springs] Creating grid: ${cols}x${rows}, color: [${config.color.join(', ')}]`);
    this._nodeCount = nodeCount;
    this._springs = [];

    // Create nodes
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const off = idx * FLOATS_PER_NODE;

        const x = originX + (c / (cols - 1)) * width;
        const y = originY + (r / (rows - 1)) * height;

        // Position
        this._nodeData[off + 0] = x;
        this._nodeData[off + 1] = y;
        // Velocity
        this._nodeData[off + 2] = 0;
        this._nodeData[off + 3] = 0;
        // Rest position
        this._nodeData[off + 4] = x;
        this._nodeData[off + 5] = y;
        // Mass
        this._nodeData[off + 6] = mass;
        // Pinned
        this._nodeData[off + 7] = (r === pinnedRow) ? 1.0 : 0.0;
        // Force (zeroed)
        this._nodeData[off + 8] = 0;
        this._nodeData[off + 9] = 0;
      }
    }

    // Create springs
    const dx = width / (cols - 1);
    const dy = height / (rows - 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;

        // Structural springs (horizontal + vertical) - primary constraints
        if (c < cols - 1) {
          this._springs.push({ a: idx, b: idx + 1, stiffness, damping: springDamp, restLength: dx });
        }
        if (r < rows - 1) {
          this._springs.push({ a: idx, b: idx + cols, stiffness, damping: springDamp, restLength: dy });
        }

        // Shear springs (diagonals) — resist shearing deformation
        if (c < cols - 1 && r < rows - 1) {
          const diag = Math.sqrt(dx * dx + dy * dy);
          this._springs.push({ a: idx, b: idx + cols + 1, stiffness: stiffness * 0.5, damping: springDamp * 0.5, restLength: diag });
          this._springs.push({ a: idx + 1, b: idx + cols, stiffness: stiffness * 0.5, damping: springDamp * 0.5, restLength: diag });
        }

        // Bend springs (skip one) — resist bending
        if (c < cols - 2) {
          this._springs.push({ a: idx, b: idx + 2, stiffness: stiffness * 0.25, damping: springDamp * 0.25, restLength: dx * 2 });
        }
        if (r < rows - 2) {
          this._springs.push({ a: idx, b: idx + cols * 2, stiffness: stiffness * 0.25, damping: springDamp * 0.25, restLength: dy * 2 });
        }

        // Bend resistance springs (skip two) - paper-inspired for better cloth behavior
        if (c < cols - 3) {
          this._springs.push({ a: idx, b: idx + 3, stiffness: stiffness * 0.1, damping: springDamp * 0.1, restLength: dx * 3 });
        }
        if (r < rows - 3) {
          this._springs.push({ a: idx, b: idx + cols * 3, stiffness: stiffness * 0.1, damping: springDamp * 0.1, restLength: dy * 3 });
        }
      }
    }

    // Upload to GPU
    const gl = this._gl;
    for (let i = 0; i < 2; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vbos[i]);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._nodeData);
    }

    // Build line index buffer for spring rendering
    this._buildLineIBO(gl);

    console.log(`[Springs] Created ${cols}x${rows} grid: ${nodeCount} nodes, ${this._springs.length} springs`);
  }

  /** Compute spring forces on CPU, then integrate on GPU. */
  update(dt: number, time: number): void {
    if (this._nodeCount === 0) return;

    // --- CPU: compute spring forces (Hooke's law + damping) ---
    // Zero force accumulators
    for (let i = 0; i < this._nodeCount; i++) {
      const off = i * FLOATS_PER_NODE;
      this._nodeData[off + 8] = 0;
      this._nodeData[off + 9] = 0;
    }

    // Accumulate spring forces using paper's mathematical approach
    for (const spring of this._springs) {
      const offA = spring.a * FLOATS_PER_NODE;
      const offB = spring.b * FLOATS_PER_NODE;

      // Positions
      const ax = this._nodeData[offA + 0];
      const ay = this._nodeData[offA + 1];
      const bx = this._nodeData[offB + 0];
      const by = this._nodeData[offB + 1];

      // Velocity
      const avx = this._nodeData[offA + 2];
      const avy = this._nodeData[offA + 3];
      const bvx = this._nodeData[offB + 2];
      const bvy = this._nodeData[offB + 3];

      // Direction vector from A to B
      let dx = bx - ax;
      let dy = by - ay;
      const currentLength = Math.sqrt(dx * dx + dy * dy);
      
      // Prevent division by zero and handle degenerate springs
      if (currentLength < 0.0001) {
        // If springs are completely collapsed, apply small random force
        const angle = Math.random() * Math.PI * 2;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
      } else {
        dx /= currentLength;
        dy /= currentLength;
      }

      // Hooke's Law: F_spring = k * (currentLength - restLength)
      const stretch = currentLength - spring.restLength;
      const springForce = spring.stiffness * stretch;

      // Improved damping: F_damping = d * (relativeVelocity · direction)
      // Relative velocity along spring direction
      const relVelX = bvx - avx;
      const relVelY = bvy - avy;
      const relVelAlongSpring = relVelX * dx + relVelY * dy;
      
      // Apply damping only when springs are compressing/extending
      const dampingForce = spring.damping * relVelAlongSpring;

      // Total force along spring direction
      const totalForce = springForce + dampingForce;

      // Apply equal and opposite forces (Newton's third law)
      // Force on node A: +F (toward B if stretched, away if compressed)
      // Force on node B: -F (toward A if stretched, away if compressed)
      this._nodeData[offA + 8] += totalForce * dx;
      this._nodeData[offA + 9] += totalForce * dy;
      this._nodeData[offB + 8] -= totalForce * dx;
      this._nodeData[offB + 9] -= totalForce * dy;
    }

    // Upload forces to current read buffer
    const gl = this._gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbos[this._current]);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._nodeData, 0, this._nodeCount * FLOATS_PER_NODE);

    // --- GPU: integrate via transform feedback ---
    const readIdx = this._current;
    const writeIdx = 1 - readIdx;

    gl.useProgram(this._updateProgram);
    gl.uniform1f(gl.getUniformLocation(this._updateProgram, "uDt"), Math.min(dt, 0.02));
    gl.uniform2fv(gl.getUniformLocation(this._updateProgram, "uGravity"), this.gravity);
    gl.uniform1f(gl.getUniformLocation(this._updateProgram, "uDamping"), this.damping);
    gl.uniform1f(gl.getUniformLocation(this._updateProgram, "uMouseX"), this.mouseX);
    gl.uniform1f(gl.getUniformLocation(this._updateProgram, "uMouseY"), this.mouseY);
    gl.uniform1f(gl.getUniformLocation(this._updateProgram, "uMouseForce"), this.mouseForce);
    gl.uniform1f(gl.getUniformLocation(this._updateProgram, "uJiggle"), this.jiggle);
    gl.uniform1f(gl.getUniformLocation(this._updateProgram, "uTime"), time);

    gl.bindVertexArray(this._vaos[readIdx]);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this._tf);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this._vbos[writeIdx]);

    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, this._nodeCount);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindVertexArray(null);

    this._current = writeIdx;

    // Read back positions for next frame's spring force computation
    // We use gl.getBufferSubData to sync CPU data
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbos[this._current]);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, this._nodeData, 0, this._nodeCount * FLOATS_PER_NODE);
  }

  /** Render the spring mesh (lines + nodes). */
  render(): void {
    if (this._nodeCount === 0) {
      // Debug: Log that render is being skipped due to no nodes
      // console.log("[Springs] Render skipped: no nodes");
      return;
    }

    const gl = this._gl;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive

    // Draw spring lines
    if (this.drawLines && this._lineVao && this._lineIbo && this._lineCount > 0) {
      gl.useProgram(this._lineProgram);
      gl.uniform2f(gl.getUniformLocation(this._lineProgram, "uResolution"), gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform3fv(gl.getUniformLocation(this._lineProgram, "uBaseColor"), this.color);
      gl.uniform1f(gl.getUniformLocation(this._lineProgram, "uTime"), 0);

      gl.bindVertexArray(this._lineVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vbos[this._current]);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._lineIbo);
      gl.drawElements(gl.LINES, this._lineCount * 2, gl.UNSIGNED_SHORT, 0);
      gl.bindVertexArray(null);
    }

    // Draw nodes as points
    if (this.drawNodes) {
      gl.useProgram(this._renderProgram);
      gl.uniform2f(gl.getUniformLocation(this._renderProgram, "uResolution"), gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform3fv(gl.getUniformLocation(this._renderProgram, "uBaseColor"), this.color);
      gl.uniform1f(gl.getUniformLocation(this._renderProgram, "uTime"), 0);

      this._bindRenderVAO(this._current);
      gl.drawArrays(gl.POINTS, 0, this._nodeCount);
      gl.bindVertexArray(null);
    }

    gl.disable(gl.BLEND);
  }

  /** Apply a force impulse to all nodes near a point. */
  poke(x: number, y: number, radius: number, force: number): void {
    for (let i = 0; i < this._nodeCount; i++) {
      const off = i * FLOATS_PER_NODE;
      if (this._nodeData[off + 7] > 0.5) continue; // skip pinned

      const dx = this._nodeData[off + 0] - x;
      const dy = this._nodeData[off + 1] - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius && dist > 0.001) {
        const strength = force * (1.0 - dist / radius);
        this._nodeData[off + 2] += (dx / dist) * strength; // velocity impulse
        this._nodeData[off + 3] += (dy / dist) * strength;
      }
    }

    // Upload velocity changes
    const gl = this._gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbos[this._current]);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._nodeData, 0, this._nodeCount * FLOATS_PER_NODE);
  }

  get nodeCount(): number { return this._nodeCount; }
  get springCount(): number { return this._springs.length; }

  /** Clear the mesh (remove all nodes and springs) */
  clear(): void {
    console.log(`[Springs] Clearing mesh: ${this._nodeCount} nodes, ${this._springs.length} springs`);
    this._nodeCount = 0;
    this._springs = [];
    // Clear node data
    for (let i = 0; i < this._nodeData.length; i++) {
      this._nodeData[i] = 0;
    }
  }

  // --- Internal ---

  private _buildLineIBO(gl: WebGL2RenderingContext): void {
    const indices = new Uint16Array(this._springs.length * 2);
    for (let i = 0; i < this._springs.length; i++) {
      indices[i * 2] = this._springs[i].a;
      indices[i * 2 + 1] = this._springs[i].b;
    }

    if (!this._lineIbo) {
      this._lineIbo = gl.createBuffer()!;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._lineIbo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    this._lineCount = this._springs.length;

    // Set up line VAO
    this._setupLineVAO(gl);
  }

  private _setupLineVAO(gl: WebGL2RenderingContext): void {
    if (!this._lineVao) {
      this._lineVao = gl.createVertexArray()!;
    }
    gl.bindVertexArray(this._lineVao);
    
    // Bind the current vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbos[this._current]);
    
    // Set up attributes for line program (same as render program)
    const stride = FLOATS_PER_NODE * 4;
    let offset = 0;

    for (const attr of NODE_ATTRIBS) {
      const loc = gl.getAttribLocation(this._lineProgram, attr.name);
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, attr.size, gl.FLOAT, false, stride, offset);
      }
      offset += attr.size * 4;
    }

    gl.bindVertexArray(null);
  }

  private _createUpdateProgram(gl: WebGL2RenderingContext): WebGLProgram {
    const vert = compileShader(gl, gl.VERTEX_SHADER, updateVertSrc);
    const fragSrc = `#version 300 es\nprecision lowp float;\nout vec4 o;\nvoid main(){o=vec4(0);}`;
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);

    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.transformFeedbackVaryings(program, TF_VARYINGS, gl.INTERLEAVED_ATTRIBS);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Spring update link error:\n${gl.getProgramInfoLog(program)}`);
    }

    gl.detachShader(program, vert);
    gl.detachShader(program, frag);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return program;
  }

  private _createRenderProgram(gl: WebGL2RenderingContext): WebGLProgram {
    const vert = compileShader(gl, gl.VERTEX_SHADER, renderVertSrc);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, renderFragSrc);

    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Spring render link error:\n${gl.getProgramInfoLog(program)}`);
    }

    gl.detachShader(program, vert);
    gl.detachShader(program, frag);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return program;
  }

  private _createLineProgram(gl: WebGL2RenderingContext): WebGLProgram {
    const vert = compileShader(gl, gl.VERTEX_SHADER, lineVertSrc);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, lineFragSrc);

    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Spring line render link error:\n${gl.getProgramInfoLog(program)}`);
    }

    gl.detachShader(program, vert);
    gl.detachShader(program, frag);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return program;
  }

  private _setupVAO(
    gl: WebGL2RenderingContext,
    vao: WebGLVertexArrayObject,
    vbo: WebGLBuffer,
    program: WebGLProgram
  ): void {
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    const stride = FLOATS_PER_NODE * 4;
    let offset = 0;

    for (const attr of NODE_ATTRIBS) {
      const loc = gl.getAttribLocation(program, attr.name);
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, attr.size, gl.FLOAT, false, stride, offset);
      }
      offset += attr.size * 4;
    }

    gl.bindVertexArray(null);
  }

  private _renderVaos: [WebGLVertexArrayObject | null, WebGLVertexArrayObject | null] = [null, null];

  private _bindRenderVAO(bufIdx: number): void {
    const gl = this._gl;

    if (!this._renderVaos[bufIdx]) {
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vbos[bufIdx]);

      const stride = FLOATS_PER_NODE * 4;
      let offset = 0;

      for (const attr of NODE_ATTRIBS) {
        const loc = gl.getAttribLocation(this._renderProgram, attr.name);
        if (loc >= 0) {
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, attr.size, gl.FLOAT, false, stride, offset);
        }
        offset += attr.size * 4;
      }

      gl.bindVertexArray(null);
      this._renderVaos[bufIdx] = vao;
    }

    gl.bindVertexArray(this._renderVaos[bufIdx]!);
  }
}
