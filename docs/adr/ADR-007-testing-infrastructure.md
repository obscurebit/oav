# ADR-007: Testing Infrastructure

## Status
Accepted

## Context
OAV is a real-time WebGL 2 audiovisual experience with an LLM-driven living presence. Testing it presents unique challenges:

1. **The engine core is pure** — Clock, ParameterStore, Timeline have no DOM or GPU dependencies
2. **The renderer requires WebGL 2** — shaders, textures, and GPU state can't be unit-tested in Node
3. **The LLM integration is async and non-deterministic** — responses vary, network can fail
4. **The visual output is the product** — correctness means "does it look right and feel alive"

We need a testing strategy that covers all four layers without over-engineering.

## Decision

### Two-tier testing: unit tests + visual smoke tests

#### Tier 1: Vitest Unit Tests (fast, deterministic, CI-safe)

**What they cover:**
- Engine core — Clock tick/beat math, ParameterStore get/set/clamp/drift/pulse, Timeline scene resolution and transitions
- Text particles — lifecycle (fadeIn → hold → fadeOut), particle creation for all 6 kinds (voice, echo, name, transform, whisper, user)
- Scene registry — registration, lookup, ID uniqueness
- Tool bridge — all 8 tool dispatchers (speak, shift_mood, whisper, set_param, drift_param, pulse_param, transition_to, spawn_particles), unknown tool handling, multi-tool execution
- Thinking fragment extraction — `<think>` block parsing, meta-reasoning filtering, length limits, lowercasing
- Ambient voice — phrase cycling, scheduling

**What they don't cover:**
- Shader compilation and rendering output
- WebGL texture upload and compositing
- Audio playback
- Actual LLM API calls
- Visual appearance of text particles

**Run:** `npx vitest run` (< 1s, 86 tests, no browser needed)

#### Tier 2: Playwright Visual Smoke Tests (GPU-accelerated, screenshot-based)

**What they cover:**
- WebGL 2 shader rendering actually produces visible output
- Text overlay compositing works (canvas → texture → WebGL blend)
- Character particles appear when typing
- LLM tool calling works end-to-end (if API key present)
- Interaction hint appears after 15s of no activity
- Scene progression over time

**How it works:**

The script `e2e/visual-check.ts` launches **headed Chromium** (not headless — WebGL 2 requires GPU access) with Metal/ANGLE flags:

```
--use-gl=angle
--use-angle=metal
--enable-gpu-rasterization
--enable-webgl
--ignore-gpu-blocklist
```

It navigates to the running dev server, performs a scripted interaction sequence, and captures screenshots at key moments:

| Screenshot | Time | What it tests |
|-----------|------|--------------|
| 01-initial | 2s | Shader renders, intro scene visible |
| 02-after-click | 3.5s | Click handler works, audio context unlocked |
| 03-typing | 5s | Character particles scatter on keystrokes |
| 04-after-phrase | 8s | Phrase flushed, particles drifting/fading |
| 05-ambient-voice | 18s | LLM or AmbientVoice has spoken |
| 06-interaction-hint | 17s (fresh page) | Whisper hint visible after no interaction |

**Run:** Start dev server (`npx vite`), then `npx tsx e2e/visual-check.ts`

Screenshots are saved to `e2e/screenshots/` for manual inspection.

### Why not headless?

Headless Chromium uses software WebGL which immediately triggers `CONTEXT_LOST_WEBGL` — all screenshots come back blank white. Headed mode with `--use-gl=angle --use-angle=metal` uses the real GPU and renders correctly on macOS.

### Why not Playwright Test runner?

The `@playwright/test` runner adds assertion infrastructure we don't need. Our visual tests are smoke tests — "does it render something non-black, do particles appear, does text show up." A simple script with `page.screenshot()` is sufficient. If we later need pixel-diff regression testing, we can migrate to the full test runner.

### CORS and the Vite Proxy

The NVIDIA NIM API does not set `Access-Control-Allow-Origin` headers, so browser `fetch()` calls from `localhost` are blocked by CORS. The Vite dev server proxies `/api/llm/*` to `https://integrate.api.nvidia.com/v1/*`:

```ts
// vite.config.ts
server: {
  proxy: {
    "/api/llm": {
      target: "https://integrate.api.nvidia.com",
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/llm/, "/v1"),
    },
  },
}
```

The Director defaults to `/api/llm/chat/completions` in dev. If `VITE_LLM_BASE_URL` points to a non-NVIDIA endpoint (e.g., a local model), it uses that directly.

### Director Failure Resilience

During visual testing we discovered that when the API key is present but calls fail (CORS, network, invalid key), the Director would keep retrying and the AmbientVoice fallback never ran. Fix: the Director tracks consecutive failures and self-disables after 3, allowing `main.ts` to fall back to AmbientVoice by checking `director.enabled` each frame.

## Consequences

- **Pro**: Unit tests are fast (< 1s), pure, and run in CI without a browser
- **Pro**: Visual tests catch real rendering issues that unit tests can't
- **Pro**: Screenshot-based approach lets a human verify "does this look right"
- **Pro**: Headed Chromium with GPU flags matches real user experience
- **Con**: Visual tests require a running dev server and a display (can't run in headless CI)
- **Con**: No automated pixel-diff regression — visual verification is manual
- **Con**: Visual test takes ~40s due to wait times (interaction hint needs 17s)

## Future Considerations

- **CI visual testing**: Could use a CI runner with GPU support (e.g., GitHub Actions with `xvfb`) or switch to a WebGPU-compatible headless browser when available
- **Pixel-diff regression**: If visual stability becomes critical, add `toMatchSnapshot()` with a tolerance threshold
- **LLM response mocking**: For deterministic visual tests, mock the Director to return fixed tool calls instead of hitting the real API
