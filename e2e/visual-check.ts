/**
 * Visual smoke test — launches the app in Playwright, takes screenshots
 * at key moments to verify rendering is working.
 *
 * Uses headed Chromium with GPU flags to support WebGL 2 rendering.
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const SCREENSHOTS_DIR = join(import.meta.dirname!, "screenshots");
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function run() {
  const browser = await chromium.launch({
    headless: false,
    args: [
      "--use-gl=angle",
      "--use-angle=metal",
      "--enable-gpu-rasterization",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Collect console logs
  const logs: string[] = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[ERROR] ${err.message}`));

  console.log("→ Navigating to http://localhost:5173 ...");
  await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });

  // Wait for canvas to be present
  await page.waitForSelector("canvas", { timeout: 5000 });
  console.log("→ Canvas found.");

  // 1. Initial state — shader rendering, no interaction yet
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, "01-initial-2s.png") });
  console.log("✓ Screenshot: 01-initial-2s.png (shader rendering, no interaction)");

  // 2. Click to start audio + mark interaction
  await page.click("canvas");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, "02-after-click.png") });
  console.log("✓ Screenshot: 02-after-click.png (after click, audio started)");

  // 3. Type some words into the void
  await page.keyboard.type("hello darkness", { delay: 100 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, "03-typing.png") });
  console.log("✓ Screenshot: 03-typing.png (user typing, character particles)");

  // 4. Wait for phrase to flush and particles to drift
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, "04-after-phrase.png") });
  console.log("✓ Screenshot: 04-after-phrase.png (phrase flushed, particles drifting)");

  // 5. Wait for ambient voice to speak
  await page.waitForTimeout(10000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, "05-ambient-voice.png") });
  console.log("✓ Screenshot: 05-ambient-voice.png (ambient voice particles visible)");

  // 6. Wait for scene transition (intro→build ~20-30s) to capture themed title
  console.log("→ Waiting for scene transition + themed title...");
  await page.waitForTimeout(15000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, "06-scene-transition.png") });
  console.log("✓ Screenshot: 06-scene-transition.png (build scene with themed title)");

  // 7. Fresh page — test interaction hint (15s no interaction)
  const page2 = await context.newPage();
  page2.on("console", (msg) => logs.push(`[p2:${msg.type()}] ${msg.text()}`));
  page2.on("pageerror", (err) => logs.push(`[p2:ERROR] ${err.message}`));
  await page2.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
  await page2.waitForSelector("canvas", { timeout: 5000 });

  console.log("→ Waiting 17s for interaction hint on fresh page...");
  await page2.waitForTimeout(17000);
  await page2.screenshot({ path: join(SCREENSHOTS_DIR, "07-interaction-hint.png") });
  console.log("✓ Screenshot: 07-interaction-hint.png (interaction hint whisper)");

  // Print console logs (skip noisy GPU driver messages)
  console.log("\n--- Console logs (filtered) ---");
  for (const log of logs) {
    if (log.includes("GL Driver Message")) continue;
    if (log.includes("GroupMarkerNotSet")) continue;
    if (log.includes("[vite]")) continue;
    console.log(log);
  }

  // Check for real errors (ignore CORS/fetch errors from missing API key)
  const errors = logs.filter(
    (l) =>
      (l.includes("[ERROR]") || l.includes("[error]")) &&
      !l.includes("CORS") &&
      !l.includes("ERR_FAILED") &&
      !l.includes("Failed to fetch")
  );
  if (errors.length > 0) {
    console.log("\n⚠ ERRORS DETECTED:");
    for (const e of errors) console.log("  ", e);
  } else {
    console.log("\n✓ No critical errors detected.");
  }

  await browser.close();
  console.log("\n✓ Done. Screenshots saved to ./screenshots/");
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
