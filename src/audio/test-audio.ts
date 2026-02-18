/**
 * Minimal test audio system to verify Web Audio is working
 */

export class TestAudio {
  private _ctx: AudioContext | null = null;
  private _oscillator: OscillatorNode | null = null;
  private _gain: GainNode | null = null;
  private _started = false;

  // Analysis outputs (for compatibility)
  amplitude = 0.5;
  brightness = 0.5;
  bass = 0.3;
  mid = 0.4;
  high = 0.3;
  beatHit = false;
  rhythmicIntensity = 0.5;
  spectralCentroid = 0.5;

  init(): void {
    if (this._ctx) return;
    
    this._ctx = new AudioContext();
    console.log('[TestAudio] AudioContext created, state:', this._ctx.state);
    
    // Create a simple sine wave oscillator
    this._oscillator = this._ctx.createOscillator();
    this._gain = this._ctx.createGain();
    
    this._oscillator.type = 'sine';
    this._oscillator.frequency.value = 440; // A4 note
    this._gain.gain.value = 0.1; // Low volume
    
    this._oscillator.connect(this._gain);
    this._gain.connect(this._ctx.destination);
    
    console.log('[TestAudio] Test audio system initialized');
  }

  start(): void {
    if (!this._ctx) this.init();
    if (this._started || !this._oscillator) return;
    
    this._oscillator.start();
    this._started = true;
    
    console.log('[TestAudio] Started test tone (440 Hz sine wave)');
    console.log('[TestAudio] You should hear a continuous tone');
  }

  stop(): void {
    if (!this._started || !this._oscillator) return;
    
    this._oscillator.stop();
    this._started = false;
    
    console.log('[TestAudio] Stopped test tone');
  }

  get isStarted(): boolean {
    return this._started;
  }

  // Compatibility methods (no-op for test)
  update(): void {
    // Simple simulation for testing
    this.amplitude = this._started ? 0.5 : 0;
    this.bass = this._started ? 0.3 : 0;
    this.brightness = this._started ? 0.5 : 0;
  }

  setTheme(theme: string): void {
    console.log(`[TestAudio] Set theme (no-op): ${theme}`);
  }

  triggerKick(volume: number = 0.5): void {
    console.log(`[TestAudio] Trigger kick (no-op): ${volume}`);
  }

  triggerSnare(volume: number = 0.5): void {
    console.log(`[TestAudio] Trigger snare (no-op): ${volume}`);
  }

  triggerHihat(volume: number = 0.5): void {
    console.log(`[TestAudio] Trigger hi-hat (no-op): ${volume}`);
  }

  triggerBass(volume: number = 0.5): void {
    console.log(`[TestAudio] Trigger bass (no-op): ${volume}`);
  }

  triggerDrumPattern(pattern: string, volume: number = 0.5): void {
    console.log(`[TestAudio] Trigger drum pattern (no-op): ${pattern}, ${volume}`);
  }

  triggerSFX(sfx: any): void {
    console.log(`[TestAudio] Trigger SFX (no-op): ${sfx.type}`);
  }

  setParams(params: any): void {
    console.log(`[TestAudio] Set params (no-op):`, params);
  }

  getParams() {
    return {
      masterLevel: 0.7,
      tempo: 120,
      bass: this.bass,
      amplitude: this.amplitude,
    };
  }
}
