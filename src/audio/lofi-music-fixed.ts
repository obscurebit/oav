/**
 * Fixed Lo-Fi Music System
 * Simple, robust implementation that actually produces sound
 */

export interface MusicTheme {
  name: string;
  tempo: number;
  kickPattern: number[];
  snarePattern: number[];
  hihatPattern: number[];
  bassPattern: number[];
  chordNotes: number[]; // MIDI note numbers
  bassNotes: number[]; // MIDI note numbers
}

export class LoFiMusicSystemFixed {
  private _ctx: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private _started = false;
  private _currentBeat = 0;
  private _currentTheme: MusicTheme;
  private _nextBeatTime = 0;

  // Simple instruments
  private _kickOsc: OscillatorNode | null = null;
  private _kickGain: GainNode | null = null;
  private _snareNoise: AudioBufferSourceNode | null = null;
  private _snareGain: GainNode | null = null;
  private _hihatGain: GainNode | null = null;
  private _bassOsc: OscillatorNode | null = null;
  private _bassGain: GainNode | null = null;
  private _chordOsc: OscillatorNode | null = null;
  private _chordGain: GainNode | null = null;
  
  // Lo-fi texture
  private _vinylCrackle: AudioBufferSourceNode | null = null;
  private _vinylGain: GainNode | null = null;
  private _saturation: WaveShaperNode | null = null;

