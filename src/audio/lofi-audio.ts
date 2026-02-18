/**
 * Lo-Fi Audio System - Simple wrapper for the lo-fi music system
 * This replaces the complex enhanced-audio.ts with a focused lo-fi experience
 */

import { LoFiMusicSystem } from './lofi-music';

export class LoFiAudio {
  private _musicSystem: LoFiMusicSystem;
  private _ctx: AudioContext | null = null;
  private _analyser: AnalyserNode | null = null;
  private _started = false;
  
  // Analysis outputs (updated each frame)
  amplitude = 0;
  brightness = 0;
  bass = 0;
  mid = 0;
  high = 0;
  beatHit = false;
  rhythmicIntensity = 0;
  spectralCentroid = 0;
  
  // Analysis data
  private _freqData: Uint8Array;
  private _timeData: Uint8Array;
  
  constructor() {
    this._musicSystem = new LoFiMusicSystem();
    this._freqData = new Uint8Array(2048);
    this._timeData = new Uint8Array(2048);
  }
  
  /** Initialize audio context (must be called from user gesture). */
  init(): void {
    if (this._ctx) return;
    
    this._ctx = new AudioContext();
    const ctx = this._ctx!;
    
    // Create analyser for visual reactivity
    this._analyser = ctx.createAnalyser();
    this._analyser.fftSize = 2048;
    this._analyser.smoothingTimeConstant = 0.8;
    
    // Initialize music system
    this._musicSystem.init(ctx);
    
    // Connect music system to analyser for visual analysis
    // The music system already connects to ctx.destination, so we need to
    // insert the analyser in the signal chain
    this._connectMusicSystemToAnalyser();
    
    console.log('[LoFiAudio] Initialized lo-fi audio system');
  }
  
  private _connectMusicSystemToAnalyser(): void {
    if (!this._ctx || !this._analyser) return;
    
    // Access the private master gain through the music system
    const musicSystem = this._musicSystem as any;
    if (musicSystem._masterGain) {
      // Disconnect from destination and reconnect through analyser
      musicSystem._masterGain.disconnect();
      musicSystem._masterGain.connect(this._analyser);
      this._analyser.connect(this._ctx.destination);
      console.log('[LoFiAudio] Connected music system through analyser');
    } else {
      console.warn('[LoFiAudio] Could not find music system master gain');
    }
  }
  
  /** Start the lo-fi music. */
  start(): void {
    if (!this._ctx) this.init();
    if (this._started) return;
    
    // Start the music system
    this._musicSystem.start();
    this._started = true;
    
    console.log('[LoFiAudio] Started lo-fi music');
  }
  
  /** Stop the music. */
  stop(): void {
    if (!this._started) return;
    
    this._musicSystem.stop();
    this._started = false;
    
    console.log('[LoFiAudio] Stopped lo-fi music');
  }
  
  /** Update analysis for visual reactivity. */
  update(): void {
    if (!this._analyser || !this._started) return;
    
    // Get frequency and time data
    this._analyser.getByteFrequencyData(this._freqData as any);
    this._analyser.getByteTimeDomainData(this._timeData as any);
    
    // Calculate analysis values
    this._analyzeSpectrum();
    this._detectBeat();
  }
  
  /** Set music theme. */
  setTheme(themeName: string): void {
    this._musicSystem.setTheme(themeName);
  }
  
  /** Get current theme. */
  get currentTheme(): string {
    return this._musicSystem.currentTheme;
  }
  
  /** Check if audio is started. */
  get isStarted(): boolean {
    return this._started;
  }
  
  /** Simple parameter interface for compatibility. */
  getParams() {
    return {
      masterLevel: 0.7,
      tempo: this._musicSystem.currentTheme === 'energetic' ? 120 : 
             this._musicSystem.currentTheme === 'dark' ? 95 :
             this._musicSystem.currentTheme === 'dreamy' ? 75 :
             this._musicSystem.currentTheme === 'nostalgic' ? 80 : 85,
      bass: 0.6,
      amplitude: this.amplitude,
      brightness: this.brightness,
    };
  }
  
