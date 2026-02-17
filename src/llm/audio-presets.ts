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
  }
};
