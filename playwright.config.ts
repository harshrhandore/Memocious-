import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  reporter: [["list"], ["json", { outputFile: "evidence/playwright.json" }]],
  workers: 1,
  webServer: [
    {
      command: "npm run start",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "node scripts/admin-ui-preview.mjs",
      url: "http://127.0.0.1:4174",
      // The fixture bundles the current editor and reads this build's CSS hashes.
      reuseExistingServer: false,
    },
  ],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? "/usr/bin/chromium",
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile-chromium",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
