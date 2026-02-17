/**
 * Enhanced Audio Engine — Dynamic, vibey soundscape with SFX and real-time control.
 * 
 * Features:
 * - 4-layer procedural drone with dynamic modulation
 * - SFX system with triggerable one-shot sounds
 * - Real-time parameter control (filter sweeps, LFOs, envelopes)
 * - Beat detection with rhythmic analysis
 * - Audio-reactive visual feedback
 * - Preset-based audio states that sync with visual presets
 */

export interface AudioParams {
  // Drone layer controls
  subLevel: number;        // Sub bass level [0, 1]
  harmonicLevel: number;  // Harmonics level [0, 1] 
  noiseLevel: number;     // Noise texture level [0, 1]
  padLevel: number;       // Ethereal pad level [0, 1]
  
  // Modulation
  filterFreq: number;     // Master filter frequency [20, 20000] Hz
  filterRes: number;      // Filter resonance [0.1, 30]
  lfoRate: number;        // LFO speed [0.1, 20] Hz
  lfoDepth: number;       // LFO modulation depth [0, 1]
  
  // Effects
  reverbWet: number;      // Reverb amount [0, 1]
  delayTime: number;      // Delay time [0.1, 2.0] s
  delayFeedback: number;  // Delay feedback [0, 0.95]
  distortion: number;    // Distortion amount [0, 1]
  
  // Dynamics
  masterLevel: number;    // Master volume [0, 1]
  compression: number;    // Compression ratio [1, 20]
  
  // Rhythmic
  tempo: number;          // BPM for rhythmic elements [60, 180]
  swing: number;          // Swing amount [0, 1]
  glitchProb: number;     // Glitch/stutter probability [0, 1]
}

export interface SFXParams {
  type: 'impact' | 'sweep' | 'glitch' | 'riser' | 'explosion' | 'whoosh';
  pitch: number;          // Pitch multiplier [0.1, 4]
  duration: number;       // Duration [0.1, 5] s
  volume: number;         // Volume [0, 1]
  filter: number;         // Filter cutoff [0, 1]
  spatial: number;        // Stereo spread [0, 1]
}

export class EnhancedAudio {
  private _ctx: AudioContext | null = null;
  private _analyser: AnalyserNode | null = null;
  private _masterGain: GainNode | null = null;
  private _compressor: DynamicsCompressorNode | null = null;
  
  // Drone layers
  private _subOsc: OscillatorNode | null = null;
  private _subGain: GainNode | null = null;
  private _harmonicOsc: OscillatorNode | null = null;
  private _harmonicGain: GainNode | null = null;
  private _noiseSource: AudioBufferSourceNode | null = null;
  private _noiseGain: GainNode | null = null;
  private _padOsc: OscillatorNode | null = null;
  private _padGain: GainNode | null = null;
  
  // Modulation
  private _lfo: OscillatorNode | null = null;
  private _lfoGain: GainNode | null = null;
  private _filter: BiquadFilterNode | null = null;
  
  // Effects
  private _reverb: ConvolverNode | null = null;
  private _reverbGain: GainNode | null = null;
  private _delay: DelayNode | null = null;
  private _delayGain: GainNode | null = null;
  private _distortion: WaveShaperNode | null = null;
  
  // Analysis
  private _freqData: Uint8Array;
  private _timeData: Uint8Array;
  
  // State
  private _started = false;
  private _params: AudioParams;
  private _sfxQueue: SFXParams[] = [];
  
  // Analysis outputs (updated each frame)
  amplitude = 0;
  brightness = 0;
  bass = 0;
  mid = 0;
  high = 0;
  beatHit = false;
  rhythmicIntensity = 0;
  spectralCentroid = 0;
  
  // Beat detection
  private _beatHistory: number[] = [];
  private _lastBeatTime = 0;
  private _beatThreshold = 0.3;
  
