# ADR-001: Technology Stack

## Status
Accepted

## Context
We need to choose a tech stack for a browser-based demoscene trackmo — a real-time, time-based audiovisual experience. Key constraints from the PRD:
- GPU-first rendering (shaders)
- WebAudio for sound
- No heavy frameworks or UI libraries
- Deterministic core loop driven by a clock
- Must feel like a demo, not a website

## Decision

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Build tool** | Vite 5 | Fast HMR, native ESM, zero-config TS support |
| **Language** | TypeScript (strict) | Type safety for the parameter/state system without runtime cost |
| **Rendering** | Raw WebGL 2 | Maximum shader control, no abstraction tax from Three.js/Babylon. We can upgrade to WebGPU in Phase 2 |
| **Audio** | Web Audio API (raw) | Direct access to AnalyserNode for beat/amplitude extraction; no library overhead |
| **Shader loading** | vite-plugin-glsl | Import `.glsl`/`.frag`/`.vert` files directly with `#include` support |
| **Testing** | Vitest | Same config as Vite, fast, supports both unit and integration tests |
| **UI framework** | None | PRD explicitly forbids heavy UI. Pure canvas + minimal DOM |

## Consequences
- **Pro**: Minimal dependency surface, full control over render pipeline, fast iteration
- **Pro**: No framework churn or abstraction leaks in the hot path
- **Con**: More boilerplate for WebGL setup (mitigated by a thin `GL` helper module)
- **Con**: No scene graph — we build our own timeline/scene system (this is intentional per the ARCH doc)

## Alternatives Considered
- **Three.js**: Too much abstraction for a trackmo; we'd fight it more than use it
- **Webpack/Rollup**: Vite is faster for dev and simpler to configure
- **Jest**: Vitest integrates better with the Vite ecosystem
