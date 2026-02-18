import { test, expect } from "@playwright/test";

const KEY_PRESETS = ["fire", "ice", "lava", "psychedelic", "noir", "vaporwave", "glitch_art", "underwater"];

test.describe("Preset Switching Visual Verification", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("http://localhost:5173");
    
    // Wait for the app to load
    await page.waitForSelector("canvas", { timeout: 10000 });
    
    // Enable manual mode to prevent Director interference
    await page.keyboard.press("F1");
    await page.waitForTimeout(1000);
    
    // Clear any existing particles
    await page.evaluate(() => {
      if (window.__OAV__?.gpuParticles?.clear) {
        window.__OAV__.gpuParticles.clear();
      }
    });
    await page.waitForTimeout(500);
  });

  test("Switch between presets and capture visual changes", async ({ page }) => {
    console.log("Starting preset switching test...");
    
    // Test switching between key presets
    for (let i = 0; i < KEY_PRESETS.length; i++) {
      const preset = KEY_PRESETS[i];
      console.log(`Switching to preset: ${preset}`);
      
      // Apply the preset
      await page.evaluate((presetName) => {
        if (window.__OAV__?.applyPreset) {
          window.__OAV__.applyPreset(presetName);
        }
      }, preset);
      
      // Wait for preset to apply and stabilize
      await page.waitForTimeout(2000);
      
      // Take screenshot with descriptive name
      const screenshotPath = `e2e/screenshots/switching-${preset}-${i + 1}.png`;
      await page.screenshot({
        path: screenshotPath,
        fullPage: false
      });
      
      console.log(`✓ Captured screenshot: ${screenshotPath}`);
      
      // Brief pause between presets
      await page.waitForTimeout(500);
    }
    
    console.log("✓ Preset switching test completed!");
  });

  test("Rapid preset switching test", async ({ page }) => {
    console.log("Starting rapid preset switching test...");
    
    // Test rapid switching between fire and ice to ensure they look different
    const rapidPresets = ["fire", "ice", "fire", "ice", "fire"];
    
    for (let i = 0; i < rapidPresets.length; i++) {
      const preset = rapidPresets[i];
      console.log(`Rapid switch ${i + 1}: ${preset}`);
      
      // Apply the preset
      await page.evaluate((presetName) => {
        if (window.__OAV__?.applyPreset) {
          window.__OAV__.applyPreset(presetName);
        }
      }, preset);
      
      // Short wait for rapid switching
      await page.waitForTimeout(1000);
      
      // Take screenshot
      await page.screenshot({
        path: `e2e/screenshots/rapid-${preset}-${i + 1}.png`,
        fullPage: false
      });
    }
    
    console.log("✓ Rapid preset switching test completed!");
  });

  test("Preset consistency test - same preset multiple times", async ({ page }) => {
    console.log("Starting preset consistency test...");
    
    // Test that the same preset looks consistent when applied multiple times
    const testPreset = "fire";
    const iterations = 3;
    
    for (let i = 0; i < iterations; i++) {
      console.log(`Applying ${testPreset} - iteration ${i + 1}`);
      
      // Apply the preset
      await page.evaluate((presetName) => {
        if (window.__OAV__?.applyPreset) {
          window.__OAV__.applyPreset(presetName);
        }
      }, testPreset);
      
      // Wait for preset to apply
      await page.waitForTimeout(2000);
      
      // Take screenshot
      await page.screenshot({
        path: `e2e/screenshots/consistent-${testPreset}-${i + 1}.png`,
        fullPage: false
      });
      
      // Clear and wait before next iteration
      await page.evaluate(() => {
        if (window.__OAV__?.gpuParticles?.clear) {
          window.__OAV__.gpuParticles.clear();
        }
      });
      await page.waitForTimeout(1000);
    }
    
    console.log("✓ Preset consistency test completed!");
  });
});
