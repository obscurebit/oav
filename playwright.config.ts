import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    launchOptions: {
      args: [
        "--use-gl=angle",
        "--use-angle=metal",
        "--enable-gpu-rasterization",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
      ],
    },
  },
  // Don't auto-start the server — user should have `npx vite` running
  webServer: {
    command: "npx vite --port 5173",
    port: 5173,
    reuseExistingServer: true,
    timeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", headless: false },
    },
  ],
});
