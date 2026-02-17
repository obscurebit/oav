# Manual Spring System Debug Guide

Since the automated tools are having issues, here's a step-by-step manual approach to debug the spring system:

## 🎯 Step 1: Open the App

1. Make sure the dev server is running: `npm run dev`
2. Open: `http://localhost:5175` in your browser
3. Press F2 to see the main debug overlay
4. Press F3 to see the audio debug overlay

## 🔍 Step 2: Check Spring State

Open the browser console (F12) and paste this code:

```javascript
// Check spring system state
const oav = window.__OAV__;
const springs = oav?.gpuSprings;

if (!springs) {
  console.error('❌ No spring system found');
} else {
  const state = {
    nodeCount: springs.nodeCount,
    springCount: springs.springCount,
    drawLines: springs.drawLines,
    drawNodes: springs.drawNodes,
    color: springs.color,
    gravity: springs.gravity,
    damping: springs.damping
  };
  
  console.log('📊 Spring State:', state);
  
  if (state.nodeCount > 0) {
    console.warn('⚠️ ISSUE: Spring mesh has', state.nodeCount, 'nodes!');
    
    const isPink = state.color[0] > 0.5 && state.color[1] < 0.5 && state.color[2] > 0.5;
    if (isPink) {
      console.error('🔴 PINK COLOR DETECTED - This causes "broken pink lines"!');
    }
    
    if (state.drawLines) {
      console.error('🔴 LINE RENDERING ENABLED - Combined with pink = visual artifacts!');
    }
  } else {
    console.log('✅ No spring mesh - this is correct');
  }
}
```

## 🧹 Step 3: Clear Springs (if needed)

If you find a spring mesh, clear it:

```javascript
// Clear springs
window.__OAV?.gpuSprings?.clear();
console.log('🧹 Springs cleared');
```

## 🎨 Step 4: Test Jello Preset

```javascript
// Apply jello preset (recreates the issue)
window.__OAV?.toolBridge?.execute([{
  id: 'test-jello',
  type: 'function',
  function: { 
    name: 'apply_preset', 
    arguments: JSON.stringify({ preset: 'jello' }) 
  }
}]);

// Check state after 1 second
setTimeout(() => {
  const springs = window.__OAV?.gpuSprings;
  if (springs) {
    console.log('📊 After jello:', {
      nodeCount: springs.nodeCount,
      color: springs.color,
      drawLines: springs.drawLines
    });
  }
}, 1000);
```

## 📸 Step 5: Take Screenshots

1. Before any changes: `screenshot-initial.png`
2. If spring mesh found: `screenshot-broken.png`
3. After clearing: `screenshot-cleared.png`
4. After jello: `screenshot-jello.png`

## 🔍 What to Look For

**PROBLEM STATE (causes broken pink lines):**
```javascript
{
  nodeCount: 432,           // > 0
  color: [0.8, 0.4, 0.6],  // Pink/purple
  drawLines: true,           // Lines enabled
  drawNodes: false           // No nodes
}
```

**HEALTHY STATE:**
```javascript
{
  nodeCount: 0,             // No mesh
  springCount: 0,
  drawLines: false,
  drawNodes: false
}
```

## 🎯 Expected Results

1. **Initial state**: Should have `nodeCount: 0`
2. **If not**: Something is creating a mesh automatically
3. **Jello preset**: Creates pink mesh with lines - this is expected
4. **Clear function**: Should reset to `nodeCount: 0`

## 🐛 If Issues Found

**Automatic mesh creation:**
- Look for `[Springs] Creating grid:` messages in console
- Check if any code is calling `createGrid()` on startup

**Broken rendering:**
- Pink color + lines enabled = visual artifacts
- Check WebGL state or shader compilation

**Clear not working:**
- `clear()` method might have issues
- Spring data not being reset properly

## 📋 Report Results

Share:
1. Initial spring state
2. Any `[Springs]` console messages
3. Screenshots showing the visual issue
4. Results after clearing and jello test

This will help identify the exact cause of the "broken pink lines" issue!
