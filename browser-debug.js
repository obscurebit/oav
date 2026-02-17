// Browser Console Debug Script for Spring System
// Copy and paste this into the browser console (F12) when the app is running

console.log('🔍 Spring System Debug - Starting...');

// Check if __OAV__ exists
const oav = window.__OAV__;
if (!oav) {
  console.error('❌ No __OAV__ object found - app not loaded properly');
} else {
  console.log('✅ __OAV__ object found');
  
  // Check spring system
  const springs = oav.gpuSprings;
  if (!springs) {
    console.error('❌ No gpuSprings found - spring system not initialized');
  } else {
    console.log('✅ Spring system found');
    
    const state = {
      nodeCount: springs.nodeCount,
      springCount: springs.springCount,
      drawLines: springs.drawLines,
      drawNodes: springs.drawNodes,
      color: springs.color,
      gravity: springs.gravity,
      damping: springs.damping
    };
    
    console.log('📊 Spring System State:', state);
    
    if (state.nodeCount > 0) {
      console.warn('⚠️  ISSUE: Spring mesh has', state.nodeCount, 'nodes!');
      console.warn('💡 This could be causing "broken pink lines"');
      console.warn('🎨 Color:', state.color, '- pink/purple?');
      console.warn('📐 Lines enabled:', state.drawLines);
      
      if (state.color[0] > 0.5 && state.color[1] < 0.5 && state.color[2] > 0.5) {
        console.error('🔴 PINK COLOR DETECTED - This is likely the "broken pink lines" issue!');
      }
      
      if (state.drawLines && state.nodeCount > 0) {
        console.error('🔴 LINE RENDERING ENABLED - Combined with pink color, this causes visual artifacts!');
      }
    } else {
      console.log('✅ No spring mesh - this is correct for initial state');
    }
  }
}

// Check for any console messages about springs
console.log('📋 Checking for recent [Springs] console messages...');
console.log('💡 Look above for any [Springs] log messages that indicate automatic mesh creation');

// Function to clear springs (run this if you see issues)
window.clearSprings = () => {
  const oav = window.__OAV__;
  if (oav?.gpuSprings) {
    const beforeCount = oav.gpuSprings.nodeCount;
    oav.gpuSprings.clear();
    const afterCount = oav.gpuSprings.nodeCount;
    console.log(`🧹 Cleared springs: ${beforeCount} → ${afterCount} nodes`);
    return afterCount === 0;
  }
  return false;
};

// Function to test jello preset
window.testJello = () => {
  const oav = window.__OAV__;
  if (oav?.toolBridge) {
    console.log('🎨 Applying jello preset...');
    oav.toolBridge.execute([{
      id: 'test-jello',
      type: 'function',
      function: { 
        name: 'apply_preset', 
        arguments: JSON.stringify({ preset: 'jello' }) 
      }
    }]);
    
    setTimeout(() => {
      const springs = oav.gpuSprings;
      if (springs) {
        console.log('📊 After jello:', {
          nodeCount: springs.nodeCount,
          color: springs.color,
          drawLines: springs.drawLines
        });
      }
    }, 1000);
  }
};

console.log('🔧 Debug functions available:');
console.log('  clearSprings() - Clear the spring mesh');
console.log('  testJello() - Apply jello preset to test');
console.log('📸 Take screenshots before/after to compare visual results');
