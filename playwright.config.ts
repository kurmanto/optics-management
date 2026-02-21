import { defineConfig, devices } from "@playwright/test";
import path from "path";

// Load .env.test if it exists, otherwise fall back to .env
const envFile = ".env.test";
try {
  require("dotenv").config({ path: path.resolve(__dirname, envFile) });
} catch {
  require("dotenv").config({ path: path.resolve(__dirname, ".env") });
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // sequential — shared database
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // keep at 1; shared DB
  timeout: 45_000,
  expect: { timeout: 15_000 },

  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"]]
    : [["html", { open: "on-failure" }], ["list"]],

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },

  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  webServer: {
    // In CI: use the pre-built production server (starts in ~1s, no JIT).
    // Locally: use dev server and reuse if already running.
    command: process.env.CI ? "PORT=3001 npm run start" : "npm run dev",
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    // Auth setup — runs first and saves auth state for use by test suites
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    // Primary browser: Chromium
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/admin.json",
      },
      dependencies: ["auth-setup"],
    },
    // Secondary: Firefox
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: ".auth/admin.json",
      },
      dependencies: ["auth-setup"],
    },
  ],
});
