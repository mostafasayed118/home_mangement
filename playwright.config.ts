import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    video: "on",
    screenshot: "off",
    trace: "off",
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  outputDir: "./demo-output",
  reporter: [["list"]],
  projects: [
    {
      name: "demo",
      use: {
        browserName: "chromium",
        launchOptions: {
          headless: true,
        },
      },
    },
  ],
});
