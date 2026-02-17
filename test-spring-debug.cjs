/**
 * Simple script to check spring system state
 * Run with: node test-spring-debug.js
 */

const puppeteer = require('puppeteer');

async function checkSpringSystem() {
  console.log('🔍 Starting spring system debug...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console logs
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Springs]')) {
        consoleMessages.push(text);
        console.log('📝', text);
      }
    });
    
    console.log('🌐 Navigating to app...');
    await page.goto('http://localhost:5175', { waitUntil: 'networkidle2' });
    
    // Wait a bit for the app to initialize
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
    await page.screenshot({ path: 'spring-debug-screenshot.png' });
    console.log('📸 Screenshot saved as spring-debug-screenshot.png');
    
    // Try to clear springs and see if that fixes the visual issue
    console.log('\n🧹 Attempting to clear spring system...');
    await page.evaluate(() => {
      const oav = window.__OAV__;
      if (oav?.gpuSprings) {
        oav.gpuSprings.clear();
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Take another screenshot after clearing
    await page.screenshot({ path: 'spring-debug-after-clear.png' });
    console.log('📸 Screenshot after clear saved as spring-debug-after-clear.png');
    
    // Check state after clearing
    const springStateAfterClear = await page.evaluate(() => {
      const oav = window.__OAV__;
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
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

checkSpringSystem().catch(console.error);
