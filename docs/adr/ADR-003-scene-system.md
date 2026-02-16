# ADR-003: Scene System Architecture

## Status
Accepted

## Context
The PRD requires "distinct parts that evolve visually and sonically" with "smooth transitions between parts." The Timeline already tracks which scene is active and provides normalized progress. We need a way to:
1. Register different visual styles (shaders) per scene
2. Render the active scene each frame
3. Blend between scenes during transitions

## Decision

### Scene Interface
Each scene is a class implementing a `Scene` interface:
```ts
interface Scene {
  id: string;
  init(gl: WebGL2RenderingContext): void;
  draw(gl: WebGL2RenderingContext, state: SceneState): void;
  dispose(gl: WebGL2RenderingContext): void;
}
```

Each scene owns its own shader program, VAO, and uniforms. The shared fullscreen triangle VAO is passed in via the renderer to avoid duplication.

### Scene Registry
A `SceneRegistry` maps scene IDs (from Timeline entries) to Scene instances. The Renderer queries the registry each frame based on the active scene from the Timeline.

### Transitions
The Timeline supports overlapping entries with `transitionDuration`. When two scenes overlap:
1. Both scenes render to the screen (or to FBOs for advanced blending)
2. A transition progress value `[0,1]` drives the blend
3. For MVP: simple alpha crossfade via `gl.blendFunc`. No FBOs needed.
4. Director controls all transitions via `transition_to` tool (no auto-cycling)

### Scene Control
- **Director-controlled**: Only intro scene seeded initially
- **Tool-based transitions**: Director calls `transition_to(scene_id, duration)`
- **Automatic titles**: Scene titles trigger on transitions with proper styling
- **No auto-cycling**: Director decides when and how to transition

### Shared Uniforms
All scenes receive the same `SceneState` (time, beat, params, progress, resolution). Each scene decides which params it cares about.

## Consequences
- **Pro**: Each scene is self-contained — easy to add new visuals without touching other code
- **Pro**: Scenes can be developed and tested independently
- **Pro**: Director has complete creative control over scene flow
- **Pro**: Transition logic is centralized in the Renderer, not scattered across scenes
- **Con**: Each scene compiles its own shader program (acceptable — we have <10 scenes)
- **Con**: FBO-based transitions deferred to a later iteration
- **Con**: Director must actively manage scene progression (intentional design choice)

## Alternatives Considered
- **Single uber-shader with branching**: Rejected — hard to maintain, wastes GPU on unused branches
- **Hot-swapping a single program**: Rejected — no way to crossfade without rendering both