  private _themes: MusicTheme[] = [
    {
      name: 'chill',
      tempo: 85,
      kickPattern: [0, 4, 8, 12],
      snarePattern: [4, 12],
      hihatPattern: [2, 6, 10, 14],
      bassPattern: [0, 8],
      chordNotes: [60, 64, 67], // C major chord
      bassNotes: [48, 52] // C and G bass notes
    },
    {
      name: 'dreamy',
      tempo: 75,
      kickPattern: [0, 6, 12],
      snarePattern: [4, 12],
      hihatPattern: [3, 7, 11, 15],
      bassPattern: [0, 12],
      chordNotes: [61, 65, 68], // Db major chord
      bassNotes: [49, 53] // Db and Ab bass notes
    },
    {
      name: 'dark',
      tempo: 95,
      kickPattern: [0, 2, 4, 6, 8, 10, 12, 14],
      snarePattern: [4, 12],
      hihatPattern: [0, 4, 8, 12],
      bassPattern: [0, 6, 12],
      chordNotes: [60, 63, 67], // C minor chord
      bassNotes: [48, 51] // C and Eb bass notes
    },
    {
      name: 'energetic',
      tempo: 120,
      kickPattern: [0, 1, 4, 5, 8, 9, 12, 13],
      snarePattern: [4, 12],
      hihatPattern: [0, 2, 4, 6, 8, 10, 12, 14],
      bassPattern: [0, 4, 8, 12],
      chordNotes: [64, 68, 71], // E major chord
      bassNotes: [52, 56] // E and B bass notes
    },
    {
      name: 'nostalgic',
      tempo: 80,
      kickPattern: [0, 4, 8, 12],
      snarePattern: [4, 12],
      hihatPattern: [1, 5, 9, 13],
      bassPattern: [0, 8],
      chordNotes: [65, 69, 72], // F major chord
      bassNotes: [53, 57] // F and C bass notes
    },
    // Additional themes for specific presets
    {
      name: 'noir',
      tempo: 90,
      kickPattern: [0, 4, 8, 12],
      snarePattern: [4, 12],
      hihatPattern: [2, 6, 10, 14],
      bassPattern: [0, 6, 12],
      chordNotes: [58, 61, 65], // Bb minor chord
      bassNotes: [46, 49] // Bb and Db bass notes
    },
    {
      name: 'fire',
      tempo: 130,
      kickPattern: [0, 2, 4, 6, 8, 10, 12, 14],
      snarePattern: [4, 12],
      hihatPattern: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      bassPattern: [0, 2, 4, 6, 8, 10, 12, 14],
      chordNotes: [66, 69, 73], // F# major chord
      bassNotes: [54, 58] // F# and C# bass notes
    },
    {
      name: 'ice',
      tempo: 70,
      kickPattern: [0, 8],
      snarePattern: [4, 12],
      hihatPattern: [2, 6, 10, 14],
      bassPattern: [0, 12],
      chordNotes: [59, 62, 66], // B minor chord
      bassNotes: [47, 50] // B and D bass notes
    },
    {
      name: 'psychedelic',
      tempo: 110,
      kickPattern: [0, 3, 6, 9, 12, 15],
      snarePattern: [4, 12],
      hihatPattern: [1, 5, 9, 13],
      bassPattern: [0, 6, 12],
      chordNotes: [62, 66, 69], // D major chord
      bassNotes: [50, 54] // D and F# bass notes
    },
    {
      name: 'cosmic',
      tempo: 65,
      kickPattern: [0, 6, 12],
      snarePattern: [4, 12],
      hihatPattern: [3, 7, 11, 15],
      bassPattern: [0, 12],
      chordNotes: [63, 67, 70], // Eb major chord
      bassNotes: [51, 55] // Eb and G bass notes
    },
    {
      name: 'storm',
      tempo: 100,
      kickPattern: [0, 2, 4, 6, 8, 10, 12, 14],
      snarePattern: [4, 12],
      hihatPattern: [0, 4, 8, 12],
      bassPattern: [0, 4, 8, 12],
      chordNotes: [55, 58, 62], // G minor chord
      bassNotes: [43, 46] // G and Bb bass notes
    },
    {
      name: 'lightning',
      tempo: 140,
      kickPattern: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      snarePattern: [4, 8, 12],
      hihatPattern: [0, 2, 4, 6, 8, 10, 12, 14],
      bassPattern: [0, 2, 4, 6, 8, 10, 12, 14],
      chordNotes: [67, 71, 74], // G major chord
      bassNotes: [55, 59] // G and B bass notes
    },
    {
      name: 'aurora',
      tempo: 60,
      kickPattern: [0, 12],
      snarePattern: [4, 12],
      hihatPattern: [2, 6, 10, 14],
      bassPattern: [0, 12],
      chordNotes: [64, 68, 71], // E major chord
      bassNotes: [52, 56] // E and B bass notes
    },
    {
      name: 'crystal',
      tempo: 85,
      kickPattern: [0, 4, 8, 12],
      snarePattern: [4, 12],
      hihatPattern: [1, 3, 5, 7, 9, 11, 13, 15],
      bassPattern: [0, 8],
      chordNotes: [60, 64, 67], // C major chord
      bassNotes: [48, 52] // C and G bass notes
    },
    {
      name: 'underwater',
      tempo: 55,
      kickPattern: [0, 6, 12],
      snarePattern: [4, 12],
      hihatPattern: [3, 7, 11, 15],
      bassPattern: [0, 12],
      chordNotes: [61, 65, 68], // Db major chord
      bassNotes: [49, 53] // Db and Ab bass notes
    },
    {
      name: 'lava',
      tempo: 125,
      kickPattern: [0, 2, 4, 6, 8, 10, 12, 14],
      snarePattern: [4, 12],
      hihatPattern: [0, 4, 8, 12],
      bassPattern: [0, 4, 8, 12],
      chordNotes: [57, 60, 64], // A minor chord
      bassNotes: [45, 48] // A and C bass notes
    },
    {
      name: 'organic',
      tempo: 78,
      kickPattern: [0, 4, 8, 12],
      snarePattern: [4, 12],
      hihatPattern: [2, 6, 10, 14],
      bassPattern: [0, 8],
      chordNotes: [62, 65, 69], // D major chord
      bassNotes: [50, 53] // D and G bass notes
    },
    {
      name: 'vaporwave',
      tempo: 82,
      kickPattern: [0, 4, 8, 12],
      snarePattern: [4, 12],
      hihatPattern: [2, 6, 10, 14],
      bassPattern: [0, 8],
      chordNotes: [59, 62, 66], // B minor chord
      bassNotes: [47, 50] // B and D bass notes
    },
    {
      name: 'glitch_art',
      tempo: 105,
      kickPattern: [0, 1, 4, 5, 8, 9, 12, 13],
      snarePattern: [4, 12],
      hihatPattern: [0, 2, 4, 6, 8, 10, 12, 14],
      bassPattern: [0, 4, 8, 12],
      chordNotes: [60, 63, 67], // C minor chord
      bassNotes: [48, 51] // C and Eb bass notes
    },
    {
      name: 'industrial',
      tempo: 115,
      kickPattern: [0, 2, 4, 6, 8, 10, 12, 14],
      snarePattern: [4, 12],
      hihatPattern: [0, 4, 8, 12],
      bassPattern: [0, 4, 8, 12],
      chordNotes: [55, 58, 62], // G minor chord
      bassNotes: [43, 46] // G and Bb bass notes
    },
    {
      name: 'digital',
      tempo: 128,
      kickPattern: [0, 1, 4, 5, 8, 9, 12, 13],
      snarePattern: [4, 12],
      hihatPattern: [0, 2, 4, 6, 8, 10, 12, 14],
      bassPattern: [0, 4, 8, 12],
      chordNotes: [64, 68, 71], // E major chord
      bassNotes: [52, 56] // E and B bass notes
    },
    {
      name: 'minimal',
      tempo: 88,
      kickPattern: [0, 8],
      snarePattern: [4, 12],
      hihatPattern: [2, 6, 10, 14],
      bassPattern: [0, 8],
      chordNotes: [60, 64, 67], // C major chord
      bassNotes: [48, 52] // C and G bass notes
    },
    {
      name: 'zen',
      tempo: 72,
      kickPattern: [0, 6, 12],
      snarePattern: [4, 12],
      hihatPattern: [3, 7, 11, 15],
      bassPattern: [0, 12],
      chordNotes: [61, 65, 68], // Db major chord
      bassNotes: [49, 53] // Db and Ab bass notes
    }
  ];

