/**
 * Lofi Music System - Ambient lofi tracks for the audio experience.
 * Integrates with the main Audio engine for analysis and control.
 */

export interface LofiTrack {
  id: string;
  name: string;
  url: string;
  bpm: number;
  mood: "chill" | "study" | "dreamy" | "nostalgic" | "upbeat";
  description: string;
}

export class LofiPlayer {
  private _audioContext: AudioContext | null = null;
  private _currentTrack: LofiTrack | null = null;
  private _source: AudioBufferSourceNode | null = null;
  private _gainNode: GainNode | null = null;
  private _buffer: AudioBuffer | null = null;
  private _isPlaying = false;
  private _volume = 0.3;
  private _crossfadeGain: GainNode | null = null;
  private _nextSource: AudioBufferSourceNode | null = null;
  private _nextBuffer: AudioBuffer | null = null;

  // Built-in lofi tracks (using placeholder URLs - these would be actual audio files)
  private _tracks: LofiTrack[] = [
    {
      id: "rainy-study",
      name: "Rainy Study Session",
      url: "/audio/lofi/rainy-study.mp3",
      bpm: 85,
      mood: "study",
      description: "Gentle piano with rain sounds, perfect for focus"
    },
    {
      id: "midnight-coffee",
      name: "Midnight Coffee",
      url: "/audio/lofi/midnight-coffee.mp3", 
      bpm: 90,
      mood: "chill",
      description: "Smooth jazz vibes with coffee shop ambiance"
    },
    {
      id: "dream-waves",
      name: "Dream Waves",
      url: "/audio/lofi/dream-waves.mp3",
      bpm: 75,
      mood: "dreamy", 
      description: "Ethereal melodies with ocean wave textures"
    },
    {
      id: "nostalgic-beats",
      name: "Nostalgic Beats",
      url: "/audio/lofi/nostalgic-beats.mp3",
      bpm: 95,
      mood: "nostalgic",
      description: "Vintage hip-hop vibes with warm tape saturation"
    },
    {
      id: "upbeat-morning",
      name: "Upbeat Morning",
      url: "/audio/lofi/upbeat-morning.mp3",
      bpm: 110,
      mood: "upbeat",
      description: "Energetic yet relaxed beats for a fresh start"
    }
  ];

  constructor(audioContext: AudioContext) {
    this._audioContext = audioContext;
    this._gainNode = audioContext.createGain();
    this._gainNode.gain.value = this._volume;
    this._crossfadeGain = audioContext.createGain();
    this._crossfadeGain.gain.value = 0;
    this._gainNode.connect(this._crossfadeGain);
  }

  /** Get all available lofi tracks */
  getTracks(): LofiTrack[] {
    return [...this._tracks];
  }

  /** Get current playing track */
  getCurrentTrack(): LofiTrack | null {
    return this._currentTrack;
  }

  /** Check if lofi is playing */
  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /** Get current volume */
  get volume(): number {
    return this._volume;
  }

  /** Set volume (0-1) */
  setVolume(value: number): void {
    this._volume = Math.max(0, Math.min(1, value));
    if (this._gainNode) {
      this._gainNode.gain.value = this._volume;
    }
  }

