/**
 * WebGL 2 renderer — scene-based rendering with crossfade transitions
 * and text overlay compositing.
 */
import { createFullscreenTriangle, linkProgram, UniformCache } from "./gl";
import { SceneRegistry } from "./scene";
import type { SceneState } from "./scene";
import type { ParameterStore } from "../engine/params";
import type { TransitionState, ActiveScene } from "../engine/timeline";
import type { GPUParticleSystem } from "./particles/gpu-particles";
import type { GPUSpringSystem } from "./particles/gpu-springs";
import vertSrc from "./shaders/fullscreen.vert";
import overlayFragSrc from "./shaders/overlay.frag";

export interface RenderState {
  time: number;
  beat: number;
  params: ParameterStore;
  transition: TransitionState | null;
  overlayTexture: WebGLTexture | null;
}

export class Renderer {
  private _gl: WebGL2RenderingContext;
  private _vao: WebGLVertexArrayObject;
  private _registry: SceneRegistry;
  private _overlayProgram: WebGLProgram;
  private _overlayUniforms: UniformCache;

  /** Optional GPU systems — rendered between scene shaders and text overlay */
  gpuParticles: GPUParticleSystem | null = null;
  gpuSprings: GPUSpringSystem | null = null;

  constructor(gl: WebGL2RenderingContext, registry: SceneRegistry) {
    this._gl = gl;
    this._vao = createFullscreenTriangle(gl);
    this._registry = registry;
    this._registry.initAll(gl, this._vao);

    // Compile overlay compositor shader
    this._overlayProgram = linkProgram(gl, vertSrc, overlayFragSrc);
    this._overlayUniforms = new UniformCache(gl, this._overlayProgram);
  }

  draw(state: RenderState): void {
    const gl = this._gl;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (state.transition) {
      this._drawScenes(state);
    }

    // Draw GPU particles and springs on top of scene (additive blend)
    if (this.gpuParticles) this.gpuParticles.render();
    if (this.gpuSprings) this.gpuSprings.render();

    // Composite text overlay on top
    if (state.overlayTexture) {
      this._drawOverlay(state.overlayTexture);
    }
  }

  private _drawScenes(state: RenderState): void {
    const gl = this._gl;
    const { current, previous, blend } = state.transition!;
    const res: [number, number] = [gl.drawingBufferWidth, gl.drawingBufferHeight];

    if (previous && blend < 1) {
      const prevScene = this._registry.get(previous.sceneId);
      if (prevScene) {
        prevScene.draw(gl, this._buildSceneState(previous, state, res));
      }

      const curScene = this._registry.get(current.sceneId);
      if (curScene) {
        gl.enable(gl.BLEND);
        const smoothBlend = blend * blend * (3 - 2 * blend);
        gl.blendColor(0, 0, 0, smoothBlend);
        gl.blendFuncSeparate(
          gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA,
          gl.ONE, gl.ONE_MINUS_SRC_ALPHA
        );
        curScene.draw(gl, this._buildSceneState(current, state, res));
        gl.disable(gl.BLEND);
      }
    } else {
      const scene = this._registry.get(current.sceneId);
      if (scene) {
        scene.draw(gl, this._buildSceneState(current, state, res));
      }
    }
  }

  private _drawOverlay(texture: WebGLTexture): void {
    const gl = this._gl;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this._overlayProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this._overlayUniforms.get("uOverlay"), 0);

    gl.bindVertexArray(this._vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
  }

  private _buildSceneState(
    active: ActiveScene,
    state: RenderState,
    resolution: [number, number]
  ): SceneState {
    return {
      time: state.time,
      beat: state.beat,
      progress: active.progress,
      localTime: active.localTime,
      params: state.params,
      resolution,
    };
  }

  get vao(): WebGLVertexArrayObject {
    return this._vao;
  }

  get registry(): SceneRegistry {
    return this._registry;
  }
}
