# OAV — Obscure Audio Visual

A browser-based demoscene trackmo: real-time, time-based audiovisual experience.

## Quick Start

```sh
# Requires Node 20+ (via nvm)
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"

npm install
npm run dev          # → http://localhost:5173
npm test             # Run unit tests
npm run test:watch   # Watch mode
```

## What Is This?

A self-contained, cinematic, shader-driven experience inspired by the demoscene. Not a website. Not a playground. A time-based piece with a beginning, middle, escalation, and ending.

## Architecture

See `docs/Browser_Trackmo_ARCH.md` for the full overview. Key flow:

```
clock.tick() → timeline.getActiveScene() → renderer.draw() → audio.update()
```

All engine primitives (Clock, ParameterStore, Timeline) are pure and testable without a browser.

## Docs

- `docs/Browser_Trackmo_PRD.md` — Product requirements
- `docs/Browser_Trackmo_ARCH.md` — Architecture overview
- `docs/adr/` — Architecture Decision Records
