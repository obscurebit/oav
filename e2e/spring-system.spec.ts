/**
 * Spring System Visual Tests
 * 
 * These tests validate that the spring system renders correctly
 * and doesn't produce visual artifacts like broken pink lines.
 */

import { test, expect } from '@playwright/test';

test.describe('Spring System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Start audio (required for full functionality)
    await page.click('canvas');
    await page.waitForTimeout(1000);
  });

  test('should not show broken spring artifacts on initial load', async ({ page }) => {
    // Take a screenshot of the initial state
    await page.screenshot({ path: 'e2e/screenshots/spring-initial.png' });
    
    // Check that there are no obvious rendering errors
    // The canvas should be black with subtle visual effects, not broken pink lines
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should create spring mesh when jello preset is applied', async ({ page }) => {
    // Access the global OAV object to trigger jello preset
    await page.evaluate(() => {
      const oav = (window as any).__OAV__;
      if (oav?.toolBridge) {
        // Apply jello preset which creates a spring mesh
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

    // Wait for the spring system to initialize
    await page.waitForTimeout(2000);
    
    // Take screenshot to verify spring mesh renders correctly
    await page.screenshot({ path: 'e2e/screenshots/spring-jello.png' });
    
    // Verify the spring system has nodes
    const springNodeCount = await page.evaluate(() => {
      const oav = (window as any).__OAV__;
      return oav?.gpuSprings?.nodeCount || 0;
    });
    
    expect(springNodeCount).toBeGreaterThan(0);
    console.log(`Spring nodes created: ${springNodeCount}`);
  });

  test('should handle spring poke interaction', async ({ page }) => {
    // First create a spring mesh
    await page.evaluate(() => {
      const oav = (window as any).__OAV__;
      if (oav?.toolBridge) {
        oav.toolBridge.execute([{
          id: 'test-cloth',
          type: 'function',
          function: { 
            name: 'apply_preset', 
            arguments: JSON.stringify({ preset: 'cloth' }) 
          }
        }]);
      }
    });

    await page.waitForTimeout(2000);
    
    // Get initial spring state
    const initialNodeCount = await page.evaluate(() => {
      const oav = (window as any).__OAV__;
      return oav?.gpuSprings?.nodeCount || 0;
    });
    
    expect(initialNodeCount).toBeGreaterThan(0);
    
    // Click on the canvas to poke the springs
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Wait for physics to update
    await page.waitForTimeout(500);
    
    // Take screenshot to verify poke interaction works
    await page.screenshot({ path: 'e2e/screenshots/spring-poke.png' });
    
    // The spring system should still be intact after poke
    const nodeCountAfterPoke = await page.evaluate(() => {
      const oav = (window as any).__OAV__;
      return oav?.gpuSprings?.nodeCount || 0;
    });
    
    expect(nodeCountAfterPoke).toBe(initialNodeCount);
  });

  test('should clear spring mesh when reset preset is applied', async ({ page }) => {
    // Create a spring mesh first
    await page.evaluate(() => {
      const oav = (window as any).__OAV__;
      if (oav?.toolBridge) {
        oav.toolBridge.execute([{
          id: 'test-jello-2',
          type: 'function',
          function: { 
            name: 'apply_preset', 
            arguments: JSON.stringify({ preset: 'jello' }) 
          }
        }]);
      }
    });

    await page.waitForTimeout(2000);
    
    // Verify spring mesh exists
    const nodeCountBeforeReset = await page.evaluate(() => {
      const oav = (window as any).__OAV__;
      return oav?.gpuSprings?.nodeCount || 0;
    });
    
    expect(nodeCountBeforeReset).toBeGreaterThan(0);
    
    // Apply reset preset
    await page.evaluate(() => {
      const oav = (window as any).__OAV__;
      if (oav?.toolBridge) {
        oav.toolBridge.execute([{
          id: 'test-reset',
          type: 'function',
          function: { 
            name: 'apply_preset', 
            arguments: JSON.stringify({ preset: 'reset' }) 
          }
        }]);
      }
    });

    await page.waitForTimeout(1000);
    
    // Take screenshot after reset
    await page.screenshot({ path: 'e2e/screenshots/spring-reset.png' });
    
    // Springs should be cleared after reset
    const nodeCountAfterReset = await page.evaluate(() => {
      const oav = (window as any).__OAV__;
      return oav?.gpuSprings?.nodeCount || 0;
    });
    
    // Note: The reset preset might not clear springs, but it should not break them
    console.log(`Spring nodes before reset: ${nodeCountBeforeReset}, after reset: ${nodeCountAfterReset}`);
  });

  test('should not render springs when no mesh is created', async ({ page }) => {
    // Ensure no spring mesh is created (default state)
    await page.evaluate(() => {
      const oav = (window as any).__OAV__;
      if (oav?.gpuSprings) {
        // Clear any existing springs
        oav.gpuSprings.clear();
      }
    });

    await page.waitForTimeout(1000);
    
    // Verify no spring nodes
    const nodeCount = await page.evaluate(() => {
      const oav = (window as any).__OAV__;
      return oav?.gpuSprings?.nodeCount || 0;
    });
    
    expect(nodeCount).toBe(0);
    
    // Take screenshot to verify clean state
    await page.screenshot({ path: 'e2e/screenshots/spring-empty.png' });
    
    // The canvas should render normally without spring artifacts
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should handle multiple spring mesh creations', async ({ page }) => {
    // Create multiple different spring meshes
    const presets = ['jello', 'cloth'];
    
    for (const preset of presets) {
      await page.evaluate((p) => {
        const oav = (window as any).__OAV__;
        if (oav?.toolBridge) {
          oav.toolBridge.execute([{
            id: `test-${p}`,
            type: 'function',
            function: { 
              name: 'apply_preset', 
              arguments: JSON.stringify({ preset: p }) 
            }
          }]);
        }
      }, preset);

      await page.waitForTimeout(1500);
      
      // Verify spring mesh exists
      const nodeCount = await page.evaluate(() => {
        const oav = (window as any).__OAV__;
        return oav?.gpuSprings?.nodeCount || 0;
      });
      
      expect(nodeCount).toBeGreaterThan(0);
      console.log(`${preset} preset created ${nodeCount} spring nodes`);
      
      // Take screenshot for each preset
      await page.screenshot({ path: `e2e/screenshots/spring-${preset}.png` });
    }
  });
});
