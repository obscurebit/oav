/**
 * GPU Particle System — WebGL2 transform feedback for thousands of particles.
 *
 * Particles are updated entirely on the GPU each frame via transform feedback.
 * The CPU only emits new particles (writes initial state into the buffer).
 * Rendering uses GL_POINTS with soft circular fragments.
 *
 * Each particle has: position(3), velocity(3), color(4), life(1), age(1), size(1) = 13 floats
 */

import { compileShader } from "../gl";
import updateVertSrc from "./particle-update.vert";
import renderVertSrc from "./particle-render.vert";
import renderFragSrc from "./particle-render.frag";
import enhancedUpdateVertSrc from "./enhanced-particle-update.vert";
import enhancedRenderFragSrc from "./enhanced-particle-render.frag";
import { EnhancedFireworks, FireworkConfig } from "./enhanced-fireworks";

const FLOATS_PER_PARTICLE = 13;
const MAX_PARTICLES = 16384;

// Attribute layout: position(3), velocity(3), color(4), life(1), age(1), size(1)
const ATTRIB_LAYOUT = [
  { name: "aPosition", size: 3 },
  { name: "aVelocity", size: 3 },
  { name: "aColor",    size: 4 },
  { name: "aLife",     size: 1 },
  { name: "aAge",      size: 1 },
  { name: "aSize",     size: 1 },
];

const TF_VARYINGS = ["vPosition", "vVelocity", "vColor", "vLife", "vAge", "vSize"];

export interface EmitParams {
  /** World position of the emitter [-1, 1] */
  x: number;
  y: number;
  /** Number of particles to emit */
  count: number;
  /** Base speed of emitted particles */
  speed: number;
  /** Spread angle in radians (0 = focused beam, PI = hemisphere, 2*PI = sphere) */
  spread: number;
  /** Base color [r, g, b] each 0-1 */
  color: [number, number, number];
  /** Color variation — random offset per channel */
  colorVariance: number;
  /** Particle lifetime in seconds */
  life: number;
  /** Lifetime variance */
  lifeVariance: number;
  /** Base particle size (in normalized coords, ~0.005-0.05) */
  size: number;
  /** Size variance */
  sizeVariance: number;
  /** Direction bias (normalized). null = radial burst from center */
  direction?: [number, number] | null;
  /** Gravity override for this burst (null = use system default) */
  gravity?: number | null;
}

export class GPUParticleSystem {
  private _gl: WebGL2RenderingContext;

  // Double-buffered VAOs and VBOs for ping-pong transform feedback
  private _vaos: [WebGLVertexArrayObject, WebGLVertexArrayObject];
  private _vbos: [WebGLBuffer, WebGLBuffer];
  private _current = 0; // which buffer is the "read" buffer

  // Shader programs
  private _updateProgram: WebGLProgram;
  private _renderProgram: WebGLProgram;

  // Transform feedback object
  private _tf: WebGLTransformFeedback;

  // CPU-side particle data for emission
  private _cpuData: Float32Array;
  private _aliveCount = 0;
  private _nextSlot = 0;

  // Physics defaults
  gravity: [number, number, number] = [0, -0.8, 0];
  drag = 0.02;
  turbulence = 0.1;
  wind: [number, number, number] = [0, 0, 0];

  // Enhanced fireworks system
  private _enhancedFireworks: EnhancedFireworks;

  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
    this._cpuData = new Float32Array(MAX_PARTICLES * FLOATS_PER_PARTICLE);
    this._enhancedFireworks = new EnhancedFireworks(this);

