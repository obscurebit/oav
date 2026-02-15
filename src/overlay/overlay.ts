/**
 * TextOverlay — renders text particles onto a 2D canvas,
 * then uploads it as a WebGL texture for compositing.
 */
import type { TextParticle } from "./text-particles";

export class TextOverlay {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _texture: WebGLTexture | null = null;
  private _gl: WebGL2RenderingContext;
  private _dirty = true;

  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    this._gl = gl;
    this._canvas = document.createElement("canvas");
    this._canvas.width = width;
    this._canvas.height = height;
    this._ctx = this._canvas.getContext("2d")!;
    this._texture = gl.createTexture();

    // Initialize texture
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /** Resize the overlay canvas (call on window resize). */
  resize(width: number, height: number): void {
    this._canvas.width = width;
    this._canvas.height = height;
  }

  /** Render all text particles to the 2D canvas and upload as texture. */
  render(particles: readonly TextParticle[]): void {
    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    if (particles.length === 0) {
      this._uploadTexture();
      return;
    }

    for (const p of particles) {
      if (p.opacity <= 0.01) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(p.scale, p.scale);

      ctx.globalAlpha = p.opacity;

      // Style based on particle kind
      if (p.kind === "whisper") {
        ctx.font = `300 ${p.fontSize}px "Courier New", monospace`;
        ctx.fillStyle = "rgba(180, 180, 200, 0.35)";
        ctx.shadowColor = "rgba(150, 150, 180, 0.15)";
        ctx.shadowBlur = 8;
      } else if (p.kind === "name") {
        ctx.font = `100 ${p.fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
        ctx.shadowBlur = 35;
        ctx.letterSpacing = "4px";
      } else if (p.kind === "transform") {
        ctx.font = `italic 300 ${p.fontSize}px Georgia, "Times New Roman", serif`;
        ctx.fillStyle = "rgba(230, 200, 255, 0.9)";
        ctx.shadowColor = "rgba(200, 150, 255, 0.5)";
        ctx.shadowBlur = 28;
      } else if (p.kind === "voice") {
        ctx.font = `300 ${p.fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
        ctx.shadowBlur = 20;
      } else if (p.kind === "echo") {
        ctx.font = `300 italic ${p.fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
        ctx.fillStyle = "rgba(200, 220, 255, 0.85)";
        ctx.shadowColor = "rgba(150, 180, 255, 0.5)";
        ctx.shadowBlur = 25;
      } else {
        // user
        ctx.font = `400 ${p.fontSize}px "Courier New", monospace`;
        ctx.fillStyle = "rgba(255, 240, 200, 0.8)";
        ctx.shadowColor = "rgba(255, 200, 100, 0.6)";
        ctx.shadowBlur = 15;
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.text, 0, 0);

      ctx.restore();
    }

    this._uploadTexture();
  }

  private _uploadTexture(): void {
    const gl = this._gl;
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      gl.RGBA, gl.UNSIGNED_BYTE,
      this._canvas
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  get texture(): WebGLTexture | null {
    return this._texture;
  }

  get width(): number {
    return this._canvas.width;
  }

  get height(): number {
    return this._canvas.height;
  }

  dispose(): void {
    if (this._texture) {
      this._gl.deleteTexture(this._texture);
      this._texture = null;
    }
  }
}
