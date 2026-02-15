# ADR-004: Living Presence — LLM Integration, Text Overlay, Artful Input

## Status
Accepted

## Context
The MVP renders beautiful visuals, but it's passive. The MANIFESTO demands a *living* experience: the world speaks, the user types into the void, and an LLM acts as poet/director. Key constraints:
- LLM must never block the render loop
- No DOM UI elements — text is part of the visual world
- Interaction must feel like modulation, not conversation

## Decision

### 1. Text Overlay via Canvas Texture
A secondary 2D canvas renders text (words, phrases, user keystrokes). This canvas is uploaded as a WebGL texture each frame and composited over the shader output using alpha blending. This keeps text inside the visual world — it can fade, drift, and dissolve.

**Why not WebGL text geometry?** Too complex for MVP. Canvas2D text is high quality, supports any font, and the texture upload cost is negligible at our resolution.

### 2. Artful Text Input (no DOM forms)
Global `keydown` listener captures printable characters. Letters appear scattered/drifting on the overlay canvas — not in a line, not in a box. After a configurable pause (1.5s of no typing), the accumulated word buffer is sent to the LLM.

Backspace removes the last character. Escape clears the buffer. No cursor. No blinking caret.

### 3. LLM Director/Poet
The LLM is called:
- **Periodically** (every 8-15s) with ambient context (scene, progress, params)
- **On user input** (after the typing pause) with the user's words + context

It returns a structured JSON response:
```json
{
  "words": "the space between your questions",
  "mood": { "intensity": 0.8, "speed": 1.2, "hue": 0.6 },
  "energy": 0.7
}
```

All fields are optional. `words` are displayed via the text overlay. `mood` is applied via `params.patch()`. `energy` modulates global intensity.

### 4. Word Particles
Each displayed word/phrase is a "particle" with:
- Position (x, y) — starts near center, drifts
- Opacity — fades in over ~1s, holds, fades out over ~2s
- Scale — subtle breathing
- Rotation — slight drift

User-typed characters are separate particles with more scatter and faster fade.

### 5. Async Pipeline
```
User types → buffer → (pause) → LLM request (async)
                                      ↓
Timer fires → ambient LLM request (async)
                                      ↓
                              LLM response arrives
                                      ↓
                         words → TextOverlay particle queue
                         mood  → params.patch()
```

The render loop never waits. It reads from the TextOverlay's particle list each frame.

## Consequences
- **Pro**: Text is part of the visual world, not floating DOM
- **Pro**: LLM is fully async — zero render impact
- **Pro**: Typing feels magical — letters scatter like sparks
- **Con**: Canvas texture upload each frame (~0.5ms) — acceptable
- **Con**: Requires an LLM API key — graceful degradation if absent (ambient mode only, no voice)
- **Con**: Font rendering limited to what Canvas2D supports

## API Key Handling
The LLM API key is provided via environment variable `VITE_LLM_API_KEY`. If absent, the experience runs in "silent mode" — all visuals and interaction work, but the voice never speaks.