    // Initialize all particles as dead (age >= life)
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const off = i * FLOATS_PER_PARTICLE;
      this._cpuData[off + 1] = -999; // y position offscreen
      this._cpuData[off + 10] = 1;   // life = 1
      this._cpuData[off + 11] = 1;   // age = 1 (dead)
    }

    // --- Update program (transform feedback) ---
    this._updateProgram = this._createUpdateProgram(gl);

    // --- Render program ---
    this._renderProgram = this._createRenderProgram(gl);

    // --- Create double-buffered VAOs/VBOs ---
    this._vbos = [gl.createBuffer()!, gl.createBuffer()!];
    this._vaos = [gl.createVertexArray()!, gl.createVertexArray()!];

    for (let i = 0; i < 2; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vbos[i]);
      gl.bufferData(gl.ARRAY_BUFFER, this._cpuData, gl.DYNAMIC_DRAW);
      this._setupVAO(gl, this._vaos[i], this._vbos[i], this._updateProgram);
    }

    // --- Transform feedback object ---
    this._tf = gl.createTransformFeedback()!;
  }

  /** Emit a burst of particles. */
  emit(params: EmitParams): void {
    const count = Math.min(params.count, MAX_PARTICLES);

    for (let i = 0; i < count; i++) {
      const slot = this._nextSlot;
      this._nextSlot = (this._nextSlot + 1) % MAX_PARTICLES;
      const off = slot * FLOATS_PER_PARTICLE;

      // Position
      this._cpuData[off + 0] = params.x;
      this._cpuData[off + 1] = params.y;
      this._cpuData[off + 2] = 0;

      // Velocity — radial burst or directed
      let vx: number, vy: number;
      if (params.direction) {
        const angle = Math.atan2(params.direction[1], params.direction[0]);
        const spread = (Math.random() - 0.5) * params.spread;
        const a = angle + spread;
        const spd = params.speed * (0.5 + Math.random() * 0.5);
        vx = Math.cos(a) * spd;
        vy = Math.sin(a) * spd;
      } else {
        // Radial burst
        const angle = Math.random() * params.spread - params.spread * 0.5;
        const baseAngle = Math.random() * Math.PI * 2;
        const a = baseAngle + angle;
        const spd = params.speed * (0.3 + Math.random() * 0.7);
        vx = Math.cos(a) * spd;
        vy = Math.sin(a) * spd;
      }
      this._cpuData[off + 3] = vx;
      this._cpuData[off + 4] = vy;
      this._cpuData[off + 5] = 0;

      // Color with variance
      const cv = params.colorVariance;
      this._cpuData[off + 6] = Math.max(0, Math.min(1, params.color[0] + (Math.random() - 0.5) * cv));
      this._cpuData[off + 7] = Math.max(0, Math.min(1, params.color[1] + (Math.random() - 0.5) * cv));
      this._cpuData[off + 8] = Math.max(0, Math.min(1, params.color[2] + (Math.random() - 0.5) * cv));
      this._cpuData[off + 9] = 1.0; // full alpha

      // Life
      this._cpuData[off + 10] = params.life + (Math.random() - 0.5) * params.lifeVariance;

      // Age (start at 0 = just born)
      this._cpuData[off + 11] = 0;

      // Size
      this._cpuData[off + 12] = params.size + (Math.random() - 0.5) * params.sizeVariance;
    }

    this._aliveCount = Math.min(this._aliveCount + count, MAX_PARTICLES);

    // Upload updated region to current read buffer
    const gl = this._gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbos[this._current]);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._cpuData);
  }

  /** Update all particles on the GPU via transform feedback. */
  update(dt: number, time: number): void {
    if (this._aliveCount === 0) {
      // Ensure transform feedback is completely unbound when no particles
      const gl = this._gl;
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindVertexArray(null);
      return;
    }

    const gl = this._gl;
    const readIdx = this._current;
    const writeIdx = 1 - readIdx;

    // Bind update program
    gl.useProgram(this._updateProgram);
    gl.uniform1f(gl.getUniformLocation(this._updateProgram, "uDt"), dt);
    gl.uniform1f(gl.getUniformLocation(this._updateProgram, "uTime"), time);
    gl.uniform3fv(gl.getUniformLocation(this._updateProgram, "uGravity"), this.gravity);
    gl.uniform1f(gl.getUniformLocation(this._updateProgram, "uDrag"), this.drag);
    gl.uniform1f(gl.getUniformLocation(this._updateProgram, "uTurbulence"), this.turbulence);

    // Bind read VAO
    gl.bindVertexArray(this._vaos[readIdx]);

    // Bind write buffer as transform feedback target
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this._tf);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this._vbos[writeIdx]);

    // Disable rasterization — we only want the transform feedback output
    gl.enable(gl.RASTERIZER_DISCARD);

    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, this._aliveCount);
    gl.endTransformFeedback();

    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindVertexArray(null);

    // Swap buffers
    this._current = writeIdx;

    // Read back isn't needed — we just swap which buffer we read/write
    // But we need to keep CPU data in sync for new emissions
    // New emissions always upload to the current read buffer
  }

  /** Render all alive particles as points. */
  render(): void {
    if (this._aliveCount === 0) return;

    const gl = this._gl;

    // Completely reset all transform feedback state before any buffer operations
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    
    // Also unbind from generic array buffer to be safe
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    gl.bindVertexArray(null);

    gl.useProgram(this._renderProgram);
    gl.uniform2f(
      gl.getUniformLocation(this._renderProgram, "uResolution"),
      gl.drawingBufferWidth, gl.drawingBufferHeight
    );

    // Enable additive blending for glowing particles
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive

    // Bind the current (just-updated) buffer's VAO for rendering
    // We need a separate VAO for the render program since attrib locations differ
    this._bindRenderVAO(this._current);

    gl.drawArrays(gl.POINTS, 0, this._aliveCount);

    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  /** Get current alive particle count. */
  get count(): number { return this._aliveCount; }

  // --- Convenience emitters ---

  /** Enhanced firework with professional effects */
  enhancedFirework(config: FireworkConfig): void {
    this._enhancedFireworks.createFirework(config);
  }

  /** Legacy firework burst: radial explosion with warm colors */
  firework(x: number, y: number, intensity = 1.0): void {
    // Use enhanced chrysanthemum by default
    this.enhancedFirework({
      x, y,
      intensity,
      color: "gold",
      type: "chrysanthemum"
    });
  }

  /** Fountain: upward stream */
  fountain(x: number, y: number, color: [number, number, number] = [0.3, 0.6, 1.0]): void {
    this.emit({
      x, y,
      count: 30,
      speed: 0.6,
      spread: 0.4,
      color,
      colorVariance: 0.2,
      life: 2.0,
      lifeVariance: 0.5,
      size: 0.01,
      sizeVariance: 0.005,
      direction: [0, 1],
    });
  }

  /** Sparkle: gentle ambient particles */
  sparkle(x: number, y: number, count = 10): void {
    this.emit({
      x, y,
      count,
      speed: 0.1,
      spread: Math.PI * 2,
      color: [0.8, 0.8, 1.0],
      colorVariance: 0.3,
      life: 3.0,
      lifeVariance: 1.0,
      size: 0.008,
      sizeVariance: 0.004,
    });
  }

  // --- Internal ---

  private _createUpdateProgram(gl: WebGL2RenderingContext): WebGLProgram {
    const vert = compileShader(gl, gl.VERTEX_SHADER, updateVertSrc);
    // Minimal fragment shader (not used due to RASTERIZER_DISCARD)
    const fragSrc = `#version 300 es\nprecision lowp float;\nout vec4 o;\nvoid main(){o=vec4(0);}`;
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);

    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);

    // Declare transform feedback varyings BEFORE linking
    gl.transformFeedbackVaryings(program, TF_VARYINGS, gl.INTERLEAVED_ATTRIBS);

    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      throw new Error(`Particle update program link error:\n${log}`);
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
      const log = gl.getProgramInfoLog(program);
      throw new Error(`Particle render program link error:\n${log}`);
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

    const stride = FLOATS_PER_PARTICLE * 4; // bytes
    let offset = 0;

    for (const attr of ATTRIB_LAYOUT) {
      const loc = gl.getAttribLocation(program, attr.name);
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, attr.size, gl.FLOAT, false, stride, offset);
      }
      offset += attr.size * 4;
    }

    gl.bindVertexArray(null);
  }

  /** Bind a temporary VAO for the render program using the specified buffer. */
  private _renderVaos: [WebGLVertexArrayObject | null, WebGLVertexArrayObject | null] = [null, null];

  private _bindRenderVAO(bufIdx: number): void {
    const gl = this._gl;

    if (!this._renderVaos[bufIdx]) {
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this._vbos[bufIdx]);

      const stride = FLOATS_PER_PARTICLE * 4;
      let offset = 0;

      for (const attr of ATTRIB_LAYOUT) {
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
