/**
 * Manual Mode Control Panel
 * 
 * Provides direct manual control over OAV parameters, presets, and scenes.
 * In manual mode:
 * - Director is disabled
 * - Scenes don't auto-transition  
 * - User has direct control via UI
 */

import { ParameterStore } from "../engine/params";
import { Timeline } from "../engine/timeline";
import { ToolBridge } from "../llm/tool-bridge";
import { Audio } from "../audio/audio";
import { GPUParticleSystem } from "../renderer/particles/gpu-particles";
import { GPUSpringSystem } from "../renderer/particles/gpu-springs";
import { PRESETS } from "../llm/tool-bridge";

export interface ManualModeDeps {
  params: ParameterStore;
  timeline: Timeline;
  toolBridge: ToolBridge;
  audio: Audio;
  gpuParticles: GPUParticleSystem;
  gpuSprings: GPUSpringSystem;
  canvasWidth: () => number;
  canvasHeight: () => number;
}

export class ManualMode {
  private deps: ManualModeDeps;
  private enabled = false;
  private uiContainer: HTMLElement | null = null;
  private paramSliders: Map<string, HTMLInputElement> = new Map();

  constructor(deps: ManualModeDeps) {
    this.deps = deps;
  }

  /** Enable manual mode and show control panel */
  enable(): void {
    if (this.enabled) return;
    
    this.enabled = true;
    this.createUI();
    this.disableDirector();
    this.disableAutoTransitions();
    console.log("[MANUAL] Manual mode enabled");
  }

  /** Disable manual mode and hide control panel */
  disable(): void {
    if (!this.enabled) return;
    
    this.enabled = false;
    this.removeUI();
    this.enableDirector();
    console.log("[MANUAL] Manual mode disabled");
  }

  /** Toggle manual mode on/off */
  toggle(): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  private disableDirector(): void {
    // Director will be disabled from main.ts
    const director = (window as any).__OAV__?.director;
    if (director) {
      director.enabled = false;
    }
  }

  private enableDirector(): void {
    const director = (window as any).__OAV__?.director;
    if (director) {
      director.enabled = true;
    }
  }

  private disableAutoTransitions(): void {
    // Clear any existing timeline entries beyond current
    const currentTime = (window as any).__OAV__?.elapsed || 0;
    const current = this.deps.timeline.getTransitionState(currentTime);
    
    // Always ensure we have a scene, even if we can't get current state
    const sceneId = current?.current?.sceneId || "intro";
    
    console.log(`[MANUAL] Disabling auto-transitions, keeping scene: ${sceneId}`);
    
    // Keep only current scene, remove all future entries by pruning everything
    this.deps.timeline.prune(Number.MAX_SAFE_INTEGER);
    // Add current scene with a very long duration (effectively infinite)
    // Use 1 hour duration to avoid progress calculation issues
    const infiniteDuration = 3600.0; // 1 hour in seconds
    this.deps.timeline.add({
      startTime: currentTime,
      endTime: currentTime + infiniteDuration,
      sceneId: sceneId,
      transitionDuration: 0
    });
  }

  private createUI(): void {
    // Remove existing UI if any
    this.removeUI();

    // Create main container
    this.uiContainer = document.createElement("div");
    this.uiContainer.id = "manual-mode-controls";
    this.uiContainer.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 320px;
      max-height: 90vh;
      background: rgba(0, 0, 0, 0.9);
      border: 1px solid #333;
      border-radius: 8px;
      padding: 15px;
      color: #fff;
      font-family: monospace;
      font-size: 12px;
      overflow-y: auto;
      z-index: 10000;
      backdrop-filter: blur(10px);
    `;

    // Header
    const header = document.createElement("div");
    header.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #0ff;">🎛️ MANUAL MODE</h3>
      <p style="margin: 0 0 15px 0; font-size: 11px; color: #aaa;">
        Director disabled • Direct control active
      </p>
    `;
    this.uiContainer.appendChild(header);

    // Scene controls
    this.createSceneControls();
    
    // Visual preset buttons  
    this.createVisualPresets();
    
    // Audio preset controls
    this.createAudioPresets();
    
    // Manual parameter sliders
    this.createParameterControls();
    
    // GPU effects
    this.createGPUControls();
    
    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Close Manual Mode";
    closeBtn.style.cssText = `
      width: 100%;
      padding: 8px;
      margin-top: 15px;
      background: #333;
      color: #fff;
      border: 1px solid #555;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
    `;
    closeBtn.onclick = () => this.disable();
    this.uiContainer.appendChild(closeBtn);

    document.body.appendChild(this.uiContainer);
  }