  /** Trigger simple drum sounds (for compatibility). */
  triggerKick(volume: number = 0.5): void {
    // Music system handles drums automatically
    console.log('[LoFiAudio] Kick trigger (handled by music system)');
  }
  
  triggerSnare(volume: number = 0.5): void {
    // Music system handles drums automatically  
    console.log('[LoFiAudio] Snare trigger (handled by music system)');
  }
  
  triggerHihat(volume: number = 0.5): void {
    // Music system handles drums automatically
    console.log('[LoFiAudio] Hi-hat trigger (handled by music system)');
  }
  
  triggerBass(volume: number = 0.5): void {
    // Music system handles bass automatically
    console.log('[LoFiAudio] Bass trigger (handled by music system)');
  }
  
  /** Trigger drum pattern (for compatibility). */
  triggerDrumPattern(pattern: string, volume: number = 0.5): void {
    // Music system handles patterns automatically based on theme
    console.log(`[LoFiAudio] Drum pattern trigger: ${pattern} (handled by music system)`);
  }
  
  /** Trigger SFX (for compatibility). */
  triggerSFX(sfx: any): void {
    // Lo-fi system focuses on music, not SFX
    console.log(`[LoFiAudio] SFX trigger: ${sfx.type} (lo-fi focuses on music)`);
  }
  
  /** Set parameters (for compatibility). */
  setParams(params: any): void {
    // Lo-fi system uses themes instead of individual parameters
    if (params.tempo) {
      // Tempo is handled by theme selection
      console.log(`[LoFiAudio] Tempo set to ${params.tempo} (handled by theme)`);
    }
  }
  
  private _analyzeSpectrum(): void {
    if (!this._freqData.length) return;
    
    // Calculate frequency bands
    const bassEnd = Math.floor(this._freqData.length * 0.1);
    const midEnd = Math.floor(this._freqData.length * 0.5);
    
    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;
    
    // Bass frequencies (0-10%)
    for (let i = 0; i < bassEnd; i++) {
      bassSum += this._freqData[i];
    }
    
    // Mid frequencies (10-50%)
    for (let i = bassEnd; i < midEnd; i++) {
      midSum += this._freqData[i];
    }
    
    // High frequencies (50-100%)
    for (let i = midEnd; i < this._freqData.length; i++) {
      highSum += this._freqData[i];
    }
    
    // Normalize to 0-1 range
    this.bass = (bassSum / bassEnd) / 255;
    this.mid = (midSum / (midEnd - bassEnd)) / 255;
    this.high = (highSum / (this._freqData.length - midEnd)) / 255;
    
    // Overall amplitude
    this.amplitude = (this.bass + this.mid + this.high) / 3;
    
    // Brightness (weighted towards high frequencies)
    this.brightness = (this.bass * 0.2 + this.mid * 0.3 + this.high * 0.5);
    
    // Spectral centroid (brightness measure)
    let weightedSum = 0;
    let totalMagnitude = 0;
    for (let i = 0; i < this._freqData.length; i++) {
      const magnitude = this._freqData[i] / 255;
      weightedSum += i * magnitude;
      totalMagnitude += magnitude;
    }
    this.spectralCentroid = totalMagnitude > 0 ? weightedSum / totalMagnitude / this._freqData.length : 0;
  }
  
  private _detectBeat(): void {
    if (!this._timeData.length) return;
    
    // Simple beat detection based on amplitude spikes
    let sum = 0;
    for (let i = 0; i < this._timeData.length; i++) {
      sum += Math.abs(this._timeData[i] - 128); // Center around 0
    }
    
    const currentAmplitude = sum / this._timeData.length / 128;
    
    // Detect beat when amplitude crosses threshold
    const threshold = 0.3;
    this.beatHit = currentAmplitude > threshold && this.amplitude > threshold;
    
    // Rhythmic intensity based on amplitude variation
    this.rhythmicIntensity = Math.min(1, currentAmplitude * 2);
  }
}
