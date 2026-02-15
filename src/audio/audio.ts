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

  /** Play a procedural drone (for dev/testing when no audio file is available). */
  playDrone(): void {
    if (!this._ctx) this.init();
    const ctx = this._ctx!;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 55; // Low A

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 82.5; // E above

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.2; // Slow modulation

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.15;

    osc1.connect(droneGain);
    osc2.connect(droneGain);
    droneGain.connect(this._gainNode!);

    osc1.start();
    osc2.start();
    lfo.start();
    this._started = true;
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