  constructor() {
    // Initialize analysis arrays
    this._freqData = new Uint8Array(2048);
    this._timeData = new Uint8Array(2048);
    
    // Default parameters
    this._params = {
      subLevel: 0.3,
      harmonicLevel: 0.2,
      noiseLevel: 0.1,
      padLevel: 0.15,
      filterFreq: 800,
      filterRes: 1.5,
      lfoRate: 0.5,
      lfoDepth: 0.3,
      reverbWet: 0.3,
      delayTime: 0.3,
      delayFeedback: 0.4,
      distortion: 0.1,
      masterLevel: 0.7,
      compression: 4,
      tempo: 120,
      swing: 0.1,
      glitchProb: 0.05
    };
  }
  
  /** Initialize audio context (must be called from user gesture). */
  init(): void {
    if (this._ctx) return;
    
    this._ctx = new AudioContext();
    const ctx = this._ctx!;
    
    // Master chain
    this._masterGain = ctx.createGain();
    this._compressor = ctx.createDynamicsCompressor();
    this._analyser = ctx.createAnalyser();
    this._analyser.fftSize = 2048;
    this._analyser.smoothingTimeConstant = 0.8;
    
    // Resize arrays if needed
    const bufferLength = this._analyser.frequencyBinCount;
    if (this._freqData.length !== bufferLength) {
      this._freqData = new Uint8Array(bufferLength);
      this._timeData = new Uint8Array(bufferLength);
    }
    
    // Connect master chain
    this._masterGain.connect(this._compressor);
    this._compressor.connect(this._analyser);
    this._analyser.connect(ctx.destination);
    
    // Create effects
    this._createEffects(ctx);
    this._createDroneLayers(ctx);
    this._createModulation(ctx);
    
    this._started = true;
  }
  
  /** Start the procedural drone. */
  start(): void {
    if (!this._ctx) this.init();
    if (this._started) return;
    
    const ctx = this._ctx!;
    const now = ctx.currentTime;
    
    // Start drone layers
    this._subOsc?.start(now);
    this._harmonicOsc?.start(now);
    this._padOsc?.start(now);
    this._lfo?.start(now);
    
    // Start noise source
    if (this._noiseSource) {
      this._noiseSource.start(now);
    }
    
    this._started = true;
  }
  
  /** Update audio parameters in real-time. */
  setParams(params: Partial<AudioParams>): void {
    Object.assign(this._params, params);
    this._applyParams();
  }
  
  /** Get current audio parameters. */
  getParams(): AudioParams {
    return { ...this._params };
  }
  
  /** Trigger a sound effect. */
  triggerSFX(sfx: Partial<SFXParams>): void {
    const fullSFX: SFXParams = {
      type: 'impact',
      pitch: 1,
      duration: 0.5,
      volume: 0.7,
      filter: 0.5,
      spatial: 0.5,
      ...sfx
    };
    
    this._sfxQueue.push(fullSFX);
    this._processSFXQueue();
  }
  
  /** Update analysis data (call each frame). */
  update(): void {
    if (!this._analyser) return;
    
    // Use any to bypass type checking for WebAudio API
    (this._analyser as any).getByteFrequencyData(this._freqData);
    (this._analyser as any).getByteTimeDomainData(this._timeData);
    
    this._analyzeSpectrum();
    this._detectBeat();
    this._processSFXQueue();
  }
  
  // --- Private methods ---
  
  private _createEffects(ctx: AudioContext): void {
    // Filter
    this._filter = ctx.createBiquadFilter();
    this._filter.type = 'lowpass';
    this._filter.frequency.value = this._params.filterFreq;
    this._filter.Q.value = this._params.filterRes;
    
    // Reverb (using impulse response simulation)
    this._reverb = ctx.createConvolver();
    this._reverbGain = ctx.createGain();
    this._reverbGain.gain.value = this._params.reverbWet;
    
    // Delay
    this._delay = ctx.createDelay(2.0);
    this._delay.delayTime.value = this._params.delayTime;
    this._delayGain = ctx.createGain();
    this._delayGain.gain.value = 0.3;
    
    // Distortion
    this._distortion = ctx.createWaveShaper();
    this._makeDistortionCurve(this._params.distortion);
    
    // Create simple reverb impulse response
    this._createReverbImpulse(ctx);
  }
  
