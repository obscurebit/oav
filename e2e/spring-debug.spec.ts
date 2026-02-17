/**
 * Quick Spring System Debug Test
 */

import { test, expect } from '@playwright/test';

test('debug spring system', async ({ page }) => {
  console.log('🔍 Starting spring system debug...');
  
  // Capture console logs
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Springs]')) {
      consoleMessages.push(text);
      console.log('📝', text);
    }
  });
  
  console.log('🌐 Navigating to app...');
  await page.goto('http://localhost:5175');
  
  // Wait for app to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  console.log('\n🎯 Checking spring system state...');
  
  // Check if spring system exists and get its state
  const springState = await page.evaluate(() => {
    const oav = (window as any).__OAV__;
    if (!oav) return { error: 'No __OAV__ object found' };
    
    const springs = oav.gpuSprings;
    if (!springs) return { error: 'No gpuSprings found' };
    
    return {
      nodeCount: springs.nodeCount,
      springCount: springs.springCount,
      drawLines: springs.drawLines,
      drawNodes: springs.drawNodes,
      color: springs.color,
      gravity: springs.gravity,
      damping: springs.damping
    };
  });
  
  console.log('\n📊 Spring System State:', springState);
  
  // Take a screenshot
  await page.screenshot({ path: 'e2e/screenshots/spring-debug-initial.png' });
  console.log('📸 Screenshot saved as spring-debug-initial.png');
  
  // Try to clear springs and see if that fixes the visual issue
  console.log('\n🧹 Attempting to clear spring system...');
  await page.evaluate(() => {
    const oav = (window as any).__OAV__;
    if (oav?.gpuSprings) {
      oav.gpuSprings.clear();
    }
  });
  
  await page.waitForTimeout(1000);
  
  // Take another screenshot after clearing
  await page.screenshot({ path: 'e2e/screenshots/spring-debug-after-clear.png' });
  console.log('📸 Screenshot after clear saved as spring-debug-after-clear.png');
  
  // Check state after clearing
  const springStateAfterClear = await page.evaluate(() => {
    const oav = (window as any).__OAV__;
    if (!oav) return { error: 'No __OAV__ object found' };
    
    const springs = oav.gpuSprings;
    if (!springs) return { error: 'No gpuSprings found' };
    
    return {
      nodeCount: springs.nodeCount,
      springCount: springs.springCount,
      drawLines: springs.drawLines,
      drawNodes: springs.drawNodes
    };
  });
  
  console.log('\n📊 Spring System State After Clear:', springStateAfterClear);
  
  console.log('\n📋 Console Messages Found:');
  consoleMessages.forEach(msg => console.log('  ', msg));
  
  if (consoleMessages.length === 0) {
    console.log('  No [Springs] messages found - spring system not creating logs');
  }
  
  // Test jello preset to see if that creates the pink lines
  console.log('\n🎨 Testing jello preset...');
  await page.evaluate(() => {
    const oav = (window as any).__OAV__;
    if (oav?.toolBridge) {
      oav.toolBridge.execute([{
        id: 'test-jello',
        type: 'function',
        function: { 
          name: 'apply_preset', 
          arguments: JSON.stringify({ preset: 'jello' }) 
        }
      }]);
    }
  });
  
  await page.waitForTimeout(2000);
  
  const springStateAfterJello = await page.evaluate(() => {
    const oav = (window as any).__OAV__;
    if (!oav) return { error: 'No __OAV__ object found' };
    
    const springs = oav.gpuSprings;
    if (!springs) return { error: 'No gpuSprings found' };
    
    return {
      nodeCount: springs.nodeCount,
      springCount: springs.springCount,
      drawLines: springs.drawLines,
      drawNodes: springs.drawNodes,
      color: springs.color
    };
  });
  
  console.log('\n📊 Spring System State After Jello:', springStateAfterJello);
  
  await page.screenshot({ path: 'e2e/screenshots/spring-debug-jello.png' });
  console.log('📸 Screenshot after jello saved as spring-debug-jello.png');
});
