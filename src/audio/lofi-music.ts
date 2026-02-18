/**
 * Simple Lo-Fi Music System
 * Creates theme-based lo-fi music with drums, bass, chords, and melody
 */

export interface MusicTheme {
  name: string;
  tempo: number;
  swing: number;
  mood: string;
  scale: string[];
  chords: string[];
  drums: {
    kick: number[];
    snare: number[];
    hihat: number[];
    melody: number[];
    bass: number[];
  };
}

export class LoFiMusicSystem {
  private _ctx: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private _started = false;
  private _currentBeat = 0;
  private _currentTheme: MusicTheme;
  private _params = {
    masterLevel: 0.7,
    tempo: 85,
    swing: 0.1,
    currentTheme: 'chill'
  };

  // Instruments
  private _kickOsc: OscillatorNode | null = null;
  private _kickGain: GainNode | null = null;
  private _snareOsc: OscillatorNode | null = null;
  private _snareGain: GainNode | null = null;
  private _hihatNoise: AudioBufferSourceNode | null = null;
  private _hihatGain: GainNode | null = null;
  private _bassOsc: OscillatorNode | null = null;
  private _bassGain: GainNode | null = null;
  private _chordOscs: OscillatorNode[] = [];
  private _chordGains: GainNode[] = [];
  private _melodyOsc: OscillatorNode | null = null;
  private _melodyGain: GainNode | null = null;

  // Music themes
  private _themes: MusicTheme[] = [
    {
      name: 'chill',
      tempo: 85,
      swing: 0.1,
      mood: 'relaxed',
      scale: ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'],
      chords: ['Cmaj7', 'Am7', 'Fmaj7', 'G7'],
      drums: {
        kick: [0, 4, 8, 12],
        snare: [4, 12],
        hihat: [0, 2, 4, 6, 8, 10, 12, 14],
        melody: [1, 3, 5, 7, 9, 11, 13, 15],
        bass: [0, 8]
      }
    },
    {
      name: 'dreamy',
      tempo: 75,
      swing: 0.15,
      mood: 'ethereal',
      scale: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
      chords: ['Dbmaj7', 'Bbm7', 'Abmaj7', 'Eb7'],
      drums: {
        kick: [0, 6, 12],
        snare: [4, 12],
        hihat: [2, 6, 10, 14],
        melody: [3, 7, 11, 15],
        bass: [0, 12]
      }
    },
    {
      name: 'dark',
      tempo: 95,
      swing: 0.05,
      mood: 'melancholic',
      scale: ['C', 'Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb'],
      chords: ['Cm7', 'Gm7', 'Abmaj7', 'Eb7'],
      drums: {
        kick: [0, 2, 4, 6, 8, 10, 12, 14],
        snare: [4, 12],
        hihat: [0, 4, 8, 12],
        melody: [1, 5, 9, 13],
        bass: [0, 6, 12]
      }
    },
    {
      name: 'energetic',
      tempo: 120,
      swing: 0.08,
      mood: 'upbeat',
      scale: ['E', 'F#', 'G', 'A', 'B', 'C#', 'D'],
      chords: ['Emaj7', 'C#m7', 'Amaj7', 'B7'],
      drums: {
        kick: [0, 1, 4, 5, 8, 9, 12, 13],
        snare: [4, 12],
        hihat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        melody: [2, 6, 10, 14],
        bass: [0, 4, 8, 12]
      }
    },
    {
      name: 'nostalgic',
      tempo: 80,
      swing: 0.12,
      mood: 'vintage',
      scale: ['F', 'G', 'Ab', 'Bb', 'C', 'D', 'Eb'],
      chords: ['Fmaj7', 'Dm7', 'Bbmaj7', 'C7'],
      drums: {
        kick: [0, 4, 8, 12],
        snare: [4, 12],
        hihat: [0, 2, 4, 6, 8, 10, 12, 14],
        melody: [1, 5, 9, 13],
        bass: [0, 8]
      }
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
    this._masterGain.gain.value = this._params.masterLevel;
    this._masterGain.connect(ctx.destination);
    
    // Create instruments
    this._createInstruments();
    
    console.log('[LoFiMusicSystem] Initialized');
  }

  start(): void {
    if (!this._ctx || this._started) return;
    
    this._started = true;
    console.log('[LoFiMusicSystem] Starting lo-fi music with theme:', this._currentTheme.name);
    
    // Schedule the first beat immediately
    this._scheduleNextBeat();
  }

  stop(): void {
    this._started = false;
    
    // Silence all instruments
    if (this._melodyGain) this._melodyGain.gain.value = 0;
    this._chordGains.forEach(gain => gain.gain.value = 0);
    if (this._bassGain) this._bassGain.gain.value = 0;
    if (this._kickGain) this._kickGain.gain.value = 0;
    if (this._snareGain) this._snareGain.gain.value = 0;
    if (this._hihatGain) this._hihatGain.gain.value = 0;
    
    console.log('[LoFiMusicSystem] Stopped');
  }

  setTheme(themeName: string): void {
    const theme = this._themes.find(t => t.name === themeName);
    if (!theme) {
      console.warn(`[LoFiMusicSystem] Theme "${themeName}" not found, keeping current theme`);
      return;
    }
    
    this._currentTheme = theme;
    this._params.tempo = theme.tempo;
    this._params.swing = theme.swing;
    this._params.currentTheme = themeName;
    
    console.log(`[LoFiMusicSystem] Set theme: ${themeName} (${theme.tempo} BPM, ${theme.mood})`);
  }

  get currentTheme(): string {
    return this._params.currentTheme;
  }

  private _createInstruments(): void {
    if (!this._ctx) return;
    
    // Kick drum
    this._kickOsc = this._ctx.createOscillator();
    this._kickGain = this._ctx.createGain();
    this._kickOsc.type = 'sine';
    this._kickOsc.frequency.value = 60;
    this._kickGain.gain.value = 0;
    this._kickOsc.connect(this._kickGain);
    this._kickGain.connect(this._masterGain!);
    this._kickOsc.start();
    
    // Snare drum
    this._snareOsc = this._ctx.createOscillator();
    this._snareGain = this._ctx.createGain();
    this._snareOsc.type = 'triangle';
    this._snareOsc.frequency.value = 200;
    this._snareGain.gain.value = 0;
    this._snareOsc.connect(this._snareGain);
    this._snareGain.connect(this._masterGain!);
    this._snareOsc.start();
    
    // Hi-hat (noise)
    this._hihatGain = this._ctx.createGain();
    this._hihatGain.gain.value = 0;
    this._hihatGain.connect(this._masterGain!);
    
    // Bass instrument
    this._bassOsc = this._ctx.createOscillator();
    this._bassGain = this._ctx.createGain();
    this._bassOsc.type = 'sawtooth';
    this._bassGain.gain.value = 0;
    this._bassOsc.connect(this._bassGain);
    this._bassGain.connect(this._masterGain!);
    this._bassOsc.start();
    
    // Chord instruments (warm pads)
    for (let i = 0; i < 4; i++) {
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type = 'sawtooth';
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this._masterGain!);
      osc.start();
      this._chordOscs.push(osc);
      this._chordGains.push(gain);
    }
    
    // Melody instrument (Rhodes-like)
    this._melodyOsc = this._ctx.createOscillator();
    this._melodyGain = this._ctx.createGain();
    this._melodyOsc.type = 'triangle';
    this._melodyGain.gain.value = 0;
    this._melodyOsc.connect(this._melodyGain);
    this._melodyGain.connect(this._masterGain!);
    this._melodyOsc.start();
  }

