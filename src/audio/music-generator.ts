/**
 * Dynamic Music Generator - Procedural composition system for LLM Director.
 * 
 * Creates real-time musical compositions based on simulation state, mood, and events.
 * The LLM can control musical parameters to create dynamic scores that evolve
 * with the visual experience.
 */

export interface MusicalNote {
  pitch: number;        // MIDI note number [0-127]
  velocity: number;     // Note velocity [0-127]
  duration: number;    // Note duration in beats [0.25-4.0]
  time: number;        // When to play the note (in beats)
  channel: number;     // MIDI channel [0-15]
}

export interface MusicalPhrase {
  notes: MusicalNote[];
  tempo: number;       // BPM [60-180]
  key: string;          // Musical key (C, D, E, F, G, A, B, plus minor)
  scale: string;        // Scale type (major, minor, pentatonic, blues, etc.)
  mood: string;         // Emotional quality (peaceful, intense, mysterious, etc.)
  instrument: string;   // Instrument type (piano, strings, pads, etc.)
}

export interface MusicGeneratorParams {
  // Musical structure
  tempo: number;           // BPM [60-180]
  key: string;             // Musical key
  scale: string;           // Scale type
  complexity: number;       // Note density [0.1-1.0]
  harmony: number;          // Chord complexity [0-1.0]
  
  // Instrumentation
  leadInstrument: string;    // Lead melody instrument
  harmonyInstrument: string; // Harmony/chord instrument
  bassInstrument: string;    // Bass line instrument
  padInstrument: string;     // Atmospheric pads
  
  // Performance
  swing: number;            // Swing amount [0-1]
  articulation: number;     // Note length variation [0-1]
  dynamics: number;         // Volume variation [0-1]
  
  // Reactive elements
  bassReactivity: number;   // How much bass follows audio analysis [0-1]
  beatSync: boolean;        // Sync to detected beats
  intensityMapping: number; // Map visual intensity to musical intensity [0-1]
}

export class MusicGenerator {
  private _ctx: AudioContext | null = null;
  private _currentTime: number = 0;
  private _isPlaying = false;
  
  // Musical state
  private _currentPhrase: MusicalPhrase | null = null;
  private _nextNoteTime: number = 0;
  private _currentTempo: number = 120;
  private _params: MusicGeneratorParams;
  
  // Audio nodes
  private _masterGain: GainNode | null = null;
  private _leadSynth: WebAudioSynth | null = null;
  private _harmonySynth: WebAudioSynth | null = null;
  private _bassSynth: WebAudioSynth | null = null;
  private _padSynth: WebAudioSynth | null = null;
  
  // Note queue
  private _noteQueue: MusicalNote[] = [];
  private _activeNotes: Map<number, OscillatorNode> = new Map();
  
  constructor() {
    this._params = {
      tempo: 120,
      key: "C",
      scale: "major",
      complexity: 0.5,
      harmony: 0.6,
      leadInstrument: "piano",
      harmonyInstrument: "strings",
      bassInstrument: "bass",
      padInstrument: "pads",
      swing: 0.1,
      articulation: 0.8,
      dynamics: 0.3,
      bassReactivity: 0.5,
      beatSync: true,
      intensityMapping: 0.7
    };
  }
  
  /** Initialize the music generator (must be called from user gesture). */
  init(): void {
    if (this._ctx) return;
    
    this._ctx = new AudioContext();
    this._currentTime = this._ctx.currentTime;
    
    // Create audio nodes
    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.value = 0.7;
    this._masterGain.connect(this._ctx.destination);
    
    // Create synthesizers
    this._leadSynth = new WebAudioSynth(this._ctx, "lead");
    this._harmonySynth = new WebAudioSynth(this._ctx, "harmony");
    this._bassSynth = new WebAudioSynth(this._ctx, "bass");
    this._padSynth = new WebAudioSynth(this._ctx, "pad");
    
    // Connect synthesizers
    this._leadSynth.connect(this._masterGain);
    this._harmonySynth.connect(this._masterGain);
    this._bassSynth.connect(this._masterGain);
    this._padSynth.connect(this._masterGain);
    
    this._isPlaying = true;
  }
  
  /** Update music generator (call each frame). */
  update(audioAnalysis: AudioAnalysis, deltaTime: number): void {
    if (!this._isPlaying) return;
    
    this._currentTime += deltaTime;
    
    // Process note queue
    this._processNoteQueue();
    
    // Update synthesizers based on audio analysis
    if (this._params.bassReactivity > 0 && audioAnalysis.beatHit) {
      this._createBeatReactiveNotes(audioAnalysis);
    }
    
    // Generate new phrase if needed
    if (this._shouldGenerateNewPhrase()) {
      this._generateNewPhrase();
    }
  }
  
