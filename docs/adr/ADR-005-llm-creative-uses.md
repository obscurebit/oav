# ADR-005: LLM Provider & 10 Creative Uses

## Status
Accepted

## Context
We have access to NVIDIA NIM API running Llama 3.3 Nemotron Super 49B — a powerful reasoning model with `/think` support, accessed via an OpenAI-compatible endpoint. The model is fast, creative, and capable of structured JSON output. We need to decide how to use it beyond basic ambient poetry.

## Provider Decision

| Aspect | Choice |
|--------|--------|
| Provider | NVIDIA NIM |
| Model | `nvidia/llama-3.3-nemotron-super-49b-v1.5` |
| Endpoint | `https://integrate.api.nvidia.com/v1` (OpenAI-compatible) |
| Auth | Bearer token via `VITE_LLM_API_KEY` env var |
| Reasoning | `/think` system prompt prefix enables chain-of-thought |
| Fallback | `AmbientVoice` (curated phrases) when no API key |

## 10 Creative Uses of the LLM

### 1. ✅ The Ambient Poet (implemented)
The LLM periodically speaks — oblique, beautiful fragments that drift through the visual field. It's aware of the scene, the mood, and the passage of time. It never explains. It never asks.

### 2. ✅ The Listener (implemented)
When the user types, the LLM interprets the *feeling* of their words and responds — not literally, but poetically. "hello" might get "closer". "what are you" might get "the space between your questions".

### 3. ✅ The Mood Shifter (implemented)
The LLM returns `mood` patches that change the visual world — shifting hue, intensity, speed. The user's words literally change reality. Type "fire" and the world might warm. Type "calm" and it might slow.

### 4. 🎯 The Namer (to implement)
The LLM names the current moment. Not a title — a *feeling-name*. "the hour of dissolving edges". "when the bass remembers". These names appear larger, more prominent, and persist longer than regular voice utterances.

### 5. 🎯 The Recontextualizer (to implement)
When the user types a word, the LLM doesn't just respond — it *transforms* the word. The user types "love" and the LLM might return "love" rewritten as "the gravity between two frequencies". The original word fades and the transformation takes its place.

### 6. 🎯 The Scene Whisperer (to implement)
At scene transitions, the LLM is given special context about what's ending and what's beginning. It produces a transitional utterance — a bridge between moods. "the rings are opening" at intro→build. "everything at once" at build→climax.

### 7. 🔮 The Memory Keeper (future)
The LLM maintains a running "memory" of the session — what the user typed, what scenes they lingered on, what moods dominated. Late in the experience, it can reference earlier moments: "you said 'hello' when the world was still dark".

### 8. 🔮 The Shader Poet (future)
The LLM generates short GLSL expressions that modulate shader parameters in novel ways. Not full shaders — just mathematical expressions like `sin(t * 2.3 + bass * 4.0)` that get injected as uniform modulations. The AI literally writes the math that drives the visuals.

### 9. 🔮 The Rhythm Conductor (future)
The LLM analyzes the audio energy pattern and suggests BPM adjustments, scene timing changes, or parameter oscillation patterns. It becomes a real-time music director, not just a poet.

### 10. 🔮 The Farewell (future)
When the outro scene begins, the LLM is told the experience is ending. It produces a final utterance that feels like a goodbye — but not a conventional one. Something that makes the visitor want to come back. "the glow remembers you" or "you were the frequency".

## Implementation Priority
- **Now**: Items 4, 5, 6 (The Namer, Recontextualizer, Scene Whisperer)
- **Soon**: Item 7 (Memory Keeper — needs session state)
- **Later**: Items 8, 9, 10 (require deeper integration)

## Consequences
- **Pro**: Each use adds a layer of magic without changing the core architecture
- **Pro**: All LLM calls remain async — zero render impact
- **Pro**: NVIDIA NIM is fast and the model is strong at creative/poetic tasks
- **Con**: API costs scale with call frequency (mitigated by 8-15s intervals)
- **Con**: `/think` reasoning adds latency but improves quality — acceptable for our async model
