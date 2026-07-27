import { defineConfig, devices } from "@playwright/test";

// The three widths the design is signed off at. A page is done when it matches tests/baseline/ at
// all three — the baselines are produced from the .dc.html export by scripts/baseline.mjs.
const WIDTHS = [390, 768, 1440];

export default defineConfig({
  testDir: "tests",
  snapshotPathTemplate: "tests/baseline/{arg}-{projectName}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3000",
    deviceScaleFactor: 1,
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0, animations: "disabled" },
  },
  projects: WIDTHS.map((width) => ({
    name: `w${width}`,
    use: { ...devices["Desktop Chrome"], viewport: { width, height: 900 }, deviceScaleFactor: 1 },
  })),
  webServer: {
    command: "npm run dev",
    url: process.env.BASE_URL ?? "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
});