  private createSceneControls(): void {
    const section = this.createSection("🎬 Scene Control");
    
    const scenes = ["intro", "build", "climax", "outro"];
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px;";
    
    scenes.forEach(sceneId => {
      const btn = document.createElement("button");
      btn.textContent = sceneId.toUpperCase();
      btn.style.cssText = `
        padding: 6px;
        background: #222;
        color: #0ff;
        border: 1px solid #444;
        border-radius: 3px;
        cursor: pointer;
        font-family: monospace;
        font-size: 11px;
      `;
      btn.onclick = () => this.transitionToScene(sceneId);
      buttonContainer.appendChild(btn);
    });
    
    section.appendChild(buttonContainer);
    this.uiContainer!.appendChild(section);
  }

  private createVisualPresets(): void {
    const section = this.createSection("🎨 Visual Presets");
    
    // Categorized preset buttons
    const categories = {
      "Intense": ["fire", "lightning", "storm", "nightmare", "electric_storm"],
      "Cool": ["ice", "aurora", "crystal", "underwater"],
      "Warm": ["lava", "organic", "dream"],
      "Psychedelic": ["psychedelic", "vaporwave", "glitch_art", "cosmic"],
      "Industrial": ["industrial", "digital", "minimal", "noir"],
      "Calm": ["zen", "minimal", "dream", "aurora"]
    };

    Object.entries(categories).forEach(([category, presets]) => {
      const catDiv = document.createElement("div");
      catDiv.innerHTML = `<div style="color: #ff0; margin-bottom: 3px; font-size: 10px;">${category}</div>`;
      
      const buttonGrid = document.createElement("div");
      buttonGrid.style.cssText = "display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px; margin-bottom: 8px;";
      
      presets.forEach(preset => {
        const btn = document.createElement("button");
        btn.textContent = preset.replace("_", " ");
        btn.style.cssText = `
          padding: 4px;
          background: #333;
          color: #fff;
          border: 1px solid #555;
          border-radius: 2px;
          cursor: pointer;
          font-family: monospace;
          font-size: 10px;
        `;
        btn.onclick = () => this.applyPreset(preset);
        buttonGrid.appendChild(btn);
      });
      
      catDiv.appendChild(buttonGrid);
      section.appendChild(catDiv);
    });
    
    this.uiContainer!.appendChild(section);
  }

  private createAudioPresets(): void {
    const section = this.createSection("🎵 Audio Presets");
    
    // Audio preset buttons
    const audioPresets = {
      "Typing": ["morse_code", "typewriter", "subtle_beat", "impact_beat", "raindrops"],
      "Atmosphere": ["noir", "vaporwave", "fire", "ice", "cosmic", "zen"]
    };

    Object.entries(audioPresets).forEach(([category, presets]) => {
      const catDiv = document.createElement("div");
      catDiv.innerHTML = `<div style="color: #ff0; margin-bottom: 3px; font-size: 10px;">${category}</div>`;
      
      const buttonGrid = document.createElement("div");
      buttonGrid.style.cssText = "display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px; margin-bottom: 8px;";
      
      presets.forEach(preset => {
        const btn = document.createElement("button");
        btn.textContent = preset.replace("_", " ");
        btn.style.cssText = `
          padding: 4px;
          background: #333;
          color: #fff;
          border: 1px solid #555;
          border-radius: 2px;
          cursor: pointer;
          font-family: monospace;
          font-size: 10px;
        `;
        btn.onclick = () => this.applyAudioPreset(preset);
        buttonGrid.appendChild(btn);
      });
      
      catDiv.appendChild(buttonGrid);
      section.appendChild(catDiv);
    });
    
    this.uiContainer!.appendChild(section);
  }

  private createParameterControls(): void {
    const section = this.createSection("🎛️ Parameters");
    
    // Group parameters by category
    const paramGroups = {
      "Core": ["intensity", "speed", "hue", "pulse"],
      "Color": ["saturation", "contrast", "warmth", "gamma", "invert"],
      "Geometry": ["zoom", "rotation", "symmetry", "mirror_x", "mirror_y"],
      "Pattern": ["warp", "noise_scale", "octaves", "grain", "cells"],
      "Motion": ["drift_x", "drift_y", "spin", "wobble", "strobe"],
      "Post": ["bloom", "vignette", "aberration", "glitch", "feedback"]
    };

    Object.entries(paramGroups).forEach(([category, paramNames]) => {
      const groupDiv = document.createElement("div");
      groupDiv.innerHTML = `<div style="color: #ff0; margin-bottom: 3px; font-size: 10px;">${category}</div>`;
      
      paramNames.forEach(paramName => {
        const sliderDiv = this.createParameterSlider(paramName);
        groupDiv.appendChild(sliderDiv);
      });
      
      section.appendChild(groupDiv);
    });
    
    this.uiContainer!.appendChild(section);
  }