  constructor() {
    this._currentTheme = this._themes[0]; // Default to chill
  }

  async init(ctx: AudioContext): Promise<void> {
    if (!ctx) return;
    
    this._ctx = ctx;
    
    // Master gain
    this._masterGain = ctx.createGain();
    this._masterGain.gain.value = 0.7;
    this._masterGain.connect(ctx.destination);
    
    // Create simple instruments
    this._createInstruments();
    
    // Add lo-fi texture
    this._createLoFiTexture();
    
    console.log('[LoFiMusicSystemFixed] Initialized');
  }

  start(): void {
    if (!this._ctx || this._started) return;
    
    this._started = true;
    this._nextBeatTime = this._ctx.currentTime;
    console.log('[LoFiMusicSystemFixed] Starting lo-fi music with theme:', this._currentTheme.name);
    
    // Start the beat loop
    this._scheduleNextBeat();
  }

  stop(): void {
    this._started = false;
    
    // Silence all instruments
    if (this._kickGain) this._kickGain.gain.value = 0;
    if (this._snareGain) this._snareGain.gain.value = 0;
    if (this._bassGain) this._bassGain.gain.value = 0;
    if (this._chordGain) this._chordGain.gain.value = 0;
    
    console.log('[LoFiMusicSystemFixed] Stopped');
  }

  setTheme(themeName: string): void {
    const theme = this._themes.find(t => t.name === themeName);
    if (!theme) {
      console.warn(`[LoFiMusicSystemFixed] Theme "${themeName}" not found`);
      return;
    }
    
    // Smooth tempo transition
    if (this._ctx && this._started) {
      const oldTempo = this._currentTheme.tempo;
      const newTempo = theme.tempo;
      const transitionDuration = 2.0; // 2 second transition
      const steps = 20;
      const tempoStep = (newTempo - oldTempo) / steps;
      
      for (let i = 0; i <= steps; i++) {
        setTimeout(() => {
          this._currentTheme.tempo = oldTempo + (tempoStep * i);
        }, (i / steps) * transitionDuration * 1000);
      }
    }
    
    this._currentTheme = theme;
    console.log(`[LoFiMusicSystemFixed] Smooth transition to theme: ${themeName} (${theme.tempo} BPM)`);
  }

  get currentTheme(): string {
    return this._currentTheme.name;
  }