  private _createDroneLayers(ctx: AudioContext): void {
    // Layer 1: Sub bass
    this._subOsc = ctx.createOscillator();
    this._subOsc.type = 'sine';
    this._subOsc.frequency.value = 55; // A1
    this._subGain = ctx.createGain();
    this._subGain.gain.value = this._params.subLevel;
    
    // Layer 2: Harmonics
    this._harmonicOsc = ctx.createOscillator();
    this._harmonicOsc.type = 'sawtooth';
    this._harmonicOsc.frequency.value = 110; // A2
    this._harmonicGain = ctx.createGain();
    this._harmonicGain.gain.value = this._params.harmonicLevel;
    
    // Layer 3: Noise texture
    const noiseBuffer = this._createNoiseBuffer(ctx, 2.0);
    this._noiseSource = ctx.createBufferSource();
    this._noiseSource.buffer = noiseBuffer;
    this._noiseSource.loop = true;
    this._noiseGain = ctx.createGain();
    this._noiseGain.gain.value = this._params.noiseLevel;
    
    // Layer 4: Ethereal pad
    this._padOsc = ctx.createOscillator();
    this._padOsc.type = 'triangle';
    this._padOsc.frequency.value = 220; // A3
    this._padGain = ctx.createGain();
    this._padGain.gain.value = this._params.padLevel;
    
    // Connect layers (with null checks)
    if (this._filter && this._subGain) this._subGain.connect(this._filter);
    if (this._filter && this._harmonicGain) this._harmonicGain.connect(this._filter);
    if (this._filter && this._noiseGain) this._noiseGain.connect(this._filter);
    if (this._filter && this._padGain) this._padGain.connect(this._filter);
    
    if (this._filter && this._distortion) this._filter.connect(this._distortion);
    if (this._distortion && this._delay) this._distortion.connect(this._delay);
    if (this._distortion && this._reverb) this._distortion.connect(this._reverb);
    
    if (this._delay && this._delayGain) this._delay.connect(this._delayGain);
    if (this._delayGain && this._filter) this._delayGain.connect(this._filter);
    
    if (this._reverb && this._reverbGain) this._reverb.connect(this._reverbGain);
    if (this._reverbGain && this._masterGain) this._reverbGain.connect(this._masterGain);
    
    if (this._filter && this._masterGain) this._filter.connect(this._masterGain);
  }
  
  private _createModulation(ctx: AudioContext): void {
    // LFO for filter modulation
    this._lfo = ctx.createOscillator();
    this._lfo.type = 'sine';
    this._lfo.frequency.value = this._params.lfoRate;
    
    this._lfoGain = ctx.createGain();
    this._lfoGain.gain.value = this._params.lfoDepth * 1000; // Modulation depth
    
    if (this._lfo && this._lfoGain) this._lfo.connect(this._lfoGain);
    if (this._lfoGain && this._filter) this._lfoGain.connect(this._filter.frequency);
  }
  
