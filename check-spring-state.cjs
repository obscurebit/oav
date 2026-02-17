#!/usr/bin/env node

/**
 * Simple script to check spring system state by making HTTP requests
 * to the running app and evaluating JavaScript in the browser context.
 */

const puppeteer = require('puppeteer');

async function checkSpringSystem() {
  console.log('🔍 Checking spring system state...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Springs]') || text.includes('spring')) {
        console.log('📝', text);
      }
    });
    
    console.log('🌐 Navigating to app...');
    await page.goto('http://localhost:5175', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    // Wait for app to initialize
    await page.waitForTimeout(3000);
    
    console.log('\n🎯 Checking spring system state...');
    
    // Check if spring system exists and get its state
    const springState = await page.evaluate(() => {
      const oav = window.__OAV__;
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
    await page.screenshot({ path: 'spring-state-screenshot.png' });
    console.log('📸 Screenshot saved as spring-state-screenshot.png');
    
    if (springState.error) {
      console.log('❌ Error:', springState.error);
      return;
    }
    
    if (springState.nodeCount > 0) {
      console.log('⚠️  ISSUE DETECTED: Spring mesh has', springState.nodeCount, 'nodes!');
      console.log('💡 This could be causing the "broken pink lines" issue');
      console.log('🔍 Color:', springState.color, '- pink/purple?');
      console.log('🔍 Lines enabled:', springState.drawLines);
      
      // Try to clear it
      console.log('\n🧹 Attempting to clear spring system...');
      await page.evaluate(() => {
        const oav = window.__OAV__;
        if (oav?.gpuSprings) {
          oav.gpuSprings.clear();
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Check state after clearing
      const stateAfterClear = await page.evaluate(() => {
        const oav = window.__OAV__;
        if (!oav?.gpuSprings) return { error: 'No gpuSprings found' };
        
        return {
          nodeCount: oav.gpuSprings.nodeCount,
          springCount: oav.gpuSprings.springCount
        };
      });
      
      console.log('📊 State after clear:', stateAfterClear);
      
      await page.screenshot({ path: 'spring-state-after-clear.png' });
      console.log('📸 Screenshot after clear saved');
      
    } else {
      console.log('✅ No spring mesh found - this is correct for initial state');
    }
    
    // Test jello preset
    console.log('\n🎨 Testing jello preset...');
    await page.evaluate(() => {
      const oav = window.__OAV__;
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
    
    const stateAfterJello = await page.evaluate(() => {
      const oav = window.__OAV__;
      if (!oav?.gpuSprings) return { error: 'No gpuSprings found' };
      
      return {
        nodeCount: oav.gpuSprings.nodeCount,
        springCount: oav.gpuSprings.springCount,
        drawLines: oav.gpuSprings.drawLines,
        color: oav.gpuSprings.color
      };
    });
    
    console.log('📊 State after jello:', stateAfterJello);
    
    await page.screenshot({ path: 'spring-state-jello.png' });
    console.log('📸 Screenshot after jello saved');
    
    if (stateAfterJello.nodeCount > 0) {
      console.log('🎯 Jello creates mesh with', stateAfterJello.nodeCount, 'nodes');
      console.log('🎨 Color:', stateAfterJello.color);
      console.log('📐 Lines enabled:', stateAfterJello.drawLines);
      console.log('💡 If this shows "broken pink lines", the issue is in the jello preset or rendering');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

checkSpringSystem().catch(console.error);
