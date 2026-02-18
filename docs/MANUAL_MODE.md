# Manual Mode for OAV

Manual mode provides direct control over the OAV audiovisual experience, allowing you to bypass the AI Director and manually control scenes, presets, and parameters.

## Features

### 🎛️ Direct Control
- **Scene Control**: Manual scene selection (intro, build, climax, outro)
- **Visual Presets**: 21+ curated visual presets with categorized buttons
- **Audio Presets**: Typing and atmospheric audio preset controls
- **Parameter Sliders**: Real-time control over 30+ visual parameters
- **GPU Effects**: Trigger fireworks, sparkles, and spring effects

### 🎬 Scene Management
- **Director Disabled**: AI Director is disabled in manual mode
- **No Auto-Transitions**: Scenes don't switch automatically
- **Manual Transitions**: Crossfade between scenes on demand

### 🎨 Visual Presets

#### Intense/Energetic
- `fire` - Hot, intense, high energy
- `lightning` - Electrical, dramatic, powerful
- `storm` - Turbulent, chaotic, aggressive
- `nightmare` - Distorted, unsettling, intense
- `electric_storm` - High energy, strobing, chaotic

#### Cold/Cool
- `ice` - Cold, icy, crystalline, clean
- `aurora` - Atmospheric, flowing, ethereal
- `crystal` - Clear, bright, geometric
- `underwater` - Flowing, muffled, mysterious

#### Warm/Organic
- `lava` - Hot, flowing, volcanic
- `organic` - Natural, flowing, textured
- `dream` - Soft, gentle, ethereal

#### Psychedelic/Abstract
- `psychedelic` - Trippy, resonant, colorful
- `vaporwave` - Dreamy, nostalgic, retro
- `glitch_art` - Distorted, digital, chaotic
- `cosmic` - Spacious, ethereal, mysterious

#### Industrial/Mechanical
- `industrial` - Mechanical, harsh, gritty
- `digital` - Electronic, sharp, modern
- `minimal` - Clean, simple, restrained
- `noir` - Dark, moody, cinematic

#### Calm/Peaceful
- `zen` - Peaceful, meditative, balanced
- `minimal` - Clean, simple, focused

### 🎵 Audio Presets

#### Typing Sounds
- `morse_code` - Rhythmic beeps
- `typewriter` - Mechanical clicks
- `subtle_beat` - Gentle rhythm
- `impact_beat` - Strong percussive hits
- `raindrops` - Natural rain sounds

#### Atmosphere
- `noir`, `vaporwave`, `fire`, `ice`, `cosmic`, `zen` - Matching visual presets

### 🎛️ Parameter Controls

Parameters are grouped by category:

#### Core
- `intensity` - Overall brightness/energy
- `speed` - Animation speed
- `hue` - Color hue
- `pulse` - Click response intensity

#### Color & Tone
- `saturation` - Color saturation
- `contrast` - Color contrast
- `warmth` - Color temperature
- `gamma` - Brightness curve
- `invert` - Color inversion

#### Geometry & Space
- `zoom` - Camera zoom
- `rotation` - Global rotation
- `symmetry` - Kaleidoscope folds
- `mirror_x/y` - Horizontal/vertical mirroring

#### Pattern & Texture
- `warp` - Domain distortion
- `noise_scale` - Pattern detail
- `octaves` - Fractal layers
- `grain` - Film grain
- `cells` - Voronoi patterns

#### Motion & Animation
- `drift_x/y` - Pan speed
- `spin` - Rotation speed
- `wobble` - Sinusoidal distortion
- `strobe` - Strobe flash

#### Post-processing
- `bloom` - Glow intensity
- `vignette` - Edge darkening
- `aberration` - Chromatic aberration
- `glitch` - Digital glitch
- `feedback` - Temporal trails

### ✨ GPU Effects
- **Firework** - Explosive particle bursts
- **Sparkles** - Ambient particle effects
- **Poke Springs** - Jello-like mesh deformation
- **Enhanced Firework** - Professional multi-stage fireworks

## Usage

### Enabling Manual Mode

1. **Keyboard Shortcut**: Press `F1` to toggle manual mode on/off
2. **Programmatic**: Use `window.__OAV__.manualMode.toggle()`

### Control Panel

When manual mode is enabled, a control panel appears in the top-right corner with:

- **Scene buttons** - Switch between scenes
- **Preset buttons** - Apply visual and audio presets
- **Parameter sliders** - Fine-tune all visual parameters
- **GPU effect buttons** - Trigger particle effects
- **Close button** - Exit manual mode

### Testing

Load the test script in the browser console:

```javascript
// Load test script (copy-paste test-manual-mode.js content)
// Then run tests:
window.testManualMode.runAll()
```

## Architecture

### Files Added
- `src/manual/manual-mode.ts` - Main ManualMode class
- `src/manual/index.ts` - Module exports

### Integration
- Integrated into `main.ts` with keyboard shortcut
- Exposed in debug interface as `window.__OAV__.manualMode`
- Disables Director and auto-transitions when enabled
- Updates parameter sliders in real-time

### Dependencies
- Uses existing `ToolBridge` for preset/scene changes
- Integrates with `ParameterStore` for parameter control
- Connects to GPU systems for particle effects
- Works with `EnhancedAudio` for audio presets

## Development

### Adding New Presets

1. Add preset definition to `src/llm/tool-bridge.ts` in `PRESETS`
2. Update preset categories in `ManualMode.createVisualPresets()`
3. Update `tools.ts` preset enum if needed

### Adding New Parameters

1. Define parameter in `main.ts` with `params.define()`
2. Add to parameter groups in `ManualMode.createParameterControls()`
3. Update range mapping in `getParameterRange()`

### Customizing UI

The UI is styled with inline CSS in `ManualMode.createUI()`. Modify the styles to customize appearance.

## Troubleshooting

### Manual Mode Won't Enable
- Check if `window.__OAV__.manualMode` exists
- Verify TypeScript compilation succeeded
- Check browser console for errors

### Sliders Not Updating
- Ensure `manualMode.updateSliders()` is called in main loop
- Verify parameter names match `ParameterStore` definitions

### Presets Not Applying
- Check `ToolBridge` is properly connected
- Verify preset names exist in `PRESETS` object
- Check for console errors during preset application

## Future Enhancements

- Save/load manual mode configurations
- MIDI controller support
- Touch-friendly UI for tablets
- Real-time parameter visualization
- Audio waveform display
- Scene transition preview