  private _createInstruments(): void {
    if (!this._ctx) return;
    
    // Kick drum (pitched down kick with body)
    this._kickOsc = this._ctx.createOscillator();
    this._kickGain = this._ctx.createGain();
    this._kickOsc.type = 'sine';
    this._kickOsc.frequency.value = 40; // Lower for more body
    this._kickGain.gain.value = 0;
    this._kickOsc.connect(this._kickGain);
    this._kickGain.connect(this._masterGain!);
    this._kickOsc.start();
    
    // Snare drum (layered noise + tone)
    this._snareGain = this._ctx.createGain();
    this._snareGain.gain.value = 0;
    this._snareGain.connect(this._masterGain!);
    
    // Hi-hat (metallic noise)
    this._hihatGain = this._ctx.createGain();
    this._hihatGain.gain.value = 0;
    this._hihatGain.connect(this._masterGain!);
    
    // Bass instrument (sub bass with harmonics)
    this._bassOsc = this._ctx.createOscillator();
    this._bassGain = this._ctx.createGain();
    this._bassOsc.type = 'triangle'; // Softer than sawtooth
    this._bassGain.gain.value = 0;
    this._bassOsc.connect(this._bassGain);
    this._bassGain.connect(this._masterGain!);
    this._bassOsc.start();
    
    // Chord instrument (warm pad with multiple harmonics)
    this._chordOsc = this._ctx.createOscillator();
    this._chordGain = this._ctx.createGain();
    this._chordOsc.type = 'sawtooth';
    this._chordGain.gain.value = 0;
    this._chordOsc.connect(this._chordGain);
    this._chordGain.connect(this._masterGain!);
    this._chordOsc.start();
    
    // Add a lowpass filter for warmth
    const filter = this._ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 2;
    this._chordGain.connect(filter);
    filter.connect(this._masterGain!);
  }
  
