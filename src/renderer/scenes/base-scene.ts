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
    const p = state.params;

    // Core
    gl.uniform1f(u.get("uTime"), state.time);
    gl.uniform1f(u.get("uBeat"), state.beat);
    gl.uniform1f(u.get("uProgress"), state.progress);
    gl.uniform2f(u.get("uResolution"), state.resolution[0], state.resolution[1]);
    gl.uniform1f(u.get("uIntensity"), p.get("intensity"));
    gl.uniform1f(u.get("uSpeed"), p.get("speed"));
    gl.uniform1f(u.get("uHue"), p.get("hue"));
    gl.uniform1f(u.get("uAmplitude"), p.get("amplitude"));
    gl.uniform1f(u.get("uBass"), p.get("bass"));
    gl.uniform1f(u.get("uBrightness"), p.get("brightness"));
    gl.uniform1f(u.get("uPulse"), p.get("pulse"));

    // Color & Tone
    gl.uniform1f(u.get("uSaturation"), p.get("saturation"));
    gl.uniform1f(u.get("uContrast"), p.get("contrast"));
    gl.uniform1f(u.get("uWarmth"), p.get("warmth"));
    gl.uniform1f(u.get("uGamma"), p.get("gamma"));
    gl.uniform1f(u.get("uInvert"), p.get("invert"));

    // Geometry & Space
    gl.uniform1f(u.get("uZoom"), p.get("zoom"));
    gl.uniform1f(u.get("uRotation"), p.get("rotation"));
    gl.uniform1f(u.get("uSymmetry"), p.get("symmetry"));
    gl.uniform1f(u.get("uMirrorX"), p.get("mirror_x"));
    gl.uniform1f(u.get("uMirrorY"), p.get("mirror_y"));

    // Pattern & Texture
    gl.uniform1f(u.get("uWarp"), p.get("warp"));
    gl.uniform1f(u.get("uNoiseScale"), p.get("noise_scale"));
    gl.uniform1f(u.get("uOctaves"), p.get("octaves"));
    gl.uniform1f(u.get("uLacunarity"), p.get("lacunarity"));
    gl.uniform1f(u.get("uGrain"), p.get("grain"));
    gl.uniform1f(u.get("uPixelate"), p.get("pixelate"));
    gl.uniform1f(u.get("uEdge"), p.get("edge"));
    gl.uniform1f(u.get("uRidge"), p.get("ridge"));
    gl.uniform1f(u.get("uCells"), p.get("cells"));

    // Motion & Animation
    gl.uniform1f(u.get("uDriftX"), p.get("drift_x"));
    gl.uniform1f(u.get("uDriftY"), p.get("drift_y"));
    gl.uniform1f(u.get("uSpin"), p.get("spin"));
    gl.uniform1f(u.get("uWobble"), p.get("wobble"));
    gl.uniform1f(u.get("uStrobe"), p.get("strobe"));

    // Post-processing
    gl.uniform1f(u.get("uBloom"), p.get("bloom"));
    gl.uniform1f(u.get("uVignette"), p.get("vignette"));
    gl.uniform1f(u.get("uAberration"), p.get("aberration"));
    gl.uniform1f(u.get("uGlitch"), p.get("glitch"));
    gl.uniform1f(u.get("uFeedback"), p.get("feedback"));

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