  /** Set music parameters in real-time. */
  setParams(params: Partial<MusicGeneratorParams>): void {
    Object.assign(this._params, params);
    this._currentTempo = this._params.tempo;
    
    // Update synthesizer parameters
    this._updateSynths();
  }
  
  /** Get current music parameters. */
  getParams(): MusicGeneratorParams {
    return { ...this._params };
  }
  
  /** Generate a musical phrase based on current parameters. */
  generatePhrase(mood?: string, intensity?: number): MusicalPhrase {
    const effectiveMood = mood || "neutral";
    const effectiveIntensity = intensity || 0.5;
    
    // Generate notes based on key, scale, and complexity
    const notes = this._generateNotes(effectiveMood, effectiveIntensity);
    
    return {
      notes,
      tempo: this._params.tempo,
      key: this._params.key,
      scale: this._params.scale,
      mood: effectiveMood,
      instrument: this._params.leadInstrument
    };
  }
  
  /** Schedule a musical phrase for playback. */
  schedulePhrase(phrase: MusicalPhrase): void {
    this._currentPhrase = phrase;
    this._currentTempo = phrase.tempo;
    this._nextNoteTime = this._currentTime;
    
    // Add notes to queue
    for (const note of phrase.notes) {
      this._noteQueue.push({ ...note, time: this._nextNoteTime });
      this._nextNoteTime += note.duration;
    }
  }
  
  /** Create SFX based on simulation events. */
  createEventSFX(eventType: string, intensity: number): void {
    if (!this._ctx) return;
    
    switch (eventType) {
      case "beat":
        this._createBeatSFX(intensity);
        break;
      case "transition":
        this._createTransitionSFX(intensity);
        break;
      case "explosion":
        this._createExplosionSFX(intensity);
        break;
      case "glitch":
        this._createGlitchSFX(intensity);
        break;
      case "ambient":
        this._createAmbientSFX(intensity);
        break;
    }
  }
  
  // --- Private methods ---
  
  private _processNoteQueue(): void {
    while (this._noteQueue.length > 0 && this._noteQueue[0].time <= this._currentTime) {
      const note = this._noteQueue.shift()!;
      this._playNote(note);
    }
  }
  
  private _playNote(note: MusicalNote): void {
    if (!this._ctx) return;
    
    // Stop any existing note with same pitch
    this._stopNote(note.pitch);
    
    // Create oscillator
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    
    // Set pitch (convert MIDI to frequency)
    const frequency = this._midiToFrequency(note.pitch);
    osc.frequency.value = frequency;
    
    // Set velocity (convert MIDI 0-127 to 0-1)
    const velocity = note.velocity / 127;
    gain.gain.value = velocity * 0.3;
    
    // Connect and start
    osc.connect(gain);
    gain.connect(this._masterGain!);
    
    osc.start(this._currentTime);
    osc.stop(this._currentTime + note.duration * 60 / this._currentTempo);
    
    // Track active note
    this._activeNotes.set(note.pitch, osc);
    
    // Schedule note stop
    setTimeout(() => this._stopNote(note.pitch), note.duration * 60000 / this._currentTempo);
  }
  
  private _stopNote(pitch: number): void {
    const osc = this._activeNotes.get(pitch);
    if (osc) {
      try {
        osc.stop();
      } catch (e) {
        // Note already stopped
      }
      this._activeNotes.delete(pitch);
    }
  }
  
  private _shouldGenerateNewPhrase(): boolean {
    return !this._currentPhrase || this._nextNoteTime <= this._currentTime + 2;
  }
  
  private _generateNewPhrase(): void {
    const phrase = this.generatePhrase();
    this.schedulePhrase(phrase);
  }
  
