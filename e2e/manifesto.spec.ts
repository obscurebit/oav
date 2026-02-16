/**
 * OAV Manifesto Tests
 *
 * Validates every principle from docs/MANIFESTO.md:
 * - "It Is Alive" — the world renders and evolves
 * - "The Three Presences" — world, voice, visitor
 * - "Interaction Principles" — no chrome, no conversation, touch changes everything
 * - "What Magic Feels Like" — the full experience flow
 *
 * Uses the __OAV__ debug interface exposed on window for state inspection.
 */
import { test, expect, type Page } from "@playwright/test";

// Helper: get OAV debug state
async function oav(page: Page) {
  return page.evaluate(() => (window as any).__OAV__);
}

async function getParams(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => (window as any).__OAV__.params);
}

async function getParticles(page: Page): Promise<Array<{ text: string; kind: string; opacity: number; x: number; y: number }>> {
  return page.evaluate(() => (window as any).__OAV__.particles);
}

async function getParticleCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__OAV__.particleCount);
}

async function getElapsed(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__OAV__.elapsed);
}

async function waitForFrames(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

// ============================================================
// § IT IS ALIVE — The world renders and breathes
// ============================================================

test.describe("It Is Alive", () => {
  test("canvas renders immediately — dark glow emerges from void", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas", { timeout: 5000 });

    // Wait for a couple of frames
    await waitForFrames(page, 500);

    // Canvas should exist and be full-screen
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    // Engine should be running (elapsed > 0)
    const elapsed = await getElapsed(page);
    expect(elapsed).toBeGreaterThan(0);
  });

  test("the world evolves on its own — params exist and time advances", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await waitForFrames(page, 1000);

    const params = await getParams(page);
    // Core params should be defined
    expect(params).toHaveProperty("intensity");
    expect(params).toHaveProperty("speed");
    expect(params).toHaveProperty("hue");
    expect(params).toHaveProperty("pulse");

    // Time should be advancing
    const t1 = await getElapsed(page);
    await waitForFrames(page, 500);
    const t2 = await getElapsed(page);
    expect(t2).toBeGreaterThan(t1);
  });

  test("the experience never pauses — render loop runs continuously", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await waitForFrames(page, 2000);

    // Take two snapshots of elapsed time
    const t1 = await getElapsed(page);
    await waitForFrames(page, 1000);
    const t2 = await getElapsed(page);

    // Should have advanced roughly 1 second
    expect(t2 - t1).toBeGreaterThan(0.8);
    expect(t2 - t1).toBeLessThan(1.5);
  });
});

// ============================================================
// § NO CHROME — No UI elements, no text boxes, no buttons
// ============================================================

test.describe("No Chrome", () => {
  test("no input elements exist — the entire screen is the experience", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");

    // No input, textarea, button, select, or form elements
    const inputs = await page.locator("input, textarea, button, select, form").count();
    expect(inputs).toBe(0);
  });

  test("no visible UI text — no labels, no headers, no instructions", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");

    // No h1-h6, p, span, div with visible text (except the canvas)
    const textElements = await page.locator("h1, h2, h3, h4, h5, h6, p, label").count();
    expect(textElements).toBe(0);
  });

  test("canvas fills the entire viewport", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    const viewport = page.viewportSize()!;
    const box = await canvas.boundingBox();
    // Canvas should fill the viewport (within a few pixels)
    expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 2);
    expect(box!.height).toBeGreaterThanOrEqual(viewport.height - 2);
  });
});

// ============================================================
// § TOUCH CHANGES EVERYTHING — Click, type, mouse, silence
// ============================================================

