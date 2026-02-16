# AGENTS.md — AI Coding Assistant Context

## Project
**OAV** — Obscure Audio Visual. A browser-based demoscene trackmo: real-time, time-based audiovisual experience.

## Key Documents
- `docs/Browser_Trackmo_PRD.md` — Product requirements
- `docs/Browser_Trackmo_ARCH.md` — Architecture overview
- `docs/adr/` — Architecture Decision Records

## Tech Stack
| Concern | Choice |
|---------|--------|
| Build | Vite 5 |
| Language | TypeScript (strict) |
| Rendering | Raw WebGL 2 |
| Audio | Web Audio API |
| Shader loading | vite-plugin-glsl |
| Testing | Vitest |
| UI framework | None (pure canvas) |

## Node Environment
Node v20+ via nvm. **Always prefix npm/node commands with:**
```sh
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
```

## Project Structure
```
src/
  main.ts              # Entry point, owns requestAnimationFrame loop
  shaders.d.ts         # Type declarations for .vert/.frag/.glsl imports
  vite-env.d.ts        # Vite client types (import.meta.env)
  engine/
    index.ts           # Barrel export
    clock.ts           # Deterministic clock (time, delta, beat)
    params.ts          # ParameterStore — flat Map with clamping, drift/pulse transitions
    timeline.ts        # Timeline — ordered scene entries with progress
    input.ts           # Input — mouse/keyboard → parameter modulation (pull model)
    input-reactor.ts   # InputReactor — instant typing reactions (speed, color words, mood words → params)
    __tests__/         # Vitest unit tests for engine modules
  renderer/
    index.ts           # Barrel export
    gl.ts              # WebGL helpers (compile, link, fullscreen triangle, UniformCache)
    renderer.ts        # Renderer class — scene-based with crossfade transitions
    scene.ts           # Scene interface, SceneRegistry
    scenes/
      base-scene.ts    # BaseScene — shared shader setup for fullscreen scenes
      intro-scene.ts   # Intro: nebula emergence from void (domain-warped noise)
      build-scene.ts   # Build: organic flow fields gaining structure (double warp)
      climax-scene.ts  # Climax: fractal kaleidoscope storm (noise + rings)
      outro-scene.ts   # Outro: dissolution into ash and memory (noise dissolve)
    shaders/
      fullscreen.vert  # Vertex shader (fullscreen triangle → UV)
      noise.glsl       # Shared noise library (simplex, fbm, ridged noise, voronoi, domain warp, palettes)
      post.glsl        # Shared post-processing (coordinate transforms + color post-fx for all scenes)
      demo.frag        # Original demo shader (kept for reference)
      intro.frag       # Intro scene fragment shader
      build.frag       # Build scene fragment shader
      climax.frag      # Climax scene fragment shader
      outro.frag       # Outro scene fragment shader
      overlay.frag     # Text overlay compositor shader (Y-flipped UV)
    __tests__/         # SceneRegistry tests
  audio/
    index.ts           # Barrel export
    audio.ts           # WebAudio engine — layered drone, scene-reactive mix, amplitude/bass/brightness
  overlay/
    index.ts           # Barrel export
    text-particles.ts  # Word/char particles — drift, fade, dissolve, scene themes, audio-reactive
    overlay.ts         # TextOverlay — 2D canvas → WebGL texture compositor
    word-input.ts      # Artful text input — keystrokes scatter as particles
    __tests__/         # TextParticleSystem tests
  llm/
    index.ts           # Barrel export
    director.ts        # LLM Director (tool-calling) + AmbientVoice fallback
    tools.ts           # Tool definitions (3 levels + presets), ALL_PARAM_NAMES (30+ params)
    tool-bridge.ts     # ToolBridge — executes LLM tool calls against the engine
    __tests__/         # AmbientVoice, ToolBridge, thinking fragment tests
```

## Architecture Principles
1. **Deterministic core** — Clock, Params, Timeline are pure and testable without a browser
2. **Pull model** — No events; consumers read state each frame
3. **Nothing blocks the render loop** — No awaits, no network calls in the hot path
4. **Single state flow** — `clock.tick() → timeline.getTransitionState() → renderer.draw()`
5. **LLM as tool-caller** — Director sends tool definitions to LLM; LLM responds with tool calls at 3 abstraction levels (poetic, parametric, structural). ToolBridge executes them against the engine. Never in render path.

## Testing
```sh
npx vitest run        # Run all tests once
npx vitest            # Watch mode
```
Tests are in `src/*/__tests__/*.test.ts`. Engine tests are pure (no DOM/WebGL).

## Dev Server
```sh
npx vite --port 5173
```

## Conventions
- Barrel exports via `index.ts` in each module directory
- Shaders in `.vert`/`.frag` files, imported as strings via vite-plugin-glsl
- ADRs in `docs/adr/ADR-NNN-slug.md`
- Parameters are always clamped; use `params.define(name, min, max, default)`
- Prefer fullscreen triangle over fullscreen quad (one fewer vertex, no index buffer)