  private _generateNotes(mood: string, intensity: number): MusicalNote[] {
    const notes: MusicalNote[] = [];
    const scale = this._getScaleNotes(this._params.key, this._params.scale);
    const chordProgression = this._getChordProgression(mood);
    
    // Generate melody based on complexity
    const noteCount = Math.floor(4 + this._params.complexity * 8);
    const beatsPerBar = 4;
    
    for (let i = 0; i < noteCount; i++) {
      const beat = Math.floor(i / beatsPerBar);
      const chordIndex = Math.min(Math.floor(beat / 2), chordProgression.length - 1);
      const chord = chordProgression[chordIndex];
      
      // Choose note from chord
      const chordNotes = scale.filter(n => chord.includes(n % 12));
      const noteIndex = Math.floor(Math.random() * chordNotes.length);
      const pitch = chordNotes[noteIndex];
      
      // Add octave variation
      const octave = Math.floor(Math.random() * 2) + 4;
      const finalPitch = pitch + (octave * 12);
      
      // Duration with articulation variation
      const baseDuration = 0.5 + (Math.random() - 0.5) * this._params.articulation;
      const duration = Math.max(0.25, Math.min(2.0, baseDuration));
      
      // Velocity with dynamics
      const baseVelocity = 80 + intensity * 40;
      const velocity = Math.max(40, Math.min(127, baseVelocity + (Math.random() - 0.5) * this._params.dynamics * 40));
      
      notes.push({
        pitch: finalPitch,
        velocity,
        duration,
        time: 0, // Will be set by scheduler
        channel: 0
      });
    }
    
    return notes;
  }
  
  private _getScaleNotes(key: string, scale: string): number[] {
    const scales: Record<string, number[]> = {
      "C": [0, 2, 4, 5, 7, 9, 11],
      "D": [2, 4, 6, 7, 9, 11, 1],
      "E": [4, 6, 8, 9, 11, 1, 3],
      "F": [5, 7, 9, 10, 0, 2, 4],
      "G": [7, 9, 11, 0, 2, 4, 6],
      "A": [9, 11, 1, 2, 4, 6, 8],
      "B": [11, 1, 3, 4, 6, 8, 10]
    };
    
    const scaleTypes: Record<string, number[]> = {
      "major": [...scales[key], ...scales[key].map(n => n + 12)], // Add octave
      "minor": [...scales[key], ...scales[key].map(n => n + 12), 1, 3, 6, 8, 10], // Minor scale
      "pentatonic": [0, 2, 4, 7, 9, 12, 14, 16, 19, 21].map(n => n + scales[key][0]), // Pentatonic
      "blues": [0, 3, 5, 6, 7, 10, 12].map(n => n + scales[key][0]) // Blues scale
    };
    
    return scaleTypes[scale] || scaleTypes["major"];
  }
  
  private _getChordProgression(mood: string): number[][] {
    const progressions: Record<string, number[][]> = {
      "peaceful": [[0, 2, 4], [5, 7, 9], [0, 4, 7]], // I-V-vi-IV in C
      "intense": [[0, 4, 7], [5, 9, 0], [2, 5, 7]], // I-vi-IV in C
      "mysterious": [[0, 3, 6], [5, 8, 11], [2, 6, 9]], // Dim chords
      "happy": [[0, 4, 7], [2, 5, 9], [0, 7, 9]], // I-V-vi in C
      "dramatic": [[0, 4, 7], [5, 8, 11], [7, 11, 2]], // I-vi-ii in C
      "neutral": [[0, 2, 4], [5, 7, 9], [0, 4, 7]]  // Simple progression
    };
    
    return progressions[mood] || progressions["neutral"];
  }
  
  private _createBeatReactiveNotes(audioAnalysis: AudioAnalysis): void {
    if (!this._ctx) return;
    
    const bassFreq = 55 + audioAnalysis.bass * 100;
    const velocity = 80 + audioAnalysis.bass * 40;
    
    // Create bass note
    const osc = this._ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = bassFreq;
    
    const gain = this._ctx.createGain();
    gain.gain.value = velocity / 127 * 0.4;
    
    osc.connect(gain);
    gain.connect(this._masterGain!);
    
    osc.start(this._currentTime);
    osc.stop(this._currentTime + 0.2);
  }
  
  private _updateSynths(): void {
    // Update synthesizer parameters based on current params
    // This would update filter cutoff, envelope parameters, etc.
    // Implementation depends on the WebAudioSynth class
  }
  
  private _midiToFrequency(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }
  
  // SFX generators
  private _createBeatSFX(intensity: number): void {
    // Create a percussive sound
    this.schedulePhrase({
      notes: [
        { pitch: 36, velocity: 100, duration: 0.1, time: 0, channel: 9 }, // Kick
        { pitch: 42, velocity: 80, duration: 0.1, time: 0.25, channel: 9 }, // Snare
        { pitch: 38, velocity: 60, duration: 0.1, time: 0.5, channel: 9 } // Hi-hat
      ],
      tempo: this._currentTempo,
      key: this._params.key,
      scale: this._params.scale,
      mood: "rhythmic",
      instrument: "percussion"
    });
  }
  
