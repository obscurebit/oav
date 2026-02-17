# DEVELOPERS.md — OAV Technical Guide

## Prerequisites

- **Node 20+** via nvm
- A modern browser with WebGL 2 support (Chrome, Firefox, Edge)
- Optional: [NVIDIA NIM API key](https://build.nvidia.com/) for LLM features

## Setup

```sh
# If using nvm
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"

npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```sh
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_LLM_API_KEY` | — | NVIDIA NIM API key (required for LLM features) |
| `VITE_LLM_BASE_URL` | `https://integrate.api.nvidia.com/v1` | API base URL |
| `VITE_LLM_MODEL` | `nvidia/llama-3.3-nemotron-super-49b-v1.5` | Director model (tool-calling) |
| `VITE_POET_MODEL` | `meta/llama-4-scout-17b-16e-instruct` | Poet model (text generation) |

Without an API key, OAV falls back to **AmbientVoice** — curated poetic fragments that emerge on a timer.

## Development

```sh
npm run dev          # Start dev server → http://localhost:5173
npm test             # Run all 119 unit tests
npm run test:watch   # Watch mode
```

The Vite dev server includes a proxy at `/api/llm` that forwards to the NVIDIA API, solving CORS issues during development.

### Debug Overlays

OAV has two separate debug overlays:

#### Main Debug Overlay (F2)
Press **F2** to toggle the main debug overlay. It shows:
- **Performance** — FPS, frame time, particle count
- **Engine state** — current scene, progress, elapsed time, active preset
- **LLM status** — Director/Poet enabled state, pending requests
- **Input** — mouse/keyboard interaction, energy, flurry, stillness
- **Mood** — detected mood + confidence with energy/warmth/texture bars
- **Parameters** — all 30+ visual params with mini bar graphs
- **Event stream** — color-coded log of all system events

#### Audio Debug Overlay (F3)
Press **F3** to toggle the dedicated audio debug overlay. It shows:
- **Audio Analysis** — amplitude, bass/mid/high frequency bands, beat detection, rhythmic intensity, spectral centroid
- **Audio Parameters** — 4-layer levels (sub, harmonic, noise, pad), filter frequency/Q, LFO rate/depth, tempo
- **Audio Effects** — reverb wet level, delay time/feedback, distortion amount, master level

#### Event Stream Tags
The main overlay shows a color-coded log of all system events:

| Tag | Color | Source |
|-----|-------|--------|
| `INPUT` | orange | User typed a phrase |
| `REACT` | blue | InputReactor local reaction |
| `LLM` | magenta | Director raw content / magnitude |
| `TOOL` | cyan | Director tool call executed |
| `PRESET` | dark orange | Preset applied |
| `POET` | pink | Poet emitted words |
| `SCENE` | green | Scene transition |
| `SPEAK` | yellow | Legacy speak/whisper |
| `ERROR` | red | Failures |

## Architecture

### System Overview

```
User Input → InputReactor (instant) → ParameterStore
           → Director LLM (async)  → ToolBridge → ParameterStore / Timeline
                                    → Magnitude Calculator → Poet LLM (async) → TextParticles
Timeline (auto-cycle) → Renderer → WebGL Shaders ← ParameterStore (30+ uniforms)
Audio Engine ← ParameterStore (mood) → amplitude/bass/brightness → ParameterStore
```

### Dual-LLM Architecture

OAV uses two separate LLMs with distinct roles:

**Director** (nemotron) — The invisible hand sculpting the world
- Receives: scene context, mood, user input, silence duration
- Returns: tool calls only (no display text)
- Tools: `drift_param`, `set_param`, `pulse_param`, `shift_mood`, `apply_preset`, `transition_to`, `spawn_particles`
- Uses `tool_choice: "required"` — must always call tools

**Poet** (llama-4-scout) — The voice inside the void
- Receives: mood context + **PoetDirective** (magnitude, style, action summary)
- Returns: pure poetic text (no tools, no JSON)
- Style is controlled by the magnitude of the Director's actions

### Magnitude-Driven Poet

The Director's tool calls are scored (0–1) to determine how the Poet should respond:

| Tool | Magnitude |
|------|-----------|
| `transition_to` | 1.0 |
| `apply_preset` | 0.7 |
| `shift_mood` | 0.5 |
| `spawn_particles` | 0.3 |
| `drift_param` / `set_param` | variable (based on delta) |
| `pulse_param` | 0.1 |

Magnitude maps to a **PoetStyle**:

| Magnitude | Style | Behavior |
|-----------|-------|----------|
| < 0.1 | `silence` | No Poet call — the world breathes |
| 0.1 – 0.3 | `whisper` | 1–4 words, faint, fast-fading |
| 0.3 – 0.6 | `voice` | 5–12 words, standard reveal |
| 0.6 – 0.8 | `echo` | Response to feeling, 2 lines |
| ≥ 0.8 | `title` | Dramatic word/phrase, large styling |

User input always gets at least `voice` or `echo` — never silence.

### Event Flow

1. **User types** → InputReactor fires instant local reactions (color/mood words → param drifts)
2. **Phrase completes** → Director receives context + phrase (async, 2–5s)
3. **Director responds** → ToolBridge executes tool calls against engine
4. **Magnitude calculated** → Scores the Director's actions
5. **Poet triggered** (if magnitude > 0.1) → Receives directive with style hint
6. **Poet responds** → Words appear as particles with style-appropriate kind

### Infinite Timeline

Scenes cycle fluidly in random order (`intro` → `build` → `climax` → ...), never the same scene twice in a row. The `outro` scene is reserved for rare, LLM-triggered dramatic moments. The timeline auto-extends when within 60s of running out.

## Project Structure

```
src/
  main.ts              # Entry point, requestAnimationFrame loop, magnitude calculator
  debug-overlay.ts     # F2-toggled debug overlay
  engine/
    clock.ts           # Deterministic clock (time, delta, beat)
    params.ts          # ParameterStore — flat Map with clamping, drift/pulse
    timeline.ts        # Timeline — ordered scene entries with progress
    input.ts           # Mouse/keyboard → parameter modulation
    input-reactor.ts   # Instant typing reactions (80+ mood/color words)
  renderer/
    gl.ts              # WebGL helpers (compile, link, fullscreen triangle)
    renderer.ts        # Scene-based renderer with crossfade transitions
    scene.ts           # Scene interface, SceneRegistry
    scenes/            # 4 scenes: intro, build, climax, outro
    shaders/
      noise.glsl       # Shared noise library (simplex, fbm, voronoi, domain warp)
      post.glsl        # Shared post-processing (transforms + color effects)
      intro.frag       # Intro: nebula emergence from void
      build.frag       # Build: organic flow fields
      climax.frag      # Climax: fractal kaleidoscope storm
      outro.frag       # Outro: dissolution into ash
  audio/
    audio.ts           # 4-layer drone + scene-reactive mixing
  overlay/
    text-particles.ts  # Word/char particles with scene themes
    overlay.ts         # 2D canvas → WebGL texture compositor
    word-input.ts      # Artful text input (keystrokes scatter as particles)
  llm/
    director.ts        # Director LLM (tool-calling) + AmbientVoice fallback
    poet.ts            # Poet LLM (poetic text, no tools)
    tools.ts           # Tool definitions, ENGINE_TOOLS, ALL_PARAM_NAMES
    tool-bridge.ts     # Executes tool calls against the engine
```

## Testing

```sh
npm test                    # Run all tests once (119 tests)
npm run test:watch          # Watch mode
npx playwright test         # Visual smoke tests (headed Chromium)
```

Tests are in `src/*/__tests__/*.test.ts`. Engine tests are pure (no DOM/WebGL needed).

### Test Coverage

| Module | Tests | What's tested |
|--------|-------|---------------|
| Clock | 8 | Time, delta, beat, BPM |
| ParameterStore | 11 | Define, set, clamp, snapshot |
| Params drift/pulse | 9 | Smooth transitions, envelopes |
| Timeline | 15 | Scenes, transitions, crossfade, prune |
| InputReactor | 20 | Speed tracking, mood/color words |
| SceneRegistry | 7 | Register, get, list |
| TextParticles | 10 | Add, update, fade, cap, scene titles |
| ToolBridge | 22 | All 9 tools, presets, error handling |
| ThinkingFragments | 12 | Filter logic, poetic vs technical |
| AmbientVoice | 5 | Timer, stories, user response |

## Visual Parameters

30+ shader uniforms controllable by the LLM:

| Category | Parameters |
|----------|-----------|
| **Core** | `intensity`, `speed`, `hue`, `pulse` |
| **Color** | `saturation`, `contrast`, `warmth`, `gamma`, `invert` |
| **Geometry** | `zoom`, `rotation`, `symmetry`, `mirror_x`, `mirror_y` |
| **Pattern** | `warp`, `noise_scale`, `octaves`, `lacunarity`, `grain`, `pixelate`, `edge`, `ridge`, `cells` |
| **Motion** | `drift_x`, `drift_y`, `spin`, `wobble`, `strobe` |
| **Post** | `bloom`, `vignette`, `aberration`, `glitch`, `feedback` |

## Presets

21 named presets available via the `apply_preset` tool:

`noir` · `vaporwave` · `glitch_art` · `underwater` · `fire` · `ice` · `psychedelic` · `minimal` · `cosmic` · `industrial` · `dream` · `nightmare` · `crystal` · `organic` · `digital` · `zen` · `storm` · `aurora` · `lava` · `void` · `reset`

## Architecture Decision Records

- **ADR-001** — Tech stack (Vite, TypeScript, WebGL 2, Web Audio)
- **ADR-002** — Engine architecture (deterministic core, pull model)
- **ADR-003** — Scene system (4 scenes, crossfade transitions)
- **ADR-004** — Living presence (LLM, text overlay, artful input)
- **ADR-005** — LLM creative uses
- **ADR-006** — Tool-calling Director (9 tools, 3 abstraction levels)
- **ADR-007** — Testing infrastructure
- **ADR-008** — Dual-LLM event architecture (Director + Poet, magnitude calculator)
