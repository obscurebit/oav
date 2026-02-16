/**
 * OAV Preset Visual Tests
 *
 * Applies each of the 22 named presets via the __OAV__ debug interface,
 * using immediate param sets (no drift) for deterministic results.
 * Clears text particles before each screenshot for clean visuals.
 */
import { test, expect, type Page } from "@playwright/test";

const PRESETS = [
  "noir",
  "vaporwave",
  "glitch_art",
  "underwater",
  "fire",
  "ice",
  "psychedelic",
  "minimal",
  "cosmic",
  "industrial",
  "dream",
  "nightmare",
  "crystal",
  "organic",
  "digital",
  "zen",
  "storm",
  "aurora",
  "lava",
  "fireworks",
  "void",
  "reset",
];

/** Immediately set all params for a preset (reset first, then preset). No drift. */
async function setPreset(page: Page, preset: string) {
  await page.evaluate((p) => (window as any).__OAV__.setPresetImmediate(p), preset);
}

/** Clear all text particles so screenshots show only the shader. */
async function clearParticles(page: Page) {
  await page.evaluate(() => (window as any).__OAV__.clearParticles());
}

/** Get current param snapshot. */
async function getParams(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => (window as any).__OAV__.params);
}

test.describe("Visual Presets", () => {
  for (const preset of PRESETS) {
    test(`preset: ${preset}`, async ({ page }) => {
      await page.goto("/");
      await page.waitForSelector("canvas", { timeout: 5000 });

      // Let the intro scene develop so the shader has visible structure
      await page.waitForTimeout(3000);

      // Apply preset immediately (no drift — instant param set)
      await setPreset(page, preset);

      // Ensure intensity is high enough to be visible in screenshots
      // (some presets like zen/minimal are intentionally dim, so use a floor)
      const params = await getParams(page);
      if (params.intensity < 0.3 && preset !== "void") {
        await page.evaluate(() => (window as any).__OAV__.setParam("intensity", 0.5));
      }

      // Clear any text particles (scene titles, ambient voice)
      await clearParticles(page);

      // Let the shader render a few frames with the new params
      await page.waitForTimeout(600);

      // Clear particles again (in case new ones spawned during wait)
      await clearParticles(page);

      // Verify params are set
      expect(params).toBeDefined();

      // Screenshot
      await page.screenshot({
        path: `e2e/screenshots/preset-${preset}.png`,
        fullPage: false,
      });
    });
  }
});