  /** Load a track asynchronously */
  async loadTrack(trackId: string): Promise<void> {
    const track = this._tracks.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    try {
      // For now, we'll create a simple sine wave as placeholder
      // In production, this would load the actual audio file
      const ctx = this._audioContext!;
      const duration = 120; // 2 minutes
      const sampleRate = ctx.sampleRate;
      const buffer = ctx.createBuffer(2, duration * sampleRate, sampleRate);
      
      // Generate a simple lofi-like pattern
      for (let channel = 0; channel < 2; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
          // Simple chord progression based on BPM
          const beatTime = (60 / track.bpm) * sampleRate;
          const beatInSong = Math.floor(i / beatTime) % 4;
          const frequency = [220, 246, 261, 293][beatInSong]; // A minor progression
          
          // Add some character with harmonics
          const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
          const harmonic = Math.sin(4 * Math.PI * frequency * i / sampleRate) * 0.1;
          const sub = Math.sin(Math.PI * frequency * i / sampleRate) * 0.2;
          
          // Add some "lofi" character - slight bitcrush and warmth
          const bitcrush = Math.floor(sample * 8) / 8;
          const warmth = (sample + harmonic + sub + bitcrush) * 0.7;
          
          // Add gentle fade in/out
          const fadeIn = Math.min(1, i / (sampleRate * 2));
          const fadeOut = Math.max(0, 1 - (i - channelData.length + sampleRate * 2) / (sampleRate * 2));
          
          channelData[i] = warmth * fadeIn * fadeOut * (channel === 0 ? 1 : 0.9); // Slight stereo difference
        }
      }
      
      this._buffer = buffer;
      this._currentTrack = track;
    } catch (error) {
      console.error(`Failed to load lofi track ${trackId}:`, error);
      throw error;
    }
  }

  /** Play the currently loaded track */
  async play(): Promise<void> {
    if (!this._audioContext || !this._buffer) {
      throw new Error("No audio context or loaded buffer");
    }

    // Stop current playback if any
    this.stop();

    // Create new source
    this._source = this._audioContext.createBufferSource();
    this._source.buffer = this._buffer;
    this._source.loop = true;
    if (this._gainNode) {
      this._source.connect(this._gainNode);
    }
    
    // Start playback
    this._source.start(0);
    this._isPlaying = true;
  }

  /** Stop playback */
  stop(): void {
    if (this._source) {
      try {
        this._source.stop();
        this._source.disconnect();
      } catch (e) {
        // Source might already be stopped
      }
      this._source = null;
    }
    this._isPlaying = false;
  }

  /** Crossfade to a new track smoothly */
  async crossfadeTo(trackId: string, duration: number = 2): Promise<void> {
    const track = this._tracks.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    if (!this._audioContext) {
      throw new Error("No audio context");
    }

    try {
      // Load the new track
      await this.loadTrack(trackId);
      
      if (!this._buffer) {
        throw new Error("Failed to load track buffer");
      }

      // If nothing is playing, just start the new track
      if (!this._isPlaying || !this._source) {
        await this.play();
        return;
      }

      // Create crossfade
      const nextSource = this._audioContext.createBufferSource();
      nextSource.buffer = this._buffer;
      nextSource.loop = true;
      
      // Create gain node for crossfade
      const nextGain = this._audioContext.createGain();
      nextGain.gain.value = 0;
      
      // Connect nodes
      nextSource.connect(nextGain);
      nextGain.connect(this._crossfadeGain!);
      
      // Start next source
      nextSource.start(0);
      
      // Crossfade
      const currentTime = this._audioContext.currentTime;
      this._gainNode!.gain.linearRampToValueAtTime(0, currentTime + duration);
      nextGain.gain.linearRampToValueAtTime(this._volume, currentTime + duration);
      
      // Clean up after crossfade
      setTimeout(() => {
        if (this._source) {
          try {
            this._source.stop();
            this._source.disconnect();
          } catch (e) {}
        }
        this._source = nextSource;
        this._gainNode!.gain.value = this._volume;
        nextGain.disconnect();
      }, duration * 1000);
      
      this._currentTrack = track;
    } catch (error) {
      console.error(`Failed to crossfade to track ${trackId}:`, error);
      throw error;
    }
  }

  /** Get audio node for connecting to main audio system */
  getAudioNode(): GainNode {
    if (!this._crossfadeGain) {
      throw new Error('Crossfade gain node not initialized');
    }
    return this._crossfadeGain;
  }

  /** Update for integration with main audio analysis */
  update(): void {
    // This can be used for any real-time lofi processing
    // For now, the main audio system will analyze the output
  }

  /** Get track by mood */
  getTrackByMood(mood: LofiTrack["mood"]): LofiTrack | null {
    const tracks = this._tracks.filter(t => t.mood === mood);
    return tracks.length > 0 ? tracks[Math.floor(Math.random() * tracks.length)] : null;
  }

  /** Get a random track */
  getRandomTrack(): LofiTrack {
    return this._tracks[Math.floor(Math.random() * this._tracks.length)];
  }
}