  private getParameterRange(paramName: string): { min: number; max: number } {
    // Get the parameter range by checking the current value and known ranges
    // Since ParameterStore doesn't expose getRange, we'll use predefined ranges
    const ranges: Record<string, { min: number; max: number }> = {
      // Core
      intensity: { min: 0, max: 1 },
      speed: { min: 0.1, max: 4 },
      hue: { min: 0, max: 1 },
      pulse: { min: 0, max: 1 },
      // Color & Tone
      saturation: { min: 0, max: 2 },
      contrast: { min: 0, max: 3 },
      warmth: { min: -1, max: 1 },
      gamma: { min: 0.2, max: 3 },
      invert: { min: 0, max: 1 },
      // Geometry & Space
      zoom: { min: 0.2, max: 5 },
      rotation: { min: -3.14, max: 3.14 },
      symmetry: { min: 0, max: 12 },
      mirror_x: { min: 0, max: 1 },
      mirror_y: { min: 0, max: 1 },
      // Pattern & Texture
      warp: { min: 0, max: 3 },
      noise_scale: { min: 0.5, max: 10 },
      octaves: { min: 1, max: 8 },
      grain: { min: 0, max: 1 },
      cells: { min: 0, max: 1 },
      // Motion & Animation
      drift_x: { min: -2, max: 2 },
      drift_y: { min: -2, max: 2 },
      spin: { min: -2, max: 2 },
      wobble: { min: 0, max: 1 },
      strobe: { min: 0, max: 1 },
      // Post-processing
      bloom: { min: 0, max: 2 },
      vignette: { min: 0, max: 2 },
      aberration: { min: 0, max: 1 },
      glitch: { min: 0, max: 1 },
      feedback: { min: 0, max: 1 }
    };
    
    return ranges[paramName] || { min: 0, max: 1 };
  }

  private createParameterSlider(paramName: string): HTMLElement {
    const container = document.createElement("div");
    container.style.cssText = "margin-bottom: 8px;";

    // Label
    const label = document.createElement("div");
    label.textContent = paramName;
    label.style.cssText = "font-size: 10px; margin-bottom: 2px; color: #ccc;";
    container.appendChild(label);

    // Slider container
    const sliderContainer = document.createElement("div");
    sliderContainer.style.cssText = "display: flex; align-items: center; gap: 5px;";

    // Slider
    const slider = document.createElement("input");
    slider.type = "range";
    slider.style.cssText = "flex: 1; height: 16px;";
    
    // Get parameter range
    const range = this.getParameterRange(paramName);
    const current = this.deps.params.get(paramName);
    
    slider.min = range.min.toString();
    slider.max = range.max.toString();
    slider.step = this.getStepSize(range.min, range.max);
    slider.value = current.toString();

    // Value display
    const valueDisplay = document.createElement("span");
    valueDisplay.textContent = current.toFixed(2);
    valueDisplay.style.cssText = "font-size: 9px; color: #0ff; width: 35px; text-align: right;";

    // Update handler
    slider.addEventListener("input", (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      valueDisplay.textContent = value.toFixed(2);
      this.deps.params.set(paramName, value);
    });

    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(valueDisplay);
    container.appendChild(sliderContainer);

    // Store slider reference
    this.paramSliders.set(paramName, slider);

    return container;
  }

  private getStepSize(min: number, max: number): string {
    const range = max - min;
    if (range <= 1) return "0.01";
    if (range <= 5) return "0.1";
    return "0.5";
  }

  private createGPUControls(): void {
    const section = this.createSection("✨ GPU Effects");
    
    const effects = [
      { name: "Firework", action: () => this.triggerFirework() },
      { name: "Sparkles", action: () => this.triggerSparkles() },
      { name: "Poke Springs", action: () => this.pokeSprings() },
      { name: "Enhanced Firework", action: () => this.triggerEnhancedFirework() }
    ];

    const buttonGrid = document.createElement("div");
    buttonGrid.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 5px;";
    
    effects.forEach(effect => {
      const btn = document.createElement("button");
      btn.textContent = effect.name;
      btn.style.cssText = `
        padding: 6px;
        background: #444;
        color: #fff;
        border: 1px solid #666;
        border-radius: 3px;
        cursor: pointer;
        font-family: monospace;
        font-size: 10px;
      `;
      btn.onclick = effect.action;
      buttonGrid.appendChild(btn);
    });
    
    section.appendChild(buttonGrid);
    this.uiContainer!.appendChild(section);
  }

  private createSection(title: string): HTMLElement {
    const section = document.createElement("div");
    section.style.cssText = "margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #333;";
    
    const heading = document.createElement("h4");
    heading.textContent = title;
    heading.style.cssText = "margin: 0 0 8px 0; color: #ff0; font-size: 12px;";
    section.appendChild(heading);
    
    return section;
  }

