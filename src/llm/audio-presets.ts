/**
 * Audio presets - curated audio parameter combinations for distinct moods.
 * These are applied alongside visual presets for complete audiovisual experiences.
 */

export const AUDIO_PRESETS: Record<string, Partial<Record<string, number>>> = {
  noir: {
    // Audio: dark, moody
    subLevel: 0.4, harmonicLevel: 0.2, noiseLevel: 0.3, padLevel: 0.1,
    filterFreq: 200, lfoRate: 1.0, lfoDepth: 0.2, reverbWet: 0.4, delayTime: 0.3, distortion: 0.1,
    tempo: 80, glitchProb: 0.05
  },
  vaporwave: {
    // Audio: dreamy, nostalgic
    subLevel: 0.3, harmonicLevel: 0.5, noiseLevel: 0.2, padLevel: 0.4,
    filterFreq: 600, lfoRate: 1.5, lfoDepth: 0.2, reverbWet: 0.5, delayTime: 0.4, distortion: 0.0,
    tempo: 90, glitchProb: 0.02
  },
  glitch_art: {
    // Audio: distorted, glitchy
    subLevel: 0.6, harmonicLevel: 0.2, noiseLevel: 0.5, padLevel: 0.0,
    filterFreq: 150, lfoRate: 4.0, lfoDepth: 0.4, reverbWet: 0.1, delayTime: 0.1, distortion: 0.4,
    tempo: 140, glitchProb: 0.3
  },
  underwater: {
    // Audio: underwater, flowing
    subLevel: 0.4, harmonicLevel: 0.6, noiseLevel: 0.1, padLevel: 0.5,
    filterFreq: 800, lfoRate: 1.2, lfoDepth: 0.2, reverbWet: 0.6, delayTime: 0.5, distortion: 0.0
  },
  fire: {
    // Audio: hot, intense
    subLevel: 0.8, harmonicLevel: 0.2, noiseLevel: 0.3, padLevel: 0.0,
    filterFreq: 250, lfoRate: 3.5, lfoDepth: 0.4, reverbWet: 0.1, delayTime: 0.15, distortion: 0.2
  },
  ice: {
    // Audio: cold, icy
    subLevel: 0.2, harmonicLevel: 0.4, noiseLevel: 0.1, padLevel: 0.6,
    filterFreq: 700, lfoRate: 1.0, lfoDepth: 0.15, reverbWet: 0.4, delayTime: 0.4, distortion: 0.0
  },
  psychedelic: {
    // Audio: trippy, resonant
    subLevel: 0.3, harmonicLevel: 0.7, noiseLevel: 0.2, padLevel: 0.4,
    filterFreq: 800, lfoRate: 2.0, lfoDepth: 0.3, reverbWet: 0.4, delayTime: 0.3, distortion: 0.0,
    tempo: 120, glitchProb: 0.1
  },
  minimal: {
    // Audio: clean, minimal
    subLevel: 0.2, harmonicLevel: 0.3, noiseLevel: 0.0, padLevel: 0.1,
    filterFreq: 400, lfoRate: 0.5, lfoDepth: 0.1, reverbWet: 0.1, delayTime: 0.2, distortion: 0.0
  },
  cosmic: {
    // Audio: spacious, ethereal
    subLevel: 0.4, harmonicLevel: 0.6, noiseLevel: 0.1, padLevel: 0.6,
    filterFreq: 1200, lfoRate: 1.5, lfoDepth: 0.2, reverbWet: 0.6, delayTime: 0.4, distortion: 0.0
  },
  industrial: {
    // Audio: mechanical, harsh
    subLevel: 0.6, harmonicLevel: 0.4, noiseLevel: 0.4, padLevel: 0.1,
    filterFreq: 200, lfoRate: 3.0, lfoDepth: 0.4, reverbWet: 0.2, delayTime: 0.1, distortion: 0.3,
    tempo: 100, glitchProb: 0.15
  },
  dream: {
    // Audio: soft, gentle
    subLevel: 0.2, harmonicLevel: 0.5, noiseLevel: 0.05, padLevel: 0.8,
    filterFreq: 600, lfoRate: 0.8, lfoDepth: 0.15, reverbWet: 0.5, delayTime: 0.6, distortion: 0.0
  },
  nightmare: {
    // Audio: distorted, aggressive
    subLevel: 0.8, harmonicLevel: 0.2, noiseLevel: 0.6, padLevel: 0.0,
    filterFreq: 150, lfoRate: 5.0, lfoDepth: 0.6, reverbWet: 0.1, delayTime: 0.05, distortion: 0.5
  },
  crystal: {
    // Audio: clear, bright
    subLevel: 0.3, harmonicLevel: 0.8, noiseLevel: 0.0, padLevel: 0.3,
    filterFreq: 2000, lfoRate: 1.2, lfoDepth: 0.1, reverbWet: 0.3, delayTime: 0.3, distortion: 0.0
  },
  organic: {
    // Audio: natural, flowing
    subLevel: 0.4, harmonicLevel: 0.6, noiseLevel: 0.3, padLevel: 0.5,
    filterFreq: 800, lfoRate: 1.0, lfoDepth: 0.25, reverbWet: 0.4, delayTime: 0.4, distortion: 0.0
  },
  digital: {
    // Audio: electronic, sharp
    subLevel: 0.5, harmonicLevel: 0.7, noiseLevel: 0.2, padLevel: 0.0,
    filterFreq: 1500, lfoRate: 4.0, lfoDepth: 0.3, reverbWet: 0.2, delayTime: 0.2, distortion: 0.2
  },
  zen: {
    // Audio: peaceful, calm
    subLevel: 0.1, harmonicLevel: 0.3, noiseLevel: 0.0, padLevel: 0.6,
    filterFreq: 500, lfoRate: 0.3, lfoDepth: 0.05, reverbWet: 0.3, delayTime: 0.8, distortion: 0.0
  },
  storm: {
    // Audio: turbulent, intense
    subLevel: 0.7, harmonicLevel: 0.3, noiseLevel: 0.5, padLevel: 0.0,
    filterFreq: 300, lfoRate: 6.0, lfoDepth: 0.5, reverbWet: 0.1, delayTime: 0.1, distortion: 0.4
  },
  aurora: {
    // Audio: atmospheric, flowing
    subLevel: 0.3, harmonicLevel: 0.7, noiseLevel: 0.1, padLevel: 0.4,
    filterFreq: 1000, lfoRate: 2.5, lfoDepth: 0.2, reverbWet: 0.6, delayTime: 0.5, distortion: 0.0
  },
  lava: {
    // Audio: hot, intense
    subLevel: 0.8, harmonicLevel: 0.2, noiseLevel: 0.3, padLevel: 0.0,
    filterFreq: 250, lfoRate: 3.5, lfoDepth: 0.4, reverbWet: 0.1, delayTime: 0.15, distortion: 0.2
  },
  fireworks: {
    // Audio: celebratory, bright
    subLevel: 0.5, harmonicLevel: 0.6, noiseLevel: 0.1, padLevel: 0.3,
    filterFreq: 800, lfoRate: 1.8, lfoDepth: 0.1, reverbWet: 0.3, delayTime: 0.2, distortion: 0.0
  },
  jello: {
    // Audio: bouncy, playful
    subLevel: 0.3, harmonicLevel: 0.4, noiseLevel: 0.2, padLevel: 0.5,
    filterFreq: 600, lfoRate: 2.0, lfoDepth: 0.3, reverbWet: 0.2, delayTime: 0.3, distortion: 0.0
  },
  cloth: {
    // Audio: soft, flowing
    subLevel: 0.2, harmonicLevel: 0.5, noiseLevel: 0.1, padLevel: 0.7,
    filterFreq: 700, lfoRate: 1.0, lfoDepth: 0.15, reverbWet: 0.4, delayTime: 0.4, distortion: 0.0
  },
  sparkle_field: {
    // Audio: magical, twinkling
    subLevel: 0.4, harmonicLevel: 0.8, noiseLevel: 0.0, padLevel: 0.6,
    filterFreq: 1500, lfoRate: 3.0, lfoDepth: 0.2, reverbWet: 0.5, delayTime: 0.3, distortion: 0.0
  },
  electric_storm: {
    // Audio: sharp, electric
    subLevel: 0.6, harmonicLevel: 0.4, noiseLevel: 0.4, padLevel: 0.0,
    filterFreq: 1200, lfoRate: 8.0, lfoDepth: 0.6, reverbWet: 0.1, delayTime: 0.1, distortion: 0.6
  },
  lightning: {
    // Audio: electrical, intense
    subLevel: 0.7, harmonicLevel: 0.3, noiseLevel: 0.6, padLevel: 0.0,
    filterFreq: 1000, lfoRate: 10.0, lfoDepth: 0.7, reverbWet: 0.1, delayTime: 0.05, distortion: 0.8,
    tempo: 170, glitchProb: 0.4
  },
  
  // Typing sound presets - focused on rhythm, noise, and percussive elements
  morse_code: {
    // Audio: rhythmic beeps like morse code (focus on rhythm, no ambient)
    subLevel: 0.0, harmonicLevel: 0.0, noiseLevel: 0.0, padLevel: 0.0,  // Clear ambient
    filterFreq: 1200, lfoRate: 4.0, lfoDepth: 0.6, reverbWet: 0.0, delayTime: 0.0, distortion: 0.0,
    tempo: 120, glitchProb: 0.0,
    // Typing-specific parameters
    typingIntensity: 0.8, typingRhythm: 0.9, typingNoise: 0.1
  },
  typewriter: {
    // Audio: mechanical typewriter clicks (focus on percussive noise)
    subLevel: 0.0, harmonicLevel: 0.0, noiseLevel: 0.0, padLevel: 0.0,  // Clear ambient
    filterFreq: 800, lfoRate: 2.5, lfoDepth: 0.3, reverbWet: 0.0, delayTime: 0.0, distortion: 0.2,
    tempo: 100, glitchProb: 0.1,
    // Typing-specific parameters
    typingIntensity: 0.7, typingRhythm: 0.8, typingNoise: 0.4
  },
  subtle_beat: {
    // Audio: gentle background rhythm (minimal typing, soft ambient)
    subLevel: 0.0, harmonicLevel: 0.0, noiseLevel: 0.0, padLevel: 0.0,  // Clear ambient
    filterFreq: 400, lfoRate: 1.0, lfoDepth: 0.2, reverbWet: 0.0, delayTime: 0.0, distortion: 0.0,
    tempo: 80, glitchProb: 0.0,
    // Typing-specific parameters
    typingIntensity: 0.3, typingRhythm: 0.6, typingNoise: 0.0
  },
  impact_beat: {
    // Audio: strong percussive hits (powerful typing, no ambient)
    subLevel: 0.0, harmonicLevel: 0.0, noiseLevel: 0.0, padLevel: 0.0,  // Clear ambient
    filterFreq: 200, lfoRate: 2.0, lfoDepth: 0.5, reverbWet: 0.0, delayTime: 0.0, distortion: 0.1,
    tempo: 110, glitchProb: 0.05,
    // Typing-specific parameters
    typingIntensity: 0.9, typingRhythm: 0.7, typingNoise: 0.2
  },
  static_hiss: {
    // Audio: continuous static noise (ambient focus, no typing)
    subLevel: 0.0, harmonicLevel: 0.0, noiseLevel: 0.6, padLevel: 0.0,
    filterFreq: 300, lfoRate: 0.5, lfoDepth: 0.1, reverbWet: 0.0, delayTime: 0.0, distortion: 0.0,
    tempo: 60, glitchProb: 0.0,
    // Typing-specific parameters
    typingIntensity: 0.0, typingRhythm: 0.0, typingNoise: 0.8
  },
  static_beat: {
    // Audio: static with rhythmic pulses (mixed ambient + typing)
    subLevel: 0.0, harmonicLevel: 0.0, noiseLevel: 0.5, padLevel: 0.0,
    filterFreq: 250, lfoRate: 3.0, lfoDepth: 0.4, reverbWet: 0.0, delayTime: 0.0, distortion: 0.1,
    tempo: 90, glitchProb: 0.1,
    // Typing-specific parameters
    typingIntensity: 0.5, typingRhythm: 0.8, typingNoise: 0.6
  },
  loud_static_beep: {
    // Audio: piercing static beeps (harsh typing focus)
    subLevel: 0.0, harmonicLevel: 0.0, noiseLevel: 0.4, padLevel: 0.0,  // Clear ambient
    filterFreq: 1500, lfoRate: 6.0, lfoDepth: 0.7, reverbWet: 0.0, delayTime: 0.0, distortion: 0.2,
    tempo: 140, glitchProb: 0.2,
    // Typing-specific parameters
    typingIntensity: 0.8, typingRhythm: 0.9, typingNoise: 0.5
  },
  quiet_static_beep: {
    // Audio: soft background static beeps (gentle typing)
    subLevel: 0.0, harmonicLevel: 0.0, noiseLevel: 0.2, padLevel: 0.0,  // Clear ambient
    filterFreq: 1000, lfoRate: 2.0, lfoDepth: 0.3, reverbWet: 0.1, delayTime: 0.0, distortion: 0.0,
    tempo: 70, glitchProb: 0.0,
    // Typing-specific parameters
    typingIntensity: 0.4, typingRhythm: 0.5, typingNoise: 0.3
  },
  raindrops: {
    // Audio: gentle raindrop sounds (ambient focus, soft typing)
    subLevel: 0.0, harmonicLevel: 0.0, noiseLevel: 0.3, padLevel: 0.0,
    filterFreq: 600, lfoRate: 1.5, lfoDepth: 0.2, reverbWet: 0.4, delayTime: 0.0, distortion: 0.0,
    tempo: 85, glitchProb: 0.0,
    // Typing-specific parameters
    typingIntensity: 0.2, typingRhythm: 0.3, typingNoise: 0.4
  },
};

