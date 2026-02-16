/**
 * Audio engine — WebAudio playback with amplitude and beat extraction.
 * Exposes metrics each frame via pull model (no events).
 */

export class Audio {
  private _ctx: AudioContext | null = null;
  private _analyser: AnalyserNode | null = null;
  private _source: AudioBufferSourceNode | null = null;
  private _gainNode: GainNode | null = null;
  private _freqData: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private _timeData: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private _started = false;

  /** RMS amplitude [0, 1] — updated each frame via update(). */
  amplitude = 0;

  /** Spectral centroid (rough brightness) [0, 1]. */
  brightness = 0;

  /** Low-frequency energy [0, 1] — useful for kick/bass detection. */
  bass = 0;

  /** Simple beat detection flag — true on frames with a bass transient. */
  beatHit = false;

  private _prevBass = 0;
  private _beatThreshold = 0.3;

  /** Initialize the AudioContext (must be called from a user gesture). */
  init(): void {
    if (this._ctx) return;
    this._ctx = new AudioContext();
    this._analyser = this._ctx.createAnalyser();
    this._analyser.fftSize = 1024;
    this._analyser.smoothingTimeConstant = 0.8;
    this._gainNode = this._ctx.createGain();
    this._gainNode.connect(this._analyser);
    this._analyser.connect(this._ctx.destination);

    const bufferLength = this._analyser.frequencyBinCount;
    this._freqData = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;
    this._timeData = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;
  }

  /** Load and play an audio buffer from a URL. Loops by default. */
  async loadAndPlay(url: string, loop = true): Promise<void> {
    if (!this._ctx) this.init();
    const ctx = this._ctx!;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    // Stop previous source if any
    if (this._source) {
      try { this._source.stop(); } catch { /* already stopped */ }
    }

    this._source = ctx.createBufferSource();
    this._source.buffer = audioBuffer;
    this._source.loop = loop;
    this._source.connect(this._gainNode!);
    this._source.start(0);
    this._started = true;
  }

  // --- Scene-reactive layer gains (set externally each frame) ---
  private _noiseFilter: BiquadFilterNode | null = null;
  private _noiseLfo: OscillatorNode | null = null;
  private _noiseLfoGain: GainNode | null = null;
  private _subGain: GainNode | null = null;
  private _harmonicGain: GainNode | null = null;
  private _noiseGain: GainNode | null = null;
  private _padGain: GainNode | null = null;
  private _reverbSend: GainNode | null = null;

  /** Play a rich, evolving procedural soundscape. */
  playDrone(): void {
    if (!this._ctx) this.init();
    const ctx = this._ctx!;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const master = this._gainNode!;

    // ---- Layer 1: Sub bass (sine, 40-55 Hz) ----
    this._subGain = ctx.createGain();
    this._subGain.gain.value = 0.18;

    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 45;

    // Slow pitch drift on sub
    const subLfo = ctx.createOscillator();
    subLfo.type = "sine";
    subLfo.frequency.value = 0.07;
    const subLfoGain = ctx.createGain();
    subLfoGain.gain.value = 3;
    subLfo.connect(subLfoGain);
    subLfoGain.connect(sub.frequency);

    sub.connect(this._subGain);
    this._subGain.connect(master);
    sub.start(now);
    subLfo.start(now);

    // ---- Layer 2: Harmonic layer (detuned triangle pair) ----
    this._harmonicGain = ctx.createGain();
    this._harmonicGain.gain.value = 0.08;

    const harm1 = ctx.createOscillator();
    harm1.type = "triangle";
    harm1.frequency.value = 82.41; // E2
    const harm2 = ctx.createOscillator();
    harm2.type = "triangle";
    harm2.frequency.value = 82.41 * 1.002; // Slight detune — chorus
    const harm3 = ctx.createOscillator();
    harm3.type = "sawtooth";
    harm3.frequency.value = 110; // A2
    const harmFilter = ctx.createBiquadFilter();
    harmFilter.type = "lowpass";
    harmFilter.frequency.value = 400;
    harmFilter.Q.value = 1.5;

    // LFO on harmonic filter cutoff
    const harmLfo = ctx.createOscillator();
    harmLfo.type = "sine";
    harmLfo.frequency.value = 0.15;
    const harmLfoGain = ctx.createGain();
    harmLfoGain.gain.value = 200;
    harmLfo.connect(harmLfoGain);
    harmLfoGain.connect(harmFilter.frequency);

    harm1.connect(harmFilter);
    harm2.connect(harmFilter);
    harm3.connect(harmFilter);
    harmFilter.connect(this._harmonicGain);
    this._harmonicGain.connect(master);
    harm1.start(now);
    harm2.start(now);
    harm3.start(now);
    harmLfo.start(now);

    // ---- Layer 3: Filtered noise (breathing texture) ----
    this._noiseGain = ctx.createGain();
    this._noiseGain.gain.value = 0.04;

    // Create noise buffer
    const noiseLength = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    this._noiseFilter = ctx.createBiquadFilter();
    this._noiseFilter.type = "bandpass";
    this._noiseFilter.frequency.value = 300;
    this._noiseFilter.Q.value = 4;

    // Slow sweep on noise filter — the "breathing"
    this._noiseLfo = ctx.createOscillator();
    this._noiseLfo.type = "sine";
    this._noiseLfo.frequency.value = 0.08;
    this._noiseLfoGain = ctx.createGain();
    this._noiseLfoGain.gain.value = 250;
    this._noiseLfo.connect(this._noiseLfoGain);
    this._noiseLfoGain.connect(this._noiseFilter.frequency);

    noise.connect(this._noiseFilter);
    this._noiseFilter.connect(this._noiseGain);
    this._noiseGain.connect(master);
    noise.start(now);
    this._noiseLfo.start(now);

    // ---- Layer 4: Ethereal pad (detuned sine cluster) ----
    this._padGain = ctx.createGain();
    this._padGain.gain.value = 0.05;

    const padFreqs = [164.81, 196.00, 246.94, 329.63]; // E3, G3, B3, E4
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 600;
    padFilter.Q.value = 0.7;

    for (const freq of padFreqs) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.006); // Slight random detune
      osc.connect(padFilter);
      osc.start(now);

