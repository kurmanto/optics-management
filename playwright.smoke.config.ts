import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  timeout: 20_000,
  retries: process.env.CI ? 1 : 0,
  grep: /@smoke/,

  // Smoke tests are read-only — safe to run in parallel.
  // Workers: 2 avoids overwhelming the dev server while still halving wall time.
  // Login tests that increment failedLoginAttempts use separate accounts and
  // are isolated enough that parallel execution doesn't cause flakiness.
  fullyParallel: true,
  workers: 2,

  // Lightweight setup: skips DB seed, warms routes in parallel
  globalSetup: "./e2e/smoke-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"]]
    : [["html", { open: "on-failure" }], ["list"]],

  projects: [
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/admin.json",
      },
      dependencies: ["auth-setup"],
    },
    // Firefox omitted — smoke runs Chromium only
  ],
});