## Current State / Roadmap
- [x] Project scaffolding
- [x] Engine core (Clock, ParameterStore, Timeline) + 28 unit tests
- [x] WebGL renderer with shader
- [x] Mouse/keyboard → parameter modulation
- [x] Audio (WebAudio drone + amplitude/bass/brightness extraction)
- [x] Scene system (4 scenes: intro, build, climax, outro)
- [x] Transitions between scenes (crossfade with smoothstep blending)
- [x] Text overlay (canvas texture → WebGL compositor)
- [x] Artful text input (type into the void, characters scatter as particles)
- [x] LLM Director with tool calling (speak, shift_mood, whisper, set/drift/pulse params, scene control)
- [x] ToolBridge — maps LLM tool calls to engine actions
- [x] Thinking fragments — extracted from /think blocks, surfaced as whisper particles
- [x] Smooth param transitions (drift with smoothstep, pulse with envelope)
- [x] AmbientVoice fallback (curated poetic fragments when no API key)
- [x] Interaction hint (whisper after 15s of no activity)
- [x] Audio overhaul — 4-layer drone (sub bass, harmonics, filtered noise, ethereal pad) + convolver reverb + scene-reactive mixing
- [x] Shader upgrade — shared noise.glsl (simplex, fbm, domain warp, cosine palettes), all 4 scenes rewritten
- [x] Click pulse — uPulse uniform with expanding shockwave ring in all shaders, exponential decay
- [x] Infinite timeline — auto-extending scene cycles with randomized durations, never ends
- [x] Letter-by-letter word emergence — addVoiceRevealed spawns staggered character particles
- [x] Themed scene titles — SCENE_THEMES with distinct fonts/colors per scene, letter-by-letter reveal on transition
- [x] Audio-reactive text particles — bass pulses scale, amplitude drifts velocity
- [x] Overlay Y-flip fix — canvas→WebGL UV correction
- [x] Playwright visual smoke tests (headed Chromium + GPU flags)
- [x] Vite proxy for NVIDIA API (CORS fix)
- [x] Director failure resilience (self-disable after 3 failures → AmbientVoice fallback)
- [x] InputReactor — instant typing reactions (speed tracking, 80+ mood/color words → immediate param changes)
- [x] LLM response feedback — classify affirm/deflect/ambient, distinct visual flash for each
- [x] Expanded visual parameter system — 30+ shader uniforms (color, geometry, pattern, motion, post-fx)
- [x] Shared post.glsl — coordinate transforms (zoom, rotation, symmetry, mirror, wobble, pixelate) + post-processing (saturation, contrast, bloom, grain, glitch, aberration, strobe, etc.)
- [x] noise.glsl expanded — ridged noise, voronoi/cellular, hash functions
- [x] 9 LLM tools — speak, shift_mood, whisper, set/drift/pulse_param (30 params each), transition_to, spawn_particles, apply_preset
- [x] 21 named visual presets (noir, vaporwave, psychedelic, fire, ice, cosmic, dream, nightmare, etc.)
- [x] 104 unit tests passing
- [ ] WebGPU upgrade path (Phase 2)

## Gotchas
- `vite.config.ts` uses ESM `import.meta.url` for `__dirname` (no CommonJS)
- Shader type declarations live in `src/shaders.d.ts`
- The app starts rendering immediately (no click gate yet) for dev convenience; click gate exists for future audio context unlock
- Click anywhere to start audio (AudioContext requires user gesture)
- Audio params: `amplitude`, `bass`, `brightness` — fed from WebAudio AnalyserNode each frame
- Mouse X → hue, Mouse Y → intensity (inverted: top = high)
- LLM API key via `VITE_LLM_API_KEY` env var; without it, AmbientVoice fallback is used
- LLM base URL via `VITE_LLM_BASE_URL` env var (default: NVIDIA NIM)
- LLM model override via `VITE_LLM_MODEL` env var (default: nvidia/llama-3.3-nemotron-super-49b-v1.5)
- Director uses OpenAI-compatible tool calling; falls back to JSON parsing if model doesn't support tools
- ParameterStore.tick(dt) must be called each frame to advance drifts and pulses
- Particle kinds: voice, echo, name, transform, whisper, user, title — each with distinct visual style
- SCENE_THEMES in text-particles.ts defines per-scene title names, fonts, colors
- Click triggers `pulse` param (set to 1, decays exponentially at rate 3.0)
- Audio engine has 4 layers: sub bass, harmonic, noise, pad — each with scene-reactive gain
- `audio.setSceneMix(sceneId, progress)` adjusts layer gains and filter frequencies per scene
- Shaders use shared `noise.glsl` + `post.glsl` via `#include` (vite-plugin-glsl resolves includes)
- All shaders call `applyTransforms(p, t)` for coordinate effects and `applyPost(col, uv, p, t)` for color post-fx
- 30+ shader uniforms: core (intensity, speed, hue, pulse) + color (saturation, contrast, warmth, gamma, invert) + geometry (zoom, rotation, symmetry, mirror_x/y) + pattern (warp, noise_scale, octaves, lacunarity, grain, pixelate, edge, ridge, cells) + motion (drift_x/y, spin, wobble, strobe) + post (bloom, vignette, aberration, glitch, feedback)
- ALL_PARAM_NAMES in tools.ts is the single source of truth for LLM-controllable params
- Overlay shader flips Y coordinate (`1.0 - vUv.y`) to match canvas→OpenGL axis
- Timeline auto-extends when within 60s of end; scene durations randomized 18-45s
- `addVoiceRevealed` uses negative particle age for staggered letter-by-letter fade-in
- `particles.update(dt, bass, amplitude)` — optional audio params for reactive behavior
- Text overlay uses a 2D canvas uploaded as WebGL texture each frame
- User keystrokes are captured globally (no DOM input elements)
- InputReactor in engine/ provides instant local reactions to typed words (color, mood, effect keywords)
- LLM response classification: affirm (engaged with input) → warm pulse, deflect (ignored) → cool ripple, ambient → no flash
- apply_preset tool applies curated multi-param combos (21 presets) with optional intensity_scale
- Preset "reset" drifts all params back to defaults
- See `docs/MANIFESTO.md` for the creative vision
