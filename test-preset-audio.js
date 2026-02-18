/**
 * Test Preset Audio Enhancement
 * 
 * Run this in the browser console to test the new preset-specific audio transitions.
 */

window.testPresetAudio = {
  
  // Test all preset audio transitions
  testAllPresets: function() {
    console.log("🎵 Testing all preset audio transitions...");
    
    const presets = [
      // Intense/Energetic
      'fire', 'lightning', 'storm', 'nightmare', 'electric_storm', 'fireworks',
      // Cold/Cool
      'ice', 'aurora', 'crystal', 'underwater',
      // Warm/Organic
      'lava', 'organic', 'dream',
      // Psychedelic/Abstract
      'psychedelic', 'vaporwave', 'glitch_art', 'cosmic',
      // Industrial/Mechanical
      'industrial', 'digital', 'minimal', 'noir',
      // Calm/Peaceful
      'zen',
      // Special effects
      'sparkle_field', 'jello', 'cloth'
    ];
    
    let index = 0;
    
    const testNext = () => {
      if (index >= presets.length) {
        console.log("✅ All preset audio tests completed!");
        return;
      }
      
      const preset = presets[index];
      console.log(`🎨 Testing preset: ${preset}`);
      
      // Apply preset via tool bridge
      const toolCall = {
        id: "test-audio-" + Date.now(),
        type: "function",
        function: { 
          name: "apply_preset", 
          arguments: JSON.stringify({ preset: preset, intensity_scale: 1.0 }) 
        }
      };
      
      window.__OAV__.toolBridge.execute([toolCall]);
      
      index++;
      
      // Test next preset after 3 seconds
      setTimeout(testNext, 3000);
    };
    
    // Start testing
    testNext();
  },
  
  // Test specific preset categories
  testCategory: function(category) {
    const categories = {
      intense: ['fire', 'lightning', 'storm', 'nightmare', 'electric_storm'],
      cool: ['ice', 'aurora', 'crystal', 'underwater'],
      warm: ['lava', 'organic', 'dream'],
      psychedelic: ['psychedelic', 'vaporwave', 'glitch_art', 'cosmic'],
      industrial: ['industrial', 'digital', 'minimal', 'noir'],
      calm: ['zen']
    };
    
    const presets = categories[category];
    if (!presets) {
      console.error(`❌ Unknown category: ${category}`);
      console.log("Available categories:", Object.keys(categories));
      return;
    }
    
    console.log(`🎵 Testing ${category} presets...`);
    
    let index = 0;
    const testNext = () => {
      if (index >= presets.length) {
        console.log(`✅ ${category} category tests completed!`);
        return;
      }
      
      const preset = presets[index];
      console.log(`🎨 Testing ${category}: ${preset}`);
      
      const toolCall = {
        id: "test-category-" + Date.now(),
        type: "function",
        function: { 
          name: "apply_preset", 
          arguments: JSON.stringify({ preset: preset, intensity_scale: 1.0 }) 
        }
      };
      
      window.__OAV__.toolBridge.execute([toolCall]);
      
      index++;
      setTimeout(testNext, 2500);
    };
    
    testNext();
  },
  
  // Compare before/after audio
  compareAudio: function(preset) {
    console.log(`🔊 Comparing audio for preset: ${preset}`);
    
    // First, test the old generic audio (default kick)
    console.log("🔵 Before (generic audio):");
    window.__OAV__.audio.triggerKick(0.5);
    
    // Wait 2 seconds, then test new preset audio
    setTimeout(() => {
      console.log("🔴 After (preset-specific audio):");
      
      const toolCall = {
        id: "compare-audio-" + Date.now(),
        type: "function",
        function: { 
          name: "apply_preset", 
          arguments: JSON.stringify({ preset: preset, intensity_scale: 1.0 }) 
        }
      };
      
      window.__OAV__.toolBridge.execute([toolCall]);
    }, 2000);
  },
  
  // Test manual mode preset audio
  testManualMode: function() {
    console.log("🎛️ Testing preset audio in manual mode...");
    
    // Enable manual mode
    window.__OAV__.manualMode.enable();
    
    // Test a few different presets
    const testPresets = ['fire', 'ice', 'psychedelic', 'industrial', 'zen'];
    let index = 0;
    
    const testNext = () => {
      if (index >= testPresets.length) {
        console.log("✅ Manual mode preset audio tests completed!");
        window.__OAV__.manualMode.disable();
        return;
      }
      
      const preset = testPresets[index];
      console.log(`🎛️ Manual mode test: ${preset}`);
      
      // Apply preset (this should trigger the new audio)
      const toolCall = {
        id: "manual-audio-" + Date.now(),
        type: "function",
        function: { 
          name: "apply_preset", 
          arguments: JSON.stringify({ preset: preset, intensity_scale: 1.0 }) 
        }
      };
      
      window.__OAV__.toolBridge.execute([toolCall]);
      
      index++;
      setTimeout(testNext, 3000);
    };
    
    testNext();
  }
};

console.log("🎵 Preset audio test script loaded!");
console.log("Available tests:");
console.log("- window.testPresetAudio.testAllPresets() - Test all presets");
console.log("- window.testPresetAudio.testCategory('intense') - Test specific category");
console.log("- window.testPresetAudio.compareAudio('fire') - Compare before/after");
console.log("- window.testPresetAudio.testManualMode() - Test in manual mode");
console.log("\nAvailable categories: intense, cool, warm, psychedelic, industrial, calm");
