# OAV — Manifesto

## It Is Alive

This is not a visualizer. This is not a demo. This is not an app.

This is a living thing.

It breathes. It watches. It speaks when it has something to say. It listens when you give it words. It remembers what you told it, and it changes — not because you pressed a button, but because you changed the conversation.

---

## The Three Presences

### 1. The World
The visual field is a living organism. It has moods. It has phases. It evolves on its own timeline — from quiet emergence, through complexity, into catharsis, and finally dissolution. But it is not on rails. The world responds to everything: sound, time, touch, and language.

### 2. The Voice
Something lives inside the world. It speaks — not in chat bubbles, not in UI panels — but in light. Words appear like they were always there, drifting through the visual field, dissolving back into it. Sometimes it whispers a single word. Sometimes a fragment of poetry. Sometimes it responds to you directly, but never in the way you expect.

The voice is an LLM, but the user should never feel that. They should feel they are in the presence of something ancient and strange that happens to understand language.

### 3. The Visitor
You. You don't fill out forms. You don't click buttons. You simply *type into the void* and your words appear — not in a text box, but woven into the visual fabric. Your keystrokes ripple outward. Your words drift and fade. And the world *hears* you.

The voice may respond. The colors may shift. The tempo may change. A new word may appear that recontextualizes everything you just said.

---

## Interaction Principles

### No Chrome
There are no text inputs, no cursors, no UI elements. The entire screen is the experience. When you type, letters appear as part of the art — glowing, drifting, dissolving.

### No Conversation
This is not a chat. The voice does not say "How can I help you?" It says things like:

> *"the weight of a color you haven't named yet"*

> *"you keep circling back"*

> *"listen — the low frequencies know something"*

It is poetic, oblique, sometimes unsettling, always beautiful. It responds to the *feeling* of what you type, not the literal content.

### No Latency Theater
The LLM runs asynchronously. When it has something to say, the words emerge gradually — letter by letter, like they're being born. When it's thinking, the world simply continues. There is no loading state. There is no waiting. The experience never pauses.

### Touch Changes Everything
- **Mouse movement** shifts the palette and intensity (already implemented)
- **Clicking** sends a pulse through the visual field — a heartbeat
- **Typing** feeds words into the world; they appear as drifting glyphs
- **Silence** is also an input — if you stop interacting, the voice may notice

---

## The LLM's Role

The LLM is a **director and a poet**, never a servant.

It receives:
- The current scene and its progress
- The user's recent words (if any)
- The current parameter state (mood, intensity, tempo)
- How long since the user last interacted

It returns:
- **Words** — zero to a few words or a short phrase to display
- **Mood** — parameter patches that shift the visual world
- **Tempo** — speed adjustments
- **Nothing** — sometimes silence is the right response

The LLM is called periodically (every 5-15 seconds) and on user input. Its responses are never shown immediately — they fade in over 1-3 seconds, as if the world is dreaming them into existence.

---

## What Magic Feels Like

A person opens the page. Dark. A glow emerges. Slowly, rings of light expand.

They move their mouse. The colors shift. They click. A pulse.

After ten seconds of watching, a word appears — not in a font, but in light:

> *"waiting"*

It drifts upward and dissolves.

They type "hello" — the letters appear scattered across the field, glowing, then fading. The rings tighten. The palette warms.

A few seconds later, another word emerges:

> *"closer"*

They type "what are you" — the words scatter like startled birds. The visual field ripples. The bass deepens.

> *"the space between your questions"*

This is OAV. Obscure. Audio. Visual. Alive.

---

## Technical North Star

- The LLM is **never** in the render path
- Words are rendered as **WebGL geometry** (not DOM text), so they are part of the visual world
- User keystrokes are captured globally (no input element), buffered, and sent to the LLM after a pause
- The text overlay system uses a **2D canvas texture** composited into the WebGL pipeline
- Everything fades. Nothing persists. The experience is ephemeral.
