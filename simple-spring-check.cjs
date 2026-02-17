#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function quickSpringCheck() {
  console.log('🔍 Quick Spring System Check...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console logs
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('[Springs]') || text.includes('spring') || text.includes('gpuSprings')) {
        console.log('📝', text);
      }
    });
    
    console.log('🌐 Opening app...');
    
    // Try to navigate with shorter timeout
    try {
      await page.goto('http://localhost:5175', { 
        waitUntil: 'domcontentloaded',
        timeout: 5000 
      });
    } catch (err) {
      console.log('⚠️  Navigation timeout, but continuing...');
    }
    
    // Wait a bit for any initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n🎯 Checking spring system...');
    
    // Check spring state
    const springState = await page.evaluate(() => {
      try {
        const oav = window.__OAV__;
        if (!oav) return { error: 'No __OAV__ object' };
        
        const springs = oav.gpuSprings;
        if (!springs) return { error: 'No gpuSprings' };
        
        return {
          nodeCount: springs.nodeCount,
          springCount: springs.springCount,
          drawLines: springs.drawLines,
          drawNodes: springs.drawNodes,
          color: springs.color
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('📊 Spring State:', springState);
    
    if (springState.error) {
      console.log('❌ Error:', springState.error);
    } else if (springState.nodeCount > 0) {
      console.log('⚠️  ISSUE FOUND: Spring mesh has', springState.nodeCount, 'nodes');
      console.log('🎨 Color:', springState.color);
      console.log('📐 Lines enabled:', springState.drawLines);
      
      // Check if it's the problematic pink color
      const isPink = springState.color[0] > 0.5 && springState.color[1] < 0.5 && springState.color[2] > 0.5;
      if (isPink) {
        console.log('🔴 PINK COLOR DETECTED - This causes "broken pink lines"!');
      }
      
      // Try to clear it
      console.log('🧹 Clearing springs...');
      await page.evaluate(() => {
        const oav = window.__OAV__;
        if (oav?.gpuSprings) {
          oav.gpuSprings.clear();
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const afterClear = await page.evaluate(() => {
        const oav = window.__OAV__;
        if (!oav?.gpuSprings) return { error: 'No gpuSprings' };
        return { nodeCount: oav.gpuSprings.nodeCount };
      });
      
      console.log('📊 After clear:', afterClear);
      
    } else {
      console.log('✅ No spring mesh - this is correct');
    }
    
    // Take screenshot
    try {
      await page.screenshot({ path: 'spring-check-screenshot.png' });
      console.log('📸 Screenshot saved');
    } catch (e) {
      console.log('⚠️  Screenshot failed:', e.message);
    }
    
    console.log('\n📋 Recent console logs:');
    logs.slice(-10).forEach(log => console.log('  ', log));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

quickSpringCheck().catch(console.error);