  private _scheduleNextBeat(): void {
    if (!this._started || !this._ctx) return;
    
    const beatDuration = 60.0 / this._params.tempo;
    const nextBeatTime = this._ctx.currentTime + beatDuration;
    
    this._scheduleBeat(nextBeatTime);
    
    setTimeout(() => this._scheduleNextBeat(), beatDuration * 1000);
  }

  private _scheduleBeat(beatTime: number): void {
    if (!this._ctx) return;
    
    const beat = this._currentBeat % 16;
    this._currentBeat++;
    
    const drumPattern = this._currentTheme.drums;
    
    if (drumPattern.kick.includes(beat)) {
      this._playKick(beatTime);
    }
    if (drumPattern.snare.includes(beat)) {
      this._playSnare(beatTime);
    }
    if (drumPattern.hihat.includes(beat)) {
      this._playHihat(beatTime);
    }
    
    if (beat % 4 === 0) {
      this._playChord(beatTime);
    }
    
    if (drumPattern.melody.includes(beat)) {
      this._playMelodyNote(beatTime);
    }
    
    if (drumPattern.bass.includes(beat)) {
      this._playBassNote(beatTime);
    }
  }

  private _playKick(time: number): void {
    if (!this._kickGain || !this._ctx) return;
    
    this._kickGain.gain.setValueAtTime(0.8, time);
    this._kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    console.log('[LoFiMusicSystem] Playing kick drum');
  }

  private _playSnare(time: number): void {
    if (!this._snareGain || !this._ctx) return;
    
    this._snareGain.gain.setValueAtTime(0.4, time);
    this._snareGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    console.log('[LoFiMusicSystem] Playing snare drum');
  }

  private _playHihat(time: number): void {
    if (!this._hihatGain || !this._ctx) return;
    
    // Create white noise for hi-hat
    const bufferSize = this._ctx.sampleRate * 0.05; // 50ms of noise
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this._ctx.createBufferSource();
    noise.buffer = buffer;
    noise.connect(this._hihatGain);
    noise.start(time);
    
    this._hihatGain.gain.setValueAtTime(0.2, time);
    this._hihatGain.gain.exponentialRampToValueAtTime(0.01, time + 0.03);
    
    console.log('[LoFiMusicSystem] Playing hi-hat');
  }

