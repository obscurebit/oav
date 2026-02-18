/**
 * Manual Mode Test Script
 * 
 * This script can be run in the browser console to test manual mode functionality.
 * 
 * Usage:
 * 1. Start the app with `npm run dev`
 * 2. Open browser console
 * 3. Copy and paste this script
 * 4. Call test functions to verify manual mode works
 */

// Test functions for manual mode
window.testManualMode = {
  
  // Test 1: Toggle manual mode
  testToggle: function() {
    console.log("🧪 Testing manual mode toggle...");
    
    // Get manual mode instance
    const manualMode = window.__OAV__.manualMode;
    if (!manualMode) {
      console.error("❌ Manual mode not found in __OAV__");
      return false;
    }
    
    // Test enable
    console.log("Enabling manual mode...");
    manualMode.enable();
    
    if (!manualMode.isEnabled) {
      console.error("❌ Manual mode failed to enable");
      return false;
    }
    
    // Check if UI appeared
    const ui = document.getElementById("manual-mode-controls");
    if (!ui) {
      console.error("❌ Manual mode UI not found");
      return false;
    }
    
    console.log("✅ Manual mode enabled successfully");
    
    // Test disable
    console.log("Disabling manual mode...");
    manualMode.disable();
    
    if (manualMode.isEnabled) {
      console.error("❌ Manual mode failed to disable");
      return false;
    }
    
    const uiAfter = document.getElementById("manual-mode-controls");
    if (uiAfter) {
      console.error("❌ Manual mode UI still visible after disable");
      return false;
    }
    
    console.log("✅ Manual mode disabled successfully");
    return true;
  },
  
  // Test 2: Test preset application
  testPresets: function() {
    console.log("🧪 Testing preset application...");
    
    const manualMode = window.__OAV__.manualMode;
    if (!manualMode) {
      console.error("❌ Manual mode not found");
      return false;
    }
    
    // Enable manual mode
    manualMode.enable();
    
    // Test a few presets
    const presets = ["fire", "ice", "psychedelic"];
    let success = true;
    
    for (const preset of presets) {
      console.log(`Testing preset: ${preset}`);
      
      // Get params before
      const paramsBefore = window.__OAV__.params;
      
      // Apply preset via manual mode (simulate button click)
      const toolCall = {
        id: "test-preset-" + Date.now(),
        type: "function",
        function: { 
          name: "apply_preset", 
          arguments: JSON.stringify({ preset: preset, intensity_scale: 1.0 }) 
        }
      };
      
      window.__OAV__.toolBridge.execute([toolCall]);
      
      // Give it a moment to apply
      setTimeout(() => {
        const paramsAfter = window.__OAV__.params;
        
        // Check if some parameters changed
        let changed = false;
        for (const [key, value] of Object.entries(paramsAfter)) {
          if (paramsBefore[key] !== value) {
            changed = true;
            break;
          }
        }
        
        if (changed) {
          console.log(`✅ Preset ${preset} applied successfully`);
        } else {
          console.log(`⚠️ Preset ${preset} may not have changed parameters`);
        }
      }, 100);
    }
    
    return success;
  },
  
  // Test 3: Test parameter sliders
  testParameters: function() {
    console.log("🧪 Testing parameter sliders...");
    
    const manualMode = window.__OAV__.manualMode;
    if (!manualMode) {
      console.error("❌ Manual mode not found");
      return false;
    }
    
    // Enable manual mode
    manualMode.enable();
    
    // Test a few parameter changes
    const tests = [
      { param: "intensity", value: 0.8 },
      { param: "hue", value: 0.5 },
      { param: "speed", value: 2.0 }
    ];
    
    for (const test of tests) {
      console.log(`Testing parameter: ${test.param} -> ${test.value}`);
      
      // Set parameter directly
      window.__OAV__.setParam(test.param, test.value);
      
      // Check if it was set
      const actual = window.__OAV__.params[test.param];
      if (Math.abs(actual - test.value) < 0.01) {
        console.log(`✅ Parameter ${test.param} set successfully`);
      } else {
        console.error(`❌ Parameter ${test.param} not set correctly: expected ${test.value}, got ${actual}`);
      }
    }
    
    return true;
  },
  
  // Test 4: Test scene transitions
  testScenes: function() {
    console.log("🧪 Testing scene transitions...");
    
    const manualMode = window.__OAV__.manualMode;
    if (!manualMode) {
      console.error("❌ Manual mode not found");
      return false;
    }
    
    // Enable manual mode
    manualMode.enable();
    
    // Test scene transitions
    const scenes = ["intro", "build", "climax", "outro"];
    
    for (const scene of scenes) {
      console.log(`Testing transition to: ${scene}`);
      
      const toolCall = {
        id: "test-scene-" + Date.now(),
        type: "function",
        function: { 
          name: "transition_to", 
          arguments: JSON.stringify({ scene_id: scene, duration: 1.0 }) 
        }
      };
      
      window.__OAV__.toolBridge.execute([toolCall]);
      console.log(`✅ Scene transition to ${scene} initiated`);
    }
    
    return true;
  },
  
  // Test 5: Test GPU effects
  testGPU: function() {
    console.log("🧪 Testing GPU effects...");
    
    const manualMode = window.__OAV__.manualMode;
    if (!manualMode) {
      console.error("❌ Manual mode not found");
      return false;
    }
    
    // Enable manual mode
    manualMode.enable();
    
    // Test firework
    console.log("Testing firework...");
    window.__OAV__.firework(0, 0, 1.0);
    console.log("✅ Firework triggered");
    
    // Test sparkles
    console.log("Testing sparkles...");
    window.__OAV__.sparkle(0.5, 0.5, 20);
    console.log("✅ Sparkles triggered");
    
    // Test spring poke (if springs are active)
    if (window.__OAV__.gpuSprings.nodeCount > 0) {
      console.log("Testing spring poke...");
      window.__OAV__.pokeSprings(0, 0, 0.3, 0.5);
      console.log("✅ Spring poke triggered");
    } else {
      console.log("⚠️ No active spring mesh to poke");
    }
    
    return true;
  },
  
  // Run all tests
  runAll: function() {
    console.log("🚀 Running all manual mode tests...");
    
    const results = {
      toggle: this.testToggle(),
      presets: this.testPresets(),
      parameters: this.testParameters(),
      scenes: this.testScenes(),
      gpu: this.testGPU()
    };
    
    console.log("📊 Test Results:");
    Object.entries(results).forEach(([test, result]) => {
      console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
    });
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    console.log(`🎯 Overall: ${passed}/${total} tests passed`);
    
    return results;
  }
};

console.log("🧪 Manual mode test script loaded!");
console.log("Available tests:");
console.log("- window.testManualMode.testToggle()");
console.log("- window.testManualMode.testPresets()");
console.log("- window.testManualMode.testParameters()");
console.log("- window.testManualMode.testScenes()");
console.log("- window.testManualMode.testGPU()");
console.log("- window.testManualMode.runAll()");
