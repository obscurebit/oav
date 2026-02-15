/**
 * Base scene class — handles common shader setup for fullscreen scenes.
 * Subclasses just provide a fragment shader source.
 */
import { linkProgram, UniformCache } from "../gl";
import vertSrc from "../shaders/fullscreen.vert";
import type { Scene, SceneState } from "../scene";

export abstract class BaseScene implements Scene {
  abstract readonly id: string;
  protected abstract readonly fragSrc: string;

  private _program: WebGLProgram | null = null;
  private _uniforms: UniformCache | null = null;
  private _vao: WebGLVertexArrayObject | null = null;

  init(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject): void {
    this._program = linkProgram(gl, vertSrc, this.fragSrc);
    this._uniforms = new UniformCache(gl, this._program);
    this._vao = vao;
  }

  draw(gl: WebGL2RenderingContext, state: SceneState): void {
    if (!this._program || !this._uniforms || !this._vao) return;

    gl.useProgram(this._program);

    const u = this._uniforms;
    gl.uniform1f(u.get("uTime"), state.time);
    gl.uniform1f(u.get("uBeat"), state.beat);
    gl.uniform1f(u.get("uProgress"), state.progress);
    gl.uniform2f(u.get("uResolution"), state.resolution[0], state.resolution[1]);
    gl.uniform1f(u.get("uIntensity"), state.params.get("intensity"));
    gl.uniform1f(u.get("uSpeed"), state.params.get("speed"));
    gl.uniform1f(u.get("uHue"), state.params.get("hue"));
    gl.uniform1f(u.get("uAmplitude"), state.params.get("amplitude"));
    gl.uniform1f(u.get("uBass"), state.params.get("bass"));
    gl.uniform1f(u.get("uBrightness"), state.params.get("brightness"));

    gl.bindVertexArray(this._vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  dispose(gl: WebGL2RenderingContext): void {
    if (this._program) {
      gl.deleteProgram(this._program);
      this._program = null;
    }
  }
}
