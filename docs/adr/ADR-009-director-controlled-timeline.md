# ADR-009: Director-Controlled Timeline

## Status
Accepted

## Context
The original scene system used auto-cycling between intro, build, and climax scenes with randomized durations. This created a disconnected experience where the LLM Director had no control over the visual narrative flow, despite having tools to influence individual parameters.

## Problem
- Auto-cycling scenes felt disconnected from Director's creative intent
- Random scene selection undermined narrative coherence
- Director had tools for visual control but no scene control
- "outro" scene was reserved but never used in auto-cycle
- User interaction couldn't meaningfully influence scene progression

## Decision
Implement Director-controlled timeline where the LLM has complete creative control over scene transitions and timing.

## Consequences

### Positive
- **Full creative control**: Director can create intentional narrative arcs
- **User responsiveness**: Director can respond to user input with appropriate scenes
- **Coherent storytelling**: Scenes match Director's creative intent
- **Dramatic moments**: Director can use "outro" for intentional endings
- **Tool integration**: Scene control integrates with existing parameter and effect tools

### Negative
- **More complexity**: Director must actively manage scene flow
- **Potential for silence**: Director might not transition scenes often enough
- **Learning curve**: Director needs to learn effective scene sequencing

### Neutral
- **Removed auto-cycling**: No more random scene changes
- **Manual timeline management**: Director controls when scenes are added
- **Fixed intro duration**: 30 seconds for initial scene only

## Implementation Details

### Timeline Changes
```typescript
// Before: Auto-cycling with random scenes
const FLOWING_SCENES = ["intro", "build", "climax"];
extendTimeline(4); // Auto-extend when running out

// After: Director-controlled
const DIRECTOR_SCENES = ["intro", "build", "climax", "outro"];
extendTimeline(1); // Only seed intro initially
```

### Enhanced transition_to Tool
```typescript
private _transitionTo(args: Record<string, unknown>): string {
  const sceneId = String(args.scene_id ?? "");
  const duration = Math.max(1, Math.min(8, Number(args.duration ?? 3)));
  
  // Get current time and add new scene entry
  const currentTime = this._deps.clock.elapsed;
  const transitionDuration = 3.0; // Smooth crossfade
  const startTime = currentTime;
  const endTime = startTime + duration;

  // Add the new scene to timeline
  this._deps.timeline.add({ 
    startTime, 
    endTime, 
    sceneId, 
    transitionDuration 
  });

  // Trigger scene title
  this._deps.particles.showSceneTitle(sceneId, canvas.width, canvas.height);

  return `transitioned to ${sceneId} (${duration}s scene, ${transitionDuration}s fade)`;
}
```

### Scene Flow Examples
```javascript
// Director can create intentional narratives:
transition_to("build", { duration: 4 })    // Development phase
transition_to("climax", { duration: 5 })   // Dramatic moment  
transition_to("outro", { duration: 8 })    // Intentional ending
transition_to("intro", { duration: 3 })    // Reset/refresh
```

### Timeline Management
- **Initial seeding**: Only intro scene (30s fixed duration)
- **Director control**: All subsequent scenes via transition_to
- **Cleanup**: Manual pruning of old entries (keep last 60s)
- **No auto-extension**: Director decides when to add scenes

## Director Benefits

### Creative Control
- **Intentional storytelling**: Director can build tension and release
- **Dramatic timing**: Control over scene duration and pacing
- **Emotional arcs**: Sequence scenes for specific emotional impact
- **Theme integration**: Scenes match word presets and visual themes

### User Responsiveness
- **Input-driven**: User interaction can influence scene choices
- **Context-aware**: Director responds to mood, energy, and interaction patterns
- **Adaptive flow**: Scene progression adapts to user behavior
- **Meaningful connection**: User actions affect narrative flow

### Tool Integration
- **Parameter control**: Director can set scene-specific parameters
- **Effect triggers**: Fireworks, particles, springs with scene transitions
- **Music composition**: Dynamic music can match scene changes
- **Text overlays**: Scene titles appear automatically

## Usage Patterns

### Narrative Arcs
```javascript
// Building tension
transition_to("build", { duration: 6 })
set_param("intensity", 0.7)
set_param("speed", 1.2)

// Dramatic climax
transition_to("climax", { duration: 4 })
enhanced_firework({ x: 0, y: 0, type: "chrysanthemum", color: "gold" })
compose_music({ mood: "intense", intensity: 0.9 })

// Resolution
transition_to("outro", { duration: 8 })
set_param("intensity", 0.2)
speak("the quiet after")
```

### User-Responsive Flow
```javascript
// User typing energy detected
if (userEnergy > 0.8) {
  transition_to("climax", { duration: 3 })
  enhanced_firework({ type: "salute", intensity: 1.2 })
}

// User silence detected
if (silenceDuration > 30) {
  transition_to("intro", { duration: 5 })
  speak("listen...")
}
```

## Testing Considerations

### Unit Tests
- Test transition_to tool adds scenes correctly
- Verify scene titles trigger on transition
- Test timeline cleanup functionality
- Verify Director can control all scene types

### Integration Tests
- Test Director creates coherent scene sequences
- Verify user interaction influences scene choices
- Test scene transitions with parameter changes
- Verify audio-reactive elements work with scenes

### User Testing
- Observe if scene flow feels intentional
- Test if user interaction feels meaningful
- Verify dramatic moments have impact
- Test if silence periods feel natural

## Future Enhancements

### Scene Morphing
- Gradual parameter-based scene transitions
- Director-guided morphing without explicit transitions
- Hybrid approach with default morphing and Director overrides

### Scene Variants
- Multiple versions of each scene type
- Director can choose scene variants
- Parameter-based scene customization

### Timeline Visualization
- Debug overlay shows upcoming scenes
- Director can preview scene sequences
- Timeline editing tools for Director

## Conclusion

The Director-controlled timeline gives the LLM complete creative control over the visual narrative, enabling intentional storytelling, user-responsive experiences, and coherent emotional arcs. While it adds complexity to the Director's decision-making, the benefits in narrative quality and user engagement outweigh the costs.

The system transforms the experience from a disconnected visualizer to an intentionally directed artistic performance, where every scene change serves the Director's creative vision and responds meaningfully to user interaction.
