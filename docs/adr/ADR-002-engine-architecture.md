# ADR-002: Engine Architecture — Clock / Params / Timeline

## Status
Accepted

## Context
The ARCH doc specifies: `clock → timeline → state → render → audio sync`. We need to decide how to structure these core primitives so they are testable in isolation, deterministic, and composable.

## Decision

### Clock
- A pure class that tracks elapsed time, delta time, and BPM-derived beat position
- Supports `pause()`, `resume()`, `seek(t)`
- Does **not** call `requestAnimationFrame` itself — the main loop owns the frame pump
- Testable with manual `tick(dt)` calls

### ParameterStore
- A flat `Map<string, number>` with min/max clamping per key
- `define(name, min, max, default)` to register parameters
- `set(name, value)` clamps automatically
- `patch(record)` for bulk updates (used by LLM director later)
- Emits no events — consumers read on each frame (pull model, not push)

### Timeline
- An ordered list of `TimelineEntry { startTime, endTime, sceneId, transition? }`
- `getActiveScene(time)` returns current scene ID + normalized progress `[0,1]`
- Transition overlap is allowed — renderer decides how to blend

### Main Loop
- Owns `requestAnimationFrame`
- Each frame: `clock.tick()` → `timeline.getActiveScene()` → `renderer.draw()` → `audio.update()`
- Never awaits anything in the hot path

## Consequences
- All core primitives are pure and testable without a browser (no DOM/WebGL dependency)
- The pull model avoids event-ordering bugs and keeps the frame budget predictable
- Adding the LLM director later is just another source of `parameterStore.patch()` calls