  private _playChord(time: number): void {
    if (!this._ctx) return;
    
    const chordIndex = Math.floor(this._currentBeat / 4) % this._currentTheme.chords.length;
    const chordName = this._currentTheme.chords[chordIndex];
    const notes = this._getChordNotes(chordName);
    
    notes.forEach((note, i) => {
      if (this._chordOscs[i] && this._chordGains[i]) {
        this._chordOscs[i].frequency.setValueAtTime(note, time);
        this._chordGains[i].gain.setValueAtTime(0.3, time);
        this._chordGains[i].gain.exponentialRampToValueAtTime(0.01, time + 1.0);
      }
    });
    
    console.log('[LoFiMusicSystem] Playing chord:', chordName);
  }

  private _playBassNote(time: number): void {
    if (!this._bassOsc || !this._bassGain || !this._ctx) return;
    
    const chordIndex = Math.floor(this._currentBeat / 4) % this._currentTheme.chords.length;
    const chordName = this._currentTheme.chords[chordIndex];
    const bassNote = this._getBassNote(chordName);
    
    this._bassOsc.frequency.setValueAtTime(bassNote, time);
    this._bassGain.gain.setValueAtTime(0.5, time);
    this._bassGain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    
    console.log('[LoFiMusicSystem] Playing bass note');
  }

  private _playMelodyNote(time: number): void {
    if (!this._melodyOsc || !this._melodyGain || !this._ctx) return;
    
    // Simple pentatonic scale for melody
    const pentatonicScale = [0, 2, 4, 7, 9]; // MIDI intervals
    const rootNote = 60; // Middle C
    const octave = Math.floor(Math.random() * 2);
    const scaleDegree = Math.floor(Math.random() * pentatonicScale.length);
    const note = this._midiToFreq(rootNote + (octave * 12) + pentatonicScale[scaleDegree]);
    
    this._melodyOsc.frequency.setValueAtTime(note, time);
    this._melodyGain.gain.setValueAtTime(0.2, time);
    this._melodyGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    console.log('[LoFiMusicSystem] Playing melody note');
  }

  private _getChordNotes(chordName: string): number[] {
    // Simple chord mapping (MIDI note numbers)
    const chords: { [key: string]: number[] } = {
      'Cmaj7': [60, 64, 67, 71],
      'Cm7': [60, 63, 67, 70],
      'Dbmaj7': [61, 65, 68, 72],
      'Dm7': [62, 65, 69, 72],
      'Eb7': [63, 66, 69, 72],
      'Emaj7': [64, 68, 71, 75],
      'Fmaj7': [65, 69, 72, 76],
      'Gm7': [55, 58, 62, 65],
      'G7': [55, 59, 62, 65],
      'Abmaj7': [56, 60, 63, 67],
      'Am7': [57, 60, 64, 67],
      'Bb7': [58, 61, 64, 67],
      'Bbmaj7': [58, 62, 65, 69],
      'B7': [59, 62, 65, 68],
      'C#m7': [61, 64, 68, 71],
      'Amaj7': [69, 73, 76, 80]
    };
    
    const notes = chords[chordName] || [60, 64, 67];
    return notes.map(note => this._midiToFreq(note));
  }

  private _getBassNote(chordName: string): number {
    // Get the root note of the chord
    const chordNotes: { [key: string]: number } = {
      'Cmaj7': 48, 'Cm7': 48, 'Dbmaj7': 49, 'Dm7': 50,
      'Eb7': 51, 'Emaj7': 52, 'Fmaj7': 53, 'Gm7': 43,
      'G7': 43, 'Abmaj7': 44, 'Am7': 45, 'Bb7': 46,
      'Bbmaj7': 46, 'B7': 47, 'C#m7': 49, 'Amaj7': 57
    };
    
    const bassNote = chordNotes[chordName] || 48;
    return this._midiToFreq(bassNote);
  }

  private _midiToFreq(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  setMasterLevel(level: number): void {
    this._params.masterLevel = Math.max(0, Math.min(1, level));
    if (this._masterGain) {
      this._masterGain.gain.setValueAtTime(this._params.masterLevel, this._ctx!.currentTime);
    }
  }

  setTempo(tempo: number): void {
    this._params.tempo = Math.max(60, Math.min(180, tempo));
  }

  setSwing(swing: number): void {
    this._params.swing = Math.max(0, Math.min(0.3, swing));
  }

  get isStarted(): boolean {
    return this._started;
  }

  get amplitude(): number {
    // Simple amplitude calculation based on current activity
    return this._started ? 0.5 : 0;
  }

  get bass(): number {
    return this._started ? 0.3 : 0;
  }
}