  private _applyParams(): void {
    if (!this._ctx) return;
    
    const ctx = this._ctx!;
    const now = ctx.currentTime;
    
    // Apply drone levels
    this._subGain?.gain.linearRampToValueAtTime(this._params.subLevel, now + 0.1);
    this._harmonicGain?.gain.linearRampToValueAtTime(this._params.harmonicLevel, now + 0.1);
    this._noiseGain?.gain.linearRampToValueAtTime(this._params.noiseLevel, now + 0.1);
    this._padGain?.gain.linearRampToValueAtTime(this._params.padLevel, now + 0.1);
    
    // Apply modulation
    this._filter?.frequency.linearRampToValueAtTime(this._params.filterFreq, now + 0.1);
    this._filter?.Q.linearRampToValueAtTime(this._params.filterRes, now + 0.1);
    this._lfo?.frequency.linearRampToValueAtTime(this._params.lfoRate, now + 0.1);
    this._lfoGain?.gain.linearRampToValueAtTime(this._params.lfoDepth * 1000, now + 0.1);
    
    // Apply effects
    this._reverbGain?.gain.linearRampToValueAtTime(this._params.reverbWet, now + 0.1);
    this._delay?.delayTime.linearRampToValueAtTime(this._params.delayTime, now + 0.1);
    this._delayGain?.gain.linearRampToValueAtTime(this._params.delayFeedback * 0.3, now + 0.1);
    this._masterGain?.gain.linearRampToValueAtTime(this._params.masterLevel, now + 0.1);
    
    // Update distortion curve
    this._makeDistortionCurve(this._params.distortion);
    
    // Update compressor
    this._compressor?.ratio.setValueAtTime(this._params.compression, now);
  }
  
  private _analyzeSpectrum(): void {
    if (!this._freqData.length || !this._analyser) return;
    
    // Get fresh data
    // Use any to bypass type checking for WebAudio API
    (this._analyser as any).getByteFrequencyData(this._freqData);
    (this._analyser as any).getByteTimeDomainData(this._timeData);
    
    // Calculate frequency bands
    const bassEnd = Math.floor(this._freqData.length * 0.1);
    const midEnd = Math.floor(this._freqData.length * 0.5);
    
    let bassSum = 0, midSum = 0, highSum = 0, totalSum = 0;
    
    for (let i = 0; i < this._freqData.length; i++) {
      const value = this._freqData[i] / 255;
      totalSum += value;
      
      if (i < bassEnd) bassSum += value;
      else if (i < midEnd) midSum += value;
      else highSum += value;
    }
    
    this.bass = bassSum / bassEnd;
    this.mid = midSum / (midEnd - bassEnd);
    this.high = highSum / (this._freqData.length - midEnd);
    this.amplitude = totalSum / this._freqData.length;
    
    // Calculate spectral centroid (brightness)
    let weightedSum = 0;
    for (let i = 0; i < this._freqData.length; i++) {
      weightedSum += (i / this._freqData.length) * (this._freqData[i] / 255);
    }
    this.spectralCentroid = weightedSum / totalSum || 0;
    this.brightness = this.spectralCentroid;
  }
  
  private _detectBeat(): void {
    const now = Date.now();
    
    // Add current bass level to history
    this._beatHistory.push(this.bass);
    if (this._beatHistory.length > 10) {
      this._beatHistory.shift();
    }
    
    // Calculate average and detect peaks
    const avg = this._beatHistory.reduce((a, b) => a + b, 0) / this._beatHistory.length;
    const isPeak = this.bass > avg * 1.5 && this.bass > this._beatThreshold;
    
    // Debounce beats
    if (isPeak && now - this._lastBeatTime > 200) {
      this.beatHit = true;
      this._lastBeatTime = now;
      
      // Trigger rhythmic SFX occasionally
      if (Math.random() < this._params.glitchProb) {
        this.triggerSFX({ type: 'glitch', volume: 0.3, duration: 0.1 });
      }
    } else {
      this.beatHit = false;
    }
    
    // Calculate rhythmic intensity
    this.rhythmicIntensity = this.beatHit ? 1.0 : Math.max(0, this.rhythmicIntensity - 0.05);
  }
  
  private _processSFXQueue(): void {
    if (!this._ctx || this._sfxQueue.length === 0) return;
    
    const ctx = this._ctx!;
    const sfx = this._sfxQueue.shift()!;
    
    this._playOneShotSFX(ctx, sfx);
  }
  