  private transitionToScene(sceneId: string): void {
    const toolCall = {
      id: "manual-scene-" + Date.now(),
      type: "function" as const,
      function: { 
        name: "transition_to", 
        arguments: JSON.stringify({ scene_id: sceneId, duration: 2.0 }) 
      }
    };
    this.deps.toolBridge.execute([toolCall]);
    console.log(`[MANUAL] Transitioned to scene: ${sceneId}`);
  }

  private applyPreset(presetName: string): void {
    const toolCall = {
      id: "manual-preset-" + Date.now(),
      type: "function" as const,
      function: { 
        name: "apply_preset", 
        arguments: JSON.stringify({ preset: presetName, intensity_scale: 1.0 }) 
      }
    };
    this.deps.toolBridge.execute([toolCall]);
    console.log(`[MANUAL] Applied preset: ${presetName}`);
  }

  private applyAudioPreset(presetName: string): void {
    const toolCall = {
      id: "manual-audio-" + Date.now(),
      type: "function" as const,
      function: { 
        name: "apply_audio_preset", 
        arguments: JSON.stringify({ preset: presetName, intensity_scale: 1.0 }) 
      }
    };
    this.deps.toolBridge.execute([toolCall]);
    console.log(`[MANUAL] Applied audio preset: ${presetName}`);
  }

  private triggerFirework(): void {
    const x = Math.random() * 2 - 1; // -1 to 1
    const y = Math.random() * 2 - 1;
    this.deps.gpuParticles.firework(x, y, 1.0);
    console.log(`[MANUAL] Triggered firework at (${x.toFixed(2)}, ${y.toFixed(2)})`);
  }

  private triggerSparkles(): void {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    this.deps.gpuParticles.sparkle(x, y, 20);
    console.log(`[MANUAL] Triggered sparkles at (${x.toFixed(2)}, ${y.toFixed(2)})`);
  }

  private pokeSprings(): void {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    this.deps.gpuSprings.poke(x, y, 0.3, 0.5);
    console.log(`[MANUAL] Poked springs at (${x.toFixed(2)}, ${y.toFixed(2)})`);
  }

  private triggerEnhancedFirework(): void {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const types = ["chrysanthemum", "willow", "palm", "crossette", "salute"];
    const colors = ["red", "blue", "green", "gold", "purple", "white", "rainbow"];
    const type = types[Math.floor(Math.random() * types.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const toolCall = {
      id: "manual-enhanced-firework-" + Date.now(),
      type: "function" as const,
      function: { 
        name: "enhanced_firework", 
        arguments: JSON.stringify({ x, y, type, color, intensity: 1.0 }) 
      }
    };
    this.deps.toolBridge.execute([toolCall]);
    console.log(`[MANUAL] Enhanced firework: ${type} ${color} at (${x.toFixed(2)}, ${y.toFixed(2)})`);
  }

  private removeUI(): void {
    if (this.uiContainer && this.uiContainer.parentNode) {
      this.uiContainer.parentNode.removeChild(this.uiContainer);
      this.uiContainer = null;
      this.paramSliders.clear();
    }
  }

  /** Update manual mode - call this each frame when enabled */
  updateSliders(): void {
    // Update parameter sliders
    if (!this.uiContainer) return;
    
    const params = this.deps.params.snapshot();
    const sliders = this.uiContainer.querySelectorAll('.param-slider');
    
    sliders.forEach(slider => {
      const paramName = slider.getAttribute('data-param');
      if (paramName && params[paramName] !== undefined) {
        (slider.querySelector('input') as HTMLInputElement).value = params[paramName].toString();
      }
    });
    
    // Refresh scene duration to prevent it from ever ending in manual mode
    this.refreshSceneDuration();
  }
  
  /** Refresh the current scene duration to extend it further */
  private refreshSceneDuration(): void {
    const currentTime = (window as any).__OAV__?.elapsed || 0;
    const transition = this.deps.timeline.getTransitionState(currentTime);
    
    if (transition && transition.current) {
      // Check if scene is ending soon (within 5 minutes)
      const entries = this.deps.timeline.entries;
      const currentEntry = entries.find(e => 
        e.sceneId === transition.current.sceneId && 
        currentTime >= e.startTime && 
        currentTime < e.endTime
      );
      
      if (currentEntry && (currentEntry.endTime - currentTime) < 300) { // 5 minutes
        // Extend the scene by another hour
        const newEndTime = currentEntry.endTime + 3600.0;
        this.deps.timeline.add({
          startTime: currentEntry.startTime,
          endTime: newEndTime,
          sceneId: currentEntry.sceneId,
          transitionDuration: currentEntry.transitionDuration
        });
        console.log(`[MANUAL] Extended scene ${currentEntry.sceneId} to ${newEndTime}s`);
      }
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }
}