      // Individual slow vibrato
      const vib = ctx.createOscillator();
      vib.type = "sine";
      vib.frequency.value = 0.1 + Math.random() * 0.15;
      const vibGain = ctx.createGain();
      vibGain.gain.value = freq * 0.003;
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);
      vib.start(now);
    }

    padFilter.connect(this._padGain);
    this._padGain.connect(master);

    // ---- Simple convolver reverb (impulse from noise) ----
    this._reverbSend = ctx.createGain();
    this._reverbSend.gain.value = 0.3;

    const reverbLength = ctx.sampleRate * 3;
    const reverbBuffer = ctx.createBuffer(2, reverbLength, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = reverbBuffer.getChannelData(ch);
      for (let i = 0; i < reverbLength; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 1.2));
      }
    }
    const reverb = ctx.createConvolver();
    reverb.buffer = reverbBuffer;

    this._reverbSend.connect(reverb);
    reverb.connect(master);

    // Send harmonic + pad layers to reverb
    this._harmonicGain.connect(this._reverbSend);
    this._padGain.connect(this._reverbSend);

    // Fade in over 3 seconds
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.15, now + 3);

    this._started = true;
  }

  /** Adjust layer mix based on scene. Call each frame or on scene change. */
  setSceneMix(sceneId: string, progress: number): void {
    if (!this._subGain) return;
    const now = this._ctx!.currentTime;
    const t = now + 0.05; // smoothing time

    // Cancel any previously scheduled ramps to prevent event accumulation
    this._subGain.gain.cancelScheduledValues(now);
    this._harmonicGain!.gain.cancelScheduledValues(now);
    this._noiseGain!.gain.cancelScheduledValues(now);
    this._padGain!.gain.cancelScheduledValues(now);

    // Set current value as starting point for the ramp
    this._subGain.gain.setValueAtTime(this._subGain.gain.value, now);
    this._harmonicGain!.gain.setValueAtTime(this._harmonicGain!.gain.value, now);
    this._noiseGain!.gain.setValueAtTime(this._noiseGain!.gain.value, now);
    this._padGain!.gain.setValueAtTime(this._padGain!.gain.value, now);

    switch (sceneId) {
      case "intro":
        // Sub-dominant, quiet, intimate
        this._subGain.gain.linearRampToValueAtTime(0.18, t);
        this._harmonicGain!.gain.linearRampToValueAtTime(0.04 + progress * 0.06, t);
        this._noiseGain!.gain.linearRampToValueAtTime(0.02, t);
        this._padGain!.gain.linearRampToValueAtTime(0.02 + progress * 0.04, t);
        break;
      case "build":
        // Harmonics and noise rise, energy builds
        this._subGain.gain.linearRampToValueAtTime(0.15, t);
        this._harmonicGain!.gain.linearRampToValueAtTime(0.08 + progress * 0.08, t);
        this._noiseGain!.gain.linearRampToValueAtTime(0.04 + progress * 0.06, t);
        this._padGain!.gain.linearRampToValueAtTime(0.06 + progress * 0.04, t);
        // Open up noise filter as scene progresses
        if (this._noiseFilter) {
          this._noiseFilter.frequency.cancelScheduledValues(now);
          this._noiseFilter.frequency.setValueAtTime(this._noiseFilter.frequency.value, now);
          this._noiseFilter.frequency.linearRampToValueAtTime(300 + progress * 800, t);
        }
        break;
      case "climax":
        // Everything loud, noise wide open, intense
        this._subGain.gain.linearRampToValueAtTime(0.20, t);
        this._harmonicGain!.gain.linearRampToValueAtTime(0.14, t);
        this._noiseGain!.gain.linearRampToValueAtTime(0.10, t);
        this._padGain!.gain.linearRampToValueAtTime(0.10, t);
        if (this._noiseFilter) {
          this._noiseFilter.frequency.cancelScheduledValues(now);
          this._noiseFilter.frequency.setValueAtTime(this._noiseFilter.frequency.value, now);
          this._noiseFilter.frequency.linearRampToValueAtTime(1200, t);
          this._noiseFilter.Q.cancelScheduledValues(now);
          this._noiseFilter.Q.setValueAtTime(this._noiseFilter.Q.value, now);
          this._noiseFilter.Q.linearRampToValueAtTime(2, t);
        }
        break;
      case "outro": {
        // Everything fades, pad lingers, noise becomes breath
        const fade = 1 - progress;
        this._subGain.gain.linearRampToValueAtTime(0.12 * fade, t);
        this._harmonicGain!.gain.linearRampToValueAtTime(0.06 * fade, t);
        this._noiseGain!.gain.linearRampToValueAtTime(0.03 * fade, t);
        this._padGain!.gain.linearRampToValueAtTime(0.08 * fade, t);
        if (this._noiseFilter) {
          this._noiseFilter.frequency.cancelScheduledValues(now);
          this._noiseFilter.frequency.setValueAtTime(this._noiseFilter.frequency.value, now);
          this._noiseFilter.frequency.linearRampToValueAtTime(200, t);
        }
        break;
      }
    }
  }

  /** Call once per frame to update amplitude, bass, brightness, beatHit. */
  update(): void {
    if (!this._analyser || !this._started) return;

    this._analyser.getByteFrequencyData(this._freqData);
    this._analyser.getByteTimeDomainData(this._timeData);

    // RMS amplitude from time-domain data
    let sum = 0;
    for (let i = 0; i < this._timeData.length; i++) {
      const v = (this._timeData[i] - 128) / 128;
      sum += v * v;
    }
    this.amplitude = Math.sqrt(sum / this._timeData.length);

    // Bass energy (first ~10% of frequency bins)
    const bassEnd = Math.floor(this._freqData.length * 0.1);
    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassSum += this._freqData[i];
    }
    this.bass = bassSum / (bassEnd * 255);

    // Spectral centroid (brightness)
    let weightedSum = 0;
    let totalEnergy = 0;
    for (let i = 0; i < this._freqData.length; i++) {
      weightedSum += i * this._freqData[i];
      totalEnergy += this._freqData[i];
    }
    this.brightness = totalEnergy > 0
      ? (weightedSum / totalEnergy) / this._freqData.length
      : 0;

    // Simple beat detection: bass transient
    const bassDelta = this.bass - this._prevBass;
    this.beatHit = bassDelta > this._beatThreshold;
    this._prevBass = this.bass;
  }

  /**
   * Play a short synth pop/burst sound. Intensity 0-1 controls volume and pitch.
   * Used for themed interactions (fireworks explosions, etc).
   */
  playPop(intensity = 0.5): void {
    if (!this._ctx || !this._gainNode) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // Short sine burst — pitched by intensity
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 300 + intensity * 600; // 300-900 Hz

    // Noise burst via high-frequency oscillator pair
    const osc2 = ctx.createOscillator();
    osc2.type = "square";
    osc2.frequency.value = 1200 + Math.random() * 800;

    // Envelope — fast attack, quick decay
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.15 * intensity, now + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + intensity * 0.12);

    const env2 = ctx.createGain();
    env2.gain.setValueAtTime(0, now);
    env2.gain.linearRampToValueAtTime(0.06 * intensity, now + 0.003);
    env2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(env);
    osc2.connect(env2);
    env.connect(this._gainNode);
    env2.connect(this._gainNode);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.3);
    osc2.stop(now + 0.1);
  }

  get volume(): number {
    return this._gainNode?.gain.value ?? 0;
  }

  set volume(v: number) {
    if (this._gainNode) {
      this._gainNode.gain.value = Math.max(0, Math.min(1, v));
    }
  }

  get started(): boolean {
    return this._started;
  }

  dispose(): void {
    if (this._source) {
      try { this._source.stop(); } catch { /* ok */ }
    }
    if (this._ctx) {
      this._ctx.close();
    }
  }
}