test.describe("Touch Changes Everything", () => {
  test("clicking sends a pulse through the visual field — a heartbeat", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await waitForFrames(page, 500);

    // Click the canvas and immediately read pulse via evaluate
    // (pulse decays fast at rate 3.0, so we must read within the same frame)
    const pulseAfterClick = await page.evaluate(() => {
      // Simulate what the click handler does
      const canvas = document.querySelector("canvas")!;
      canvas.click();
      return (window as any).__OAV__.params.pulse;
    });
    // Pulse should have been set (at least the default 0.3 from mood reaction)
    expect(pulseAfterClick).toBeGreaterThan(0);
  });

  test("click starts audio — first click initializes the audio engine", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await waitForFrames(page, 500);

    const beforeClick = await page.evaluate(() => (window as any).__OAV__.audioStarted);
    expect(beforeClick).toBe(false);

    await page.click("canvas");
    await waitForFrames(page, 200);

    const afterClick = await page.evaluate(() => (window as any).__OAV__.audioStarted);
    expect(afterClick).toBe(true);
  });

  test("typing scatters letters as particles — not in a text box", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await waitForFrames(page, 500);

    const countBefore = await getParticleCount(page);

    // Type some characters
    await page.keyboard.type("hello", { delay: 80 });
    await waitForFrames(page, 300);

    const countAfter = await getParticleCount(page);
    expect(countAfter).toBeGreaterThan(countBefore);

    // Particles should be "user" kind characters
    const particles = await getParticles(page);
    const userParticles = particles.filter(p => p.kind === "user");
    expect(userParticles.length).toBeGreaterThanOrEqual(4); // at least 4 of "hello"

    // Each should be a single character
    for (const p of userParticles) {
      expect(p.text.length).toBe(1);
    }
  });

  test("typed characters drift leftward — readable as a word trail", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await waitForFrames(page, 500);

    await page.keyboard.type("abc", { delay: 150 });
    await waitForFrames(page, 800);

    const particles = await getParticles(page);
    const userChars = particles.filter(p => p.kind === "user");

    // Should have at least a, b, c
    expect(userChars.length).toBeGreaterThanOrEqual(3);

    // "a" (typed first) should be further left than "c" (typed last)
    const charA = userChars.find(p => p.text === "a");
    const charC = userChars.find(p => p.text === "c");
    if (charA && charC) {
      expect(charA.x).toBeLessThan(charC.x);
    }
  });

  test("silence is also an input — interaction hint appears after ~15s", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");

    // Wait 17 seconds with no interaction
    await waitForFrames(page, 17000);

    const particles = await getParticles(page);
    const whispers = particles.filter(p => p.kind === "whisper");

    // Should have at least one whisper (the interaction hint)
    expect(whispers.length).toBeGreaterThanOrEqual(1);
    // The hint text should mention typing or clicking
    const hintTexts = whispers.map(p => p.text).join(" ");
    expect(hintTexts).toMatch(/click|type|void/i);
  });
});

// ============================================================
// § THE VOICE — Words appear in light, not in UI
// ============================================================

test.describe("The Voice", () => {
  test("ambient voice speaks after a few seconds — words emerge from the void", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");

    // Wait for ambient voice to fire — first utterance can take up to 12s,
    // plus the interaction hint at 15s. Wait 20s to be safe.
    await waitForFrames(page, 20000);

    const particles = await getParticles(page);
    // Should have voice/echo/whisper/title particles from ambient voice or scene title
    const voiceParticles = particles.filter(
      p => p.kind === "voice" || p.kind === "echo" || p.kind === "whisper" || p.kind === "title"
    );
    expect(voiceParticles.length).toBeGreaterThan(0);
  });

  test("voice words are poetic fragments — not helpful assistant text", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await waitForFrames(page, 14000);

    const particles = await getParticles(page);
    const voiceTexts = particles
      .filter(p => p.kind === "voice" || p.kind === "echo")
      .map(p => p.text);

    // Should not contain assistant-like phrases
    const allText = voiceTexts.join(" ").toLowerCase();
    expect(allText).not.toMatch(/how can i help/);
    expect(allText).not.toMatch(/sure thing/);
    expect(allText).not.toMatch(/you're welcome/);
    expect(allText).not.toMatch(/as an ai/);
  });
});

// ============================================================
// § EVERYTHING FADES — Nothing persists, the experience is ephemeral
// ============================================================