  private _createTransitionSFX(intensity: number): void {
    // Create a rising/falling sound effect
    const duration = 1.0 + intensity * 2;
    const startFreq = 200;
    const endFreq = 800 + intensity * 400;
    
    const osc = this._ctx!.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(startFreq, this._currentTime);
    osc.frequency.setValueAtTime(endFreq, this._currentTime + duration);
    
    const gain = this._ctx!.createGain();
    gain.gain.setValueAtTime(0.3 * intensity, this._currentTime);
    gain.gain.setValueAtTime(0.01, this._currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this._masterGain!);
    
    osc.start(this._currentTime);
    osc.stop(this._currentTime + duration);
  }
  
  private _createExplosionSFX(intensity: number): void {
    // Create a burst of noise
    const bufferSize = this._ctx!.sampleRate * 0.5;
    const buffer = this._ctx!.createBuffer(1, bufferSize, this._ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() - 0.5) * 2 * intensity;
    }
    
    const source = this._ctx!.createBufferSource();
    source.buffer = buffer;
    
    const gain = this._ctx!.createGain();
    gain.gain.value = intensity * 0.5;
    
    const filter = this._ctx!.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1000;
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain!);
    
    source.start(this._currentTime);
    source.stop(this._currentTime + 0.5);
  }
  
  private _createGlitchSFX(intensity: number): void {
    // Create staccato random notes
    for (let i = 0; i < 5 * intensity; i++) {
      const pitch = Math.floor(Math.random() * 24) + 48;
      const note: MusicalNote = {
        pitch,
        velocity: 100,
        duration: 0.05,
        time: this._currentTime + i * 0.1,
        channel: 0
      };
      this._noteQueue.push(note);
    }
  }
  
  private _createAmbientSFX(intensity: number): void {
    // Create slow, evolving pads
    const duration = 4.0;
    const notes = this._generateNotes("peaceful", intensity * 0.5);
    
    // Make notes longer and softer
    notes.forEach(note => {
      note.duration *= 2;
      note.velocity *= 0.6;
    });
    
    this.schedulePhrase({
      notes,
      tempo: this._currentTempo * 0.5, // Slower tempo
      key: this._params.key,
      scale: "pentatonic",
      mood: "ambient",
      instrument: "pads"
    });
  }
}

// Audio analysis interface (from existing Audio class)
export interface AudioAnalysis {
  amplitude: number;
  brightness: number;
  bass: number;
  mid: number;
  high: number;
  beatHit: boolean;
  rhythmicIntensity: number;
  spectralCentroid: number;
}

// Simple WebAudio synthesizer class
class WebAudioSynth {
  private _ctx: AudioContext;
  private _osc: OscillatorNode;
  private _gain: GainNode;
  private _filter: BiquadFilterNode;
  
  constructor(ctx: AudioContext, type: string) {
    this._ctx = ctx;
    
    this._osc = ctx.createOscillator();
    this._gain = ctx.createGain();
    this._filter = ctx.createBiquadFilter();
    
    // Set up based on type
    switch (type) {
      case "lead":
        this._osc.type = "sawtooth";
        this._filter.type = "lowpass";
        this._filter.frequency.value = 2000;
        this._filter.Q.value = 2;
        break;
      case "harmony":
        this._osc.type = "triangle";
        this._filter.type = "lowpass";
        this._filter.frequency.value = 1500;
        this._filter.Q.value = 1;
        break;
      case "bass":
        this._osc.type = "sine";
        this._filter.type = "lowpass";
        this._filter.frequency.value = 200;
        this._filter.Q.value = 1;
        break;
      case "pad":
        this._osc.type = "sine";
        this._filter.type = "lowpass";
        this._filter.frequency.value = 800;
        this._filter.Q.value = 0.5;
        break;
      case "percussion":
        this._osc.type = "square";
        this._filter.type = "highpass";
        this._filter.frequency.value = 1000;
        this._filter.Q.value = 0.5;
        break;
      default:
        this._osc.type = "sine";
        this._filter.type = "lowpass";
        this._filter.frequency.value = 1000;
        this._filter.Q.value = 1;
    }
    
    this._gain.gain.value = 0.3;
    
    this._osc.connect(this._filter);
    this._filter.connect(this._gain);
  }
  
  connect(destination: AudioNode): void {
    this._gain.connect(destination);
  }
  
  setFrequency(frequency: number): void {
    this._osc.frequency.value = frequency;
  }
  
  setGain(gain: number): void {
    this._gain.gain.value = gain;
  }
  
  start(time?: number): void {
    this._osc.start(time);
  }
  
  stop(time?: number): void {
    this._osc.stop(time);
  }
}
