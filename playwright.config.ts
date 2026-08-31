import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ quiet: true });

const webPort = 5173;
const webUrl = `http://localhost:${webPort}`;

export default defineConfig({
  outputDir: "test-results",
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { height: 720, width: 1280 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        browser: "chromium",
        viewport: { height: 844, width: 390 },
      },
    },
  ],
  testDir: "./e2e",
  use: {
    baseURL: webUrl,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev:api",
      cwd: ".",
      reuseExistingServer: true,
      url: "http://localhost:3333/health",
    },
    {
      command: "npm run dev:web",
      cwd: ".",
      reuseExistingServer: true,
      url: webUrl,
    },
  ],
});