// --- Ambient audio presets - focused on atmospheric soundscapes ---

export const AMBIENT_AUDIO_PRESETS: Record<string, Partial<Record<string, number>>> = {
  noir: {
    // Audio: dark, moody atmosphere
    subLevel: 0.4, harmonicLevel: 0.2, noiseLevel: 0.3, padLevel: 0.1,
    filterFreq: 200, lfoRate: 1.0, lfoDepth: 0.2, reverbWet: 0.4, delayTime: 0.3, distortion: 0.1,
    tempo: 80, glitchProb: 0.05
  },
  vaporwave: {
    // Audio: dreamy, nostalgic atmosphere
    subLevel: 0.3, harmonicLevel: 0.5, noiseLevel: 0.2, padLevel: 0.4,
    filterFreq: 600, lfoRate: 1.5, lfoDepth: 0.2, reverbWet: 0.5, delayTime: 0.4, distortion: 0.0,
    tempo: 90, glitchProb: 0.02
  },
  glitch_art: {
    // Audio: distorted, glitchy atmosphere
    subLevel: 0.6, harmonicLevel: 0.2, noiseLevel: 0.5, padLevel: 0.0,
    filterFreq: 150, lfoRate: 4.0, lfoDepth: 0.4, reverbWet: 0.1, delayTime: 0.1, distortion: 0.4,
    tempo: 140, glitchProb: 0.3
  },
  underwater: {
    // Audio: underwater, flowing atmosphere
    subLevel: 0.4, harmonicLevel: 0.6, noiseLevel: 0.1, padLevel: 0.5,
    filterFreq: 800, lfoRate: 1.2, lfoDepth: 0.2, reverbWet: 0.6, delayTime: 0.5, distortion: 0.0
  },
  fire: {
    // Audio: hot, intense atmosphere
    subLevel: 0.8, harmonicLevel: 0.2, noiseLevel: 0.3, padLevel: 0.0,
    filterFreq: 250, lfoRate: 3.5, lfoDepth: 0.4, reverbWet: 0.1, delayTime: 0.15, distortion: 0.2
  },
  ice: {
    // Audio: cold, icy atmosphere
    subLevel: 0.2, harmonicLevel: 0.4, noiseLevel: 0.1, padLevel: 0.6,
    filterFreq: 700, lfoRate: 1.0, lfoDepth: 0.15, reverbWet: 0.4, delayTime: 0.4, distortion: 0.0
  },
  psychedelic: {
    // Audio: trippy, resonant atmosphere
    subLevel: 0.3, harmonicLevel: 0.7, noiseLevel: 0.2, padLevel: 0.4,
    filterFreq: 800, lfoRate: 2.0, lfoDepth: 0.3, reverbWet: 0.4, delayTime: 0.3, distortion: 0.0,
    tempo: 120, glitchProb: 0.1
  },
  minimal: {
    // Audio: clean, minimal atmosphere
    subLevel: 0.2, harmonicLevel: 0.3, noiseLevel: 0.0, padLevel: 0.1,
    filterFreq: 400, lfoRate: 0.5, lfoDepth: 0.1, reverbWet: 0.1, delayTime: 0.2, distortion: 0.0
  },
  cosmic: {
    // Audio: spacious, ethereal atmosphere
    subLevel: 0.4, harmonicLevel: 0.6, noiseLevel: 0.1, padLevel: 0.6,
    filterFreq: 1200, lfoRate: 1.5, lfoDepth: 0.2, reverbWet: 0.6, delayTime: 0.4, distortion: 0.0
  },
  industrial: {
    // Audio: mechanical, harsh atmosphere
    subLevel: 0.6, harmonicLevel: 0.4, noiseLevel: 0.4, padLevel: 0.1,
    filterFreq: 200, lfoRate: 3.0, lfoDepth: 0.4, reverbWet: 0.2, delayTime: 0.1, distortion: 0.3,
    tempo: 100, glitchProb: 0.15
  },
  dream: {
    // Audio: soft, gentle atmosphere
    subLevel: 0.2, harmonicLevel: 0.5, noiseLevel: 0.05, padLevel: 0.8,
    filterFreq: 600, lfoRate: 0.8, lfoDepth: 0.15, reverbWet: 0.5, delayTime: 0.6, distortion: 0.0
  },
  nightmare: {
    // Audio: distorted, aggressive atmosphere
    subLevel: 0.8, harmonicLevel: 0.2, noiseLevel: 0.6, padLevel: 0.0,
    filterFreq: 150, lfoRate: 5.0, lfoDepth: 0.6, reverbWet: 0.1, delayTime: 0.05, distortion: 0.5
  },
  crystal: {
    // Audio: clear, bright atmosphere
    subLevel: 0.3, harmonicLevel: 0.8, noiseLevel: 0.0, padLevel: 0.3,
    filterFreq: 2000, lfoRate: 1.2, lfoDepth: 0.1, reverbWet: 0.3, delayTime: 0.3, distortion: 0.0
  },
  organic: {
    // Audio: natural, flowing atmosphere
    subLevel: 0.4, harmonicLevel: 0.6, noiseLevel: 0.3, padLevel: 0.5,
    filterFreq: 800, lfoRate: 1.0, lfoDepth: 0.25, reverbWet: 0.4, delayTime: 0.4, distortion: 0.0
  },
  digital: {
    // Audio: electronic, sharp atmosphere
    subLevel: 0.5, harmonicLevel: 0.7, noiseLevel: 0.2, padLevel: 0.0,
    filterFreq: 1500, lfoRate: 4.0, lfoDepth: 0.3, reverbWet: 0.2, delayTime: 0.2, distortion: 0.2
  },
  zen: {
    // Audio: peaceful, calm atmosphere
    subLevel: 0.1, harmonicLevel: 0.3, noiseLevel: 0.0, padLevel: 0.6,
    filterFreq: 500, lfoRate: 0.3, lfoDepth: 0.05, reverbWet: 0.3, delayTime: 0.8, distortion: 0.0
  },
  storm: {
    // Audio: turbulent, intense atmosphere
    subLevel: 0.7, harmonicLevel: 0.3, noiseLevel: 0.5, padLevel: 0.0,
    filterFreq: 300, lfoRate: 6.0, lfoDepth: 0.5, reverbWet: 0.1, delayTime: 0.1, distortion: 0.4
  },
  aurora: {
    // Audio: atmospheric, flowing atmosphere
    subLevel: 0.3, harmonicLevel: 0.7, noiseLevel: 0.1, padLevel: 0.4,
    filterFreq: 1000, lfoRate: 2.5, lfoDepth: 0.2, reverbWet: 0.6, delayTime: 0.5, distortion: 0.0
  },
  lava: {
    // Audio: hot, intense atmosphere
    subLevel: 0.8, harmonicLevel: 0.2, noiseLevel: 0.3, padLevel: 0.0,
    filterFreq: 250, lfoRate: 3.5, lfoDepth: 0.4, reverbWet: 0.1, delayTime: 0.15, distortion: 0.2
  }
};
