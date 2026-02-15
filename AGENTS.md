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
    params.ts          # ParameterStore — flat Map with clamping
    timeline.ts        # Timeline — ordered scene entries with progress
    input.ts           # Input — mouse/keyboard → parameter modulation (pull model)
    __tests__/         # Vitest unit tests for engine modules
  renderer/
    index.ts           # Barrel export
    gl.ts              # WebGL helpers (compile, link, fullscreen triangle, UniformCache)
    renderer.ts        # Renderer class — scene-based with crossfade transitions
    scene.ts           # Scene interface, SceneRegistry
    scenes/
      base-scene.ts    # BaseScene — shared shader setup for fullscreen scenes
      intro-scene.ts   # Intro: expanding circle with soft glow
      build-scene.ts   # Build: layered sine waves, increasing complexity
      climax-scene.ts  # Climax: kaleidoscope burst with strobe
      outro-scene.ts   # Outro: dissolving particles fading to black
    shaders/
      fullscreen.vert  # Vertex shader (fullscreen triangle → UV)
      demo.frag        # Original demo shader (kept for reference)
      intro.frag       # Intro scene fragment shader
      build.frag       # Build scene fragment shader
      climax.frag      # Climax scene fragment shader
      outro.frag       # Outro scene fragment shader
      overlay.frag     # Text overlay compositor shader
    __tests__/         # SceneRegistry tests
  audio/
    index.ts           # Barrel export
    audio.ts           # WebAudio engine — playback, amplitude/bass/brightness extraction
  overlay/
    index.ts           # Barrel export
    text-particles.ts  # Word/char particles — drift, fade, dissolve
    overlay.ts         # TextOverlay — 2D canvas → WebGL texture compositor
    word-input.ts      # Artful text input — keystrokes scatter as particles
    __tests__/         # TextParticleSystem tests
  llm/
    index.ts           # Barrel export
    director.ts        # LLM Director (async poet) + AmbientVoice fallback
    __tests__/         # AmbientVoice tests
```

## Architecture Principles
1. **Deterministic core** — Clock, Params, Timeline are pure and testable without a browser
2. **Pull model** — No events; consumers read state each frame
3. **Nothing blocks the render loop** — No awaits, no network calls in the hot path
4. **Single state flow** — `clock.tick() → timeline.getTransitionState() → renderer.draw()`
5. **LLM director** — Async poet, never in render path. Just another source of `params.patch()` calls

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
- [x] LLM Director (async poet, periodic + on-input, structured JSON response)
- [x] AmbientVoice fallback (curated poetic fragments when no API key)
- [ ] WebGPU upgrade path (Phase 2)

## Gotchas
- `vite.config.ts` uses ESM `import.meta.url` for `__dirname` (no CommonJS)
- Shader type declarations live in `src/shaders.d.ts`
- The app starts rendering immediately (no click gate yet) for dev convenience; click gate exists for future audio context unlock
- Click anywhere to start audio (AudioContext requires user gesture)
- Audio params: `amplitude`, `bass`, `brightness` — fed from WebAudio AnalyserNode each frame
- Mouse X → hue, Mouse Y → intensity (inverted: top = high)
- LLM API key via `VITE_LLM_API_KEY` env var; without it, AmbientVoice fallback is used
- LLM model override via `VITE_LLM_MODEL` env var (default: gpt-4o-mini)
- Text overlay uses a 2D canvas uploaded as WebGL texture each frame
- User keystrokes are captured globally (no DOM input elements)
- See `docs/MANIFESTO.md` for the creative vision