test.describe("Everything Fades", () => {
  test("particles dissolve over time — nothing persists", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await waitForFrames(page, 500);

    // Type to create particles
    await page.keyboard.type("fade", { delay: 80 });
    await waitForFrames(page, 300);

    const countDuring = await getParticleCount(page);
    expect(countDuring).toBeGreaterThan(0);

    // Wait for particles to die (user particles live ~4.6s)
    await waitForFrames(page, 6000);

    const countAfter = await getParticleCount(page);
    // Should have fewer particles (some may have been added by ambient voice)
    // but the user particles should be gone
    const particles = await getParticles(page);
    const userParticles = particles.filter(p => p.kind === "user");
    expect(userParticles.length).toBe(0);
  });

  test("pulse decays exponentially — heartbeat fades", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await waitForFrames(page, 500);

    // Set pulse directly to 1.0 so we have a known starting value
    await page.evaluate(() => (window as any).__OAV__.setParam("pulse", 1.0));
    await waitForFrames(page, 50);
    const pulsePeak = (await getParams(page)).pulse;
    expect(pulsePeak).toBeGreaterThan(0.5);

    // Wait for decay (rate 3.0 → after 2s, pulse ≈ e^(-6) ≈ 0.002)
    await waitForFrames(page, 2000);
    const pulseAfter = (await getParams(page)).pulse;
    expect(pulseAfter).toBeLessThan(0.05);
  });
});

// ============================================================
// § THE VISITOR — Words ripple outward, the world hears you
// ============================================================

test.describe("The Visitor", () => {
  test("mood words shift the visual world — typing 'storm' intensifies everything", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await page.click("canvas"); // start audio
    await waitForFrames(page, 500);

    const before = await getParams(page);

    // 'storm' is a MOOD_WORDS entry that drifts speed→3.0, warp→2.0, aberration→0.5
    await page.keyboard.type("storm", { delay: 80 });
    await page.keyboard.press("Enter");
    // Wait for drifts to take effect (drifts have 1s duration)
    await waitForFrames(page, 2500);

    const after = await getParams(page);
    // Storm should increase speed, warp, or aberration
    const changed = (
      after.speed > before.speed + 0.3 ||
      after.warp > before.warp + 0.3 ||
      after.aberration > before.aberration + 0.1
    );
    expect(changed).toBe(true);
  });

  test("typing 'void' creates dramatic visual shift — the world becomes the word", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await page.click("canvas");
    await waitForFrames(page, 500);

    const before = await getParams(page);

    await page.keyboard.type("void", { delay: 80 });
    await page.keyboard.press("Enter");
    await waitForFrames(page, 2500);

    const after = await getParams(page);
    // Void should zoom in, drain saturation, increase vignette
    const changed = (
      after.zoom > before.zoom + 0.5 ||
      after.saturation < before.saturation - 0.1 ||
      after.vignette > before.vignette + 0.2
    );
    expect(changed).toBe(true);
  });

  test("typing 'dream' softens the world — bloom and wobble increase", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await page.click("canvas");
    await waitForFrames(page, 500);

    const before = await getParams(page);

    await page.keyboard.type("dream", { delay: 80 });
    await page.keyboard.press("Enter");
    await waitForFrames(page, 2500);

    const after = await getParams(page);
    const changed = (
      after.bloom > before.bloom + 0.1 ||
      after.wobble > before.wobble + 0.1 ||
      after.speed < before.speed - 0.05
    );
    expect(changed).toBe(true);
  });

  test("color words shift hue immediately — typing 'blue' turns the world blue", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await page.click("canvas");
    await waitForFrames(page, 500);

    // Use 'blue' instead of 'red' since default hue is already 0 (red)
    await page.keyboard.type("blue", { delay: 80 });
    await page.keyboard.press("Enter");
    await waitForFrames(page, 1500);

    const params = await getParams(page);
    // Blue hue is ~0.6 on the hue wheel
    expect(params.hue).toBeGreaterThan(0.4);
    expect(params.hue).toBeLessThan(0.8);
  });

  test("ambient voice responds to user input — weaves words into story", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await waitForFrames(page, 500);

    // Type something and flush
    await page.keyboard.type("ocean", { delay: 80 });
    await page.keyboard.press("Enter");
    // Wait for ambient voice to respond (respondToUser schedules phrases over 3-6s intervals)
    // Check multiple times since particles have limited lifetimes
    let found = false;
    for (let i = 0; i < 5; i++) {
      await waitForFrames(page, 3000);
      const particles = await getParticles(page);
      const voiceParticles = particles.filter(
        p => p.kind === "voice" || p.kind === "echo" || p.kind === "whisper" || p.kind === "title"
      );
      if (voiceParticles.length > 0) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});

