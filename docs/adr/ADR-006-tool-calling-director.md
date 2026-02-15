# ADR-006: Tool-Calling LLM Director

## Status
Accepted

## Context
The current Director returns a flat JSON blob (`{ words, mood, energy }`). This works but limits the LLM to a single action per call and requires us to encode all possible behaviors into a fixed schema. The NVIDIA NIM API (OpenAI-compatible) supports native tool/function calling, which lets the LLM choose from a menu of actions and call multiple tools per turn.

Additionally, the Nemotron model's `/think` reasoning produces chain-of-thought text that we currently discard. Fragments of this thinking could be surfaced as a visual element — giving the audience a glimpse of the machine's inner process.

## Decision

### Replace JSON response with tool calling

The Director sends tool definitions to the LLM API. The LLM responds with `tool_calls` instead of (or alongside) content. We execute each tool call against the engine.

### Three abstraction levels

**Level 1 — Poetic (high-level, feeling-based)**
The LLM's primary mode. These express intent, not mechanics.

| Tool | Parameters | Effect |
|------|-----------|--------|
| `speak` | `words`, `kind` (voice/echo/name/transform) | Display text particles |
| `shift_mood` | `feeling` (warmer/darker/faster/slower/brighter/deeper) | Map feeling → param changes |
| `name_moment` | `name` | Large, centered, long-lived text |
| `whisper` | `fragment` | Surface a thinking fragment (small, faint, fast) |

**Level 2 — Parametric (mid-level, direct control)**
Precise numeric control over the parameter store.

| Tool | Parameters | Effect |
|------|-----------|--------|
| `set_param` | `name`, `value` | Immediate param set |
| `drift_param` | `name`, `target`, `duration` | Smooth transition over time |
| `pulse_param` | `name`, `amplitude`, `period`, `duration` | Temporary oscillation |

**Level 3 — Structural (low-level, scene control)**
Changes the structure of the experience.

| Tool | Parameters | Effect |
|------|-----------|--------|
| `transition_to` | `scene_id`, `duration` | Trigger scene change |
| `extend_scene` | `seconds` | Extend current scene |
| `spawn_particles` | `count`, `text[]`, `kind` | Batch-create particles |

### Thinking fragments

When the model returns `<think>...</think>` blocks, we extract short phrases (< 60 chars) and surface them as `whisper` particles — very small, very faint, drifting quickly. The audience sees the intelligence working without reading full reasoning chains.

### ToolBridge

A new class `ToolBridge` sits between the Director and the engine. It:
1. Receives parsed tool calls from the Director
2. Executes them against the ParameterStore, Timeline, TextParticleSystem
3. Manages active drifts and pulses (updated each frame)
4. Returns execution results (for potential multi-turn, though we don't use it yet)

### Graceful degradation

- If the model doesn't support tool calling → fall back to JSON parsing (current behavior)
- If no API key → AmbientVoice fallback (unchanged)
- If a tool call has invalid params → skip it silently, log a warning

## Consequences

- **Pro**: LLM has genuine agency — it decides what to do, not just what to say
- **Pro**: Multiple actions per turn (speak AND shift mood AND pulse a param)
- **Pro**: Thinking fragments add a unique "machine consciousness" aesthetic
- **Pro**: Smooth param transitions (drift/pulse) make LLM-driven changes feel organic
- **Pro**: Tool schema is self-documenting — the LLM understands what it can do
- **Con**: More complex parsing (tool_calls vs content)
- **Con**: Drift/pulse system adds per-frame work (but trivial — just lerps)
- **Con**: Tool calling may use more tokens than flat JSON
