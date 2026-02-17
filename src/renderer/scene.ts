/**
 * Scene interface and SceneRegistry.
 * Each scene owns its own shader program and draws to the fullscreen triangle.
 */
import type { ParameterStore } from "../engine/params";

export interface SceneState {
  time: number;
  beat: number;
  progress: number;
  localTime: number;
  params: ParameterStore;
  resolution: [number, number];
  gpuParticles?: any; // GPUParticleSystem for scene-specific particle effects
}

export interface Scene {
  readonly id: string;
  init(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject): void;
  draw(gl: WebGL2RenderingContext, state: SceneState): void;
  dispose(gl: WebGL2RenderingContext): void;
  // Optional particle triggers - called each frame when scene is active
  triggerParticles?(state: SceneState): void;
}

export class SceneRegistry {
  private _scenes = new Map<string, Scene>();

  register(scene: Scene): void {
    this._scenes.set(scene.id, scene);
  }

  get(id: string): Scene | undefined {
    return this._scenes.get(id);
  }

  has(id: string): boolean {
    return this._scenes.has(id);
  }

  get ids(): string[] {
    return [...this._scenes.keys()];
  }

  initAll(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject): void {
    for (const scene of this._scenes.values()) {
      scene.init(gl, vao);
    }
  }

  disposeAll(gl: WebGL2RenderingContext): void {
    for (const scene of this._scenes.values()) {
      scene.dispose(gl);
    }
  }
}