  private _playOneShotSFX(ctx: AudioContext, sfx: SFXParams): void {
    const now = ctx.currentTime;
    
    // Create source based on type
    let source: AudioNode;
    
    switch (sfx.type) {
      case 'impact':
        source = this._createImpact(ctx, sfx);
        break;
      case 'sweep':
        source = this._createSweep(ctx, sfx);
        break;
      case 'glitch':
        source = this._createGlitch(ctx, sfx);
        break;
      case 'riser':
        source = this._createRiser(ctx, sfx);
        break;
      case 'explosion':
        source = this._createExplosion(ctx, sfx);
        break;
      case 'whoosh':
        source = this._createWhoosh(ctx, sfx);
        break;
      default:
        source = this._createImpact(ctx, sfx);
    }
    
    // Apply spatial positioning
    const panner = ctx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * sfx.spatial;
    
    // Connect and play
    source.connect(panner);
    panner.connect(this._masterGain!);
    
    if (source instanceof AudioBufferSourceNode) {
      source.start(now);
      source.stop(now + sfx.duration);
    }
  }
  
  // SFX generators
  private _createImpact(ctx: AudioContext, sfx: SFXParams): AudioBufferSourceNode {
    const duration = sfx.duration;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 10);
      const wave = Math.sin(2 * Math.PI * 200 * sfx.pitch * t);
      data[i] = wave * envelope * sfx.volume;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }
  
  private _createSweep(ctx: AudioContext, sfx: SFXParams): AudioBufferSourceNode {
    const duration = sfx.duration;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = 100 * sfx.pitch + (2000 * sfx.pitch * t / duration);
      const wave = Math.sin(2 * Math.PI * freq * t);
      const envelope = Math.sin(t * Math.PI / duration);
      data[i] = wave * envelope * sfx.volume;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }
  
  private _createGlitch(ctx: AudioContext, sfx: SFXParams): AudioBufferSourceNode {
    const duration = sfx.duration;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() - 0.5) * 2 * sfx.volume * (Math.random() < 0.1 ? 1 : 0.1);
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }
  
  private _createRiser(ctx: AudioContext, sfx: SFXParams): AudioBufferSourceNode {
    const duration = sfx.duration;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = 100 * sfx.pitch + (1000 * sfx.pitch * t / duration);
      const wave = Math.sin(2 * Math.PI * freq * t) + Math.sin(4 * Math.PI * freq * t) * 0.3;
      const envelope = t / duration;
      data[i] = wave * envelope * sfx.volume;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }
  
  private _createExplosion(ctx: AudioContext, sfx: SFXParams): AudioBufferSourceNode {
    const duration = sfx.duration;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 5);
      const noise = (Math.random() - 0.5) * 2;
      const lowFreq = Math.sin(2 * Math.PI * 50 * sfx.pitch * t);
      data[i] = (noise * 0.7 + lowFreq * 0.3) * envelope * sfx.volume;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }
  
  private _createWhoosh(ctx: AudioContext, sfx: SFXParams): AudioBufferSourceNode {
    const duration = sfx.duration;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 2);
      const noise = (Math.random() - 0.5) * 2;
      data[i] = noise * envelope * sfx.volume;
    }
    
    // Apply filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000 * sfx.filter;
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(filter);
    return source;
  }
  
  // Utility methods
  private _createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() - 0.5) * 2;
    }
    
    return buffer;
  }
  
  private _createReverbImpulse(ctx: AudioContext): void {
    const duration = 2.0;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(2, duration * sampleRate, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() - 0.5) * 2 * Math.pow(1 - i / data.length, 2);
      }
    }
    
    this._reverb!.buffer = buffer;
  }
  
  private _makeDistortionCurve(amount: number): void {
    if (!this._distortion) return;
    
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    
    this._distortion.curve = curve;
    this._distortion.oversample = '4x';
  }
}
