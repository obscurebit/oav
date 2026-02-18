import { test, expect } from "@playwright/test";

const PRESETS = [
  "noir", "vaporwave", "glitch_art", "underwater", "fire", "ice",
  "psychedelic", "minimal", "cosmic", "industrial", "dream", "nightmare",
  "crystal", "organic", "digital", "zen", "storm", "aurora", "lava", "void", "reset"
];

// Type declaration for the global OAV object
declare global {
  interface Window {
    __OAV__?: {
      applyPreset?: (preset: string) => void;
      gpuParticles?: {
        clear?: () => void;
      };
    };
  }
}

test.describe("Preset Visual Analysis", () => {
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

  PRESETS.forEach(preset => {
    test(`${preset} preset visual verification`, async ({ page }) => {
      console.log(`Testing preset: ${preset}`);
      
      // Apply the preset
      await page.evaluate((presetName) => {
        if (window.__OAV__?.applyPreset) {
          window.__OAV__.applyPreset(presetName);
        }
      }, preset);
      
      // Wait for preset to apply
      await page.waitForTimeout(2000);
      
      // Take screenshot
      const screenshot = await page.screenshot({
        path: `e2e/screenshots/preset-${preset}.png`,
        fullPage: false
      });
      
      // Analyze the screenshot for basic visual characteristics
      const analysis = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return { error: "No canvas found" };
        
        const ctx = canvas.getContext("2d");
        if (!ctx) return { error: "No 2D context" };
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Calculate basic color statistics
        let totalR = 0, totalG = 0, totalB = 0;
        let brightness = 0;
        let contrast = 0;
        let pixelCount = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;
          
          totalR += r;
          totalG += g;
          totalB += b;
          brightness += (r + g + b) / 3;
          pixelCount++;
        }
        
        const avgR = totalR / pixelCount;
        const avgG = totalG / pixelCount;
        const avgB = totalB / pixelCount;
        const avgBrightness = brightness / pixelCount;
        
        // Calculate contrast (simplified)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;
          const pixelBrightness = (r + g + b) / 3;
          contrast += Math.abs(pixelBrightness - avgBrightness);
        }
        contrast /= pixelCount;
        
        return {
          avgColor: { r: avgR, g: avgG, b: avgB },
          avgBrightness,
          contrast,
          pixelCount
        };
      });
      
      console.log(`${preset} analysis:`, analysis);
      
      // Basic validation - screenshot should exist and have content
      expect(screenshot).toBeTruthy();
      expect(analysis.avgBrightness).toBeGreaterThan(0);
      expect(analysis.avgBrightness).toBeLessThan(1);
      expect(analysis.contrast).toBeGreaterThan(0);
    });
  });

  test("Fire preset specific validation", async ({ page }) => {
    console.log("Testing fire preset specifically");
    
    // Apply fire preset
    await page.evaluate(() => {
      if (window.__OAV__?.applyPreset) {
        window.__OAV__.applyPreset("fire");
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({
      path: "e2e/screenshots/fire-preset-detailed.png",
      fullPage: false
    });
    
    // Check fire-specific characteristics
    const fireAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return { error: "No canvas found" };
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return { error: "No 2D context" };
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Fire should have high red/orange content
      let redPixels = 0;
      let orangePixels = 0;
      let yellowPixels = 0;
      let totalPixels = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        
        totalPixels++;
        
        // Red dominant (r > g + b * 0.5)
        if (r > g + b * 0.5 && r > 0.6) redPixels++;
        
        // Orange (high r, medium g, low b)
        if (r > 0.7 && g > 0.3 && g < 0.7 && b < 0.3) orangePixels++;
        
        // Yellow (high r, high g, low b)
        if (r > 0.7 && g > 0.7 && b < 0.3) yellowPixels++;
      }
      
      return {
        redPercentage: (redPixels / totalPixels) * 100,
        orangePercentage: (orangePixels / totalPixels) * 100,
        yellowPercentage: (yellowPixels / totalPixels) * 100,
        totalPixels
      };
    });
    
    console.log("Fire color analysis:", fireAnalysis);
    
    // Fire should have significant red/orange/yellow content
    if (fireAnalysis && fireAnalysis.redPercentage !== undefined) {
      expect(fireAnalysis.redPercentage + fireAnalysis.orangePercentage + fireAnalysis.yellowPercentage).toBeGreaterThan(30);
    } else {
      console.warn("Fire analysis failed:", fireAnalysis);
      expect(fireAnalysis).not.toHaveProperty("error");
    }
  });

  test("Ice preset specific validation", async ({ page }) => {
    console.log("Testing ice preset specifically");
    
    // Apply ice preset
    await page.evaluate(() => {
      if (window.__OAV__?.applyPreset) {
        window.__OAV__.applyPreset("ice");
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({
      path: "e2e/screenshots/ice-preset-detailed.png",
      fullPage: false
    });
    
    // Check ice-specific characteristics
    const iceAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return { error: "No canvas found" };
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return { error: "No 2D context" };
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Ice should have high blue/white content and low red
      let bluePixels = 0;
      let whitePixels = 0;
      let redPixels = 0;
      let totalPixels = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        
        totalPixels++;
        
        // Blue dominant (b > r + g * 0.5)
        if (b > r + g * 0.5 && b > 0.6) bluePixels++;
        
        // White/ice (all channels high)
        if (r > 0.8 && g > 0.8 && b > 0.8) whitePixels++;
        
        // Red (should be low for ice)
        if (r > 0.6) redPixels++;
      }
      
      return {
        bluePercentage: (bluePixels / totalPixels) * 100,
        whitePercentage: (whitePixels / totalPixels) * 100,
        redPercentage: (redPixels / totalPixels) * 100,
        totalPixels
      };
    });
    
    console.log("Ice color analysis:", iceAnalysis);
    
    // Ice should have high blue/white content and low red
    if (iceAnalysis && iceAnalysis.bluePercentage !== undefined) {
      expect(iceAnalysis.bluePercentage + iceAnalysis.whitePercentage).toBeGreaterThan(30);
      expect(iceAnalysis.redPercentage).toBeLessThan(20);
    } else {
      console.warn("Ice analysis failed:", iceAnalysis);
      expect(iceAnalysis).not.toHaveProperty("error");
    }
  });
});