  private _createLoFiTexture(): void {
    if (!this._ctx) return;
    
    // Vinyl crackle
    this._vinylGain = this._ctx.createGain();
    this._vinylGain.gain.value = 0.03; // Subtle crackle
    
    // Create vinyl crackle buffer
    const crackleBuffer = this._ctx.createBuffer(1, this._ctx.sampleRate * 2, this._ctx.sampleRate);
    const crackleData = crackleBuffer.getChannelData(0);
    
    for (let i = 0; i < crackleData.length; i++) {
      // Random crackle with occasional pops
      if (Math.random() < 0.002) {
        crackleData[i] = (Math.random() - 0.5) * 0.3; // Occasional pop
      } else {
        crackleData[i] = (Math.random() - 0.5) * 0.02; // Gentle hiss
      }
    }
    
    this._vinylCrackle = this._ctx.createBufferSource();
    this._vinylCrackle.buffer = crackleBuffer;
    this._vinylCrackle.loop = true;
    this._vinylCrackle.connect(this._vinylGain);
    this._vinylGain.connect(this._masterGain!);
    this._vinylCrackle.start();
    
    // Tape saturation (subtle distortion)
    this._saturation = this._ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / 128) - 1; // -1 to 1
      // Soft saturation curve
      curve[i] = Math.tanh(x * 2) * 0.7;
    }
    this._saturation.curve = curve;
    
    // Insert saturation in the master chain
    this._masterGain!.disconnect();
    this._masterGain!.connect(this._saturation);
    this._saturation.connect(this._ctx.destination);
    
    console.log('[LoFiMusicSystemFixed] Lo-fi texture created');
  }

  private _scheduleNextBeat(): void {
    if (!this._started || !this._ctx) return;
    
    const beatDuration = 60.0 / this._currentTheme.tempo;
    
    // Schedule this beat
    this._scheduleBeat(this._nextBeatTime);
    
    // Move to next beat
    this._nextBeatTime += beatDuration;
    
    // Schedule next beat
    setTimeout(() => this._scheduleNextBeat(), beatDuration * 1000);
  }

  private _scheduleBeat(beatTime: number): void {
    if (!this._ctx) return;
    
    const beat = this._currentBeat % 16;
    this._currentBeat++;
    
    // Play instruments based on patterns
    if (this._currentTheme.kickPattern.includes(beat)) {
      this._playKick(beatTime);
    }
    if (this._currentTheme.snarePattern.includes(beat)) {
      this._playSnare(beatTime);
    }
    if (this._currentTheme.hihatPattern.includes(beat)) {
      this._playHihat(beatTime);
    }
    if (this._currentTheme.bassPattern.includes(beat)) {
      this._playBass(beatTime);
    }
    if (beat % 4 === 0) {
      this._playChord(beatTime);
    }
  }

  private _playKick(time: number): void {
    if (!this._kickGain || !this._ctx) return;
    
    // Classic lo-fi kick with pitch envelope
    this._kickOsc!.frequency.setValueAtTime(150, time); // Start higher
    this._kickOsc!.frequency.exponentialRampToValueAtTime(40, time + 0.05); // Drop to low
    
    this._kickGain.gain.setValueAtTime(0.7, time);
    this._kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    
    console.log('[LoFiMusicSystemFixed] Kick');
  }

  private _playSnare(time: number): void {
    if (!this._snareGain || !this._ctx) return;
    
    // Layered snare: tone + noise
    const bufferSize = this._ctx.sampleRate * 0.1; // 100ms of noise
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this._ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Add a tone component for body
    const tone = this._ctx.createOscillator();
    tone.type = 'triangle';
    tone.frequency.value = 200;
    
    // Mix noise and tone
    const noiseGain = this._ctx.createGain();
    const toneGain = this._ctx.createGain();
    
    noise.connect(noiseGain);
    tone.connect(toneGain);
    noiseGain.connect(this._snareGain);
    toneGain.connect(this._snareGain);
    
    noiseGain.gain.value = 0.3;
    toneGain.gain.value = 0.2;
    
    noise.start(time);
    tone.start(time);
    tone.stop(time + 0.05);
    
    // Envelope
    this._snareGain.gain.setValueAtTime(0.5, time);
    this._snareGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    console.log('[LoFiMusicSystemFixed] Snare');
  }

  private _playHihat(time: number): void {
    if (!this._hihatGain || !this._ctx) return;
    
    // Metallic hi-hat noise
    const bufferSize = this._ctx.sampleRate * 0.03; // 30ms
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      // High-frequency noise with metallic character
      data[i] = (Math.random() - 0.5) * 0.3;
      // Add some high-frequency emphasis
      if (i % 2 === 0) data[i] *= 1.5;
    }
    
    const noise = this._ctx.createBufferSource();
    noise.buffer = buffer;
    
    // High-pass filter for metallic sound
    const filter = this._ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;
    filter.Q.value = 5;
    
    noise.connect(filter);
    filter.connect(this._hihatGain);
    noise.start(time);
    
    // Short, sharp envelope
    this._hihatGain.gain.setValueAtTime(0.15, time);
    this._hihatGain.gain.exponentialRampToValueAtTime(0.01, time + 0.03);
    
    console.log('[LoFiMusicSystemFixed] Hi-hat');
  }

  private _playBass(time: number): void {
    if (!this._bassOsc || !this._bassGain || !this._ctx) return;
    
    const noteIndex = Math.floor(this._currentBeat / 4) % this._currentTheme.bassNotes.length;
    const midiNote = this._currentTheme.bassNotes[noteIndex];
    const frequency = this._midiToFreq(midiNote);
    
    // Add some glide for smoothness
    this._bassOsc.frequency.exponentialRampToValueAtTime(frequency, time + 0.02);
    
    // Softer envelope for bass
    this._bassGain.gain.setValueAtTime(0.4, time);
    this._bassGain.gain.exponentialRampToValueAtTime(0.2, time + 0.1);
    this._bassGain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    
    console.log('[LoFiMusicSystemFixed] Bass');
  }

  private _playChord(time: number): void {
    if (!this._chordOsc || !this._chordGain || !this._ctx) return;
    
    const noteIndex = Math.floor(this._currentBeat / 4) % this._currentTheme.chordNotes.length;
    const midiNote = this._currentTheme.chordNotes[noteIndex];
    const frequency = this._midiToFreq(midiNote);
    
    // Slow attack for pads
    this._chordOsc.frequency.setValueAtTime(frequency, time);
    this._chordGain.gain.setValueAtTime(0, time);
    this._chordGain.gain.linearRampToValueAtTime(0.15, time + 0.2); // Slow attack
    this._chordGain.gain.exponentialRampToValueAtTime(0.05, time + 1.5); // Long release
    
    console.log('[LoFiMusicSystemFixed] Chord');
  }

  private _midiToFreq(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  get isStarted(): boolean {
    return this._started;
  }

  get amplitude(): number {
    return this._started ? 0.5 : 0;
  }

  get bass(): number {
    return this._started ? 0.3 : 0;
  }
}