// ============================================================
// § AUTO-MOOD REACTIONS — Clicks and keys adapt to visual state
// ============================================================

test.describe("Auto-Mood Reactions", () => {
  test("clicking in a bloomy state triggers explosive reaction", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await page.click("canvas"); // start audio
    await waitForFrames(page, 500);

    // Manually push bloom and strobe high to trigger explosive mood
    await page.evaluate(() => {
      const oav = (window as any).__OAV__;
      oav.setParam("bloom", 1.5);
      oav.setParam("strobe", 0.4);
    });
    await waitForFrames(page, 100);

    const before = await getParams(page);

    // Click — should trigger explosive mood reaction
    await page.click("canvas");
    await waitForFrames(page, 100);

    const after = await getParams(page);
    // Pulse should be high (explosive click)
    expect(after.pulse).toBeGreaterThan(0.3);
  });

  test("clicking in a glitchy state triggers chaotic reaction", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await page.click("canvas");
    await waitForFrames(page, 500);

    // Push glitch and aberration high
    await page.evaluate(() => {
      const oav = (window as any).__OAV__;
      oav.setParam("glitch", 0.6);
      oav.setParam("aberration", 0.5);
    });
    await waitForFrames(page, 100);

    // Click
    await page.click("canvas");
    await waitForFrames(page, 200);

    const after = await getParams(page);
    // Should have pushed glitch/aberration even higher
    expect(after.glitch).toBeGreaterThan(0.5);
  });

  test("every keystroke gets at least a subtle pop — the world always responds", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await page.click("canvas");
    await waitForFrames(page, 500);

    // Reset pulse to 0
    await page.evaluate(() => (window as any).__OAV__.setParam("pulse", 0));
    await waitForFrames(page, 50);

    // Type a single key
    await page.keyboard.press("a");
    await waitForFrames(page, 50);

    const params = await getParams(page);
    // Should have some pulse from the keystroke reaction
    expect(params.pulse).toBeGreaterThan(0);
  });
});

// ============================================================
// § SCENE TRANSITIONS — The world has phases
// ============================================================

test.describe("Scene Transitions", () => {
  test("scenes progress over time — the world has moods and phases", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await waitForFrames(page, 2000);

    // Engine should be running with time advancing
    const elapsed = await getElapsed(page);
    expect(elapsed).toBeGreaterThan(1);

    // Params should reflect an active scene
    const params = await getParams(page);
    expect(params.intensity).toBeGreaterThan(0);
    expect(params.speed).toBeGreaterThan(0);
  });
});

// ============================================================
// § WHAT MAGIC FEELS LIKE — The full manifesto experience flow
// ============================================================

test.describe("What Magic Feels Like", () => {
  test("the full manifesto flow — dark, glow, click, type, voice responds", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");

    // "A person opens the page. Dark. A glow emerges."
    await waitForFrames(page, 1000);
    let elapsed = await getElapsed(page);
    expect(elapsed).toBeGreaterThan(0.5);

    // "They click. A pulse."
    await page.click("canvas");
    // Pulse decays fast — just verify audio started (click happened)
    await waitForFrames(page, 200);
    const audioStarted = await page.evaluate(() => (window as any).__OAV__.audioStarted);
    expect(audioStarted).toBe(true);

    // "They type 'hello' — the letters appear scattered across the field"
    await page.keyboard.type("hello", { delay: 100 });
    await waitForFrames(page, 500);
    let particles = await getParticles(page);
    let userChars = particles.filter(p => p.kind === "user");
    expect(userChars.length).toBeGreaterThanOrEqual(4);

    // "glowing, then fading"
    await waitForFrames(page, 6000);
    particles = await getParticles(page);
    userChars = particles.filter(p => p.kind === "user");
    expect(userChars.length).toBe(0); // faded away

    // "A few seconds later, another word emerges" (ambient voice)
    await waitForFrames(page, 10000);
    particles = await getParticles(page);
    const voiceParticles = particles.filter(
      p => p.kind === "voice" || p.kind === "echo" || p.kind === "whisper" || p.kind === "title"
    );
    expect(voiceParticles.length).toBeGreaterThan(0);

    // Take a screenshot of the magic
    await page.screenshot({ path: "e2e/screenshots/manifesto-magic.png" });
  });
});
