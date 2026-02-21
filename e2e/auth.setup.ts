/**
 * Auth Setup — runs as a Playwright "project" before all test suites.
 *
 * Session state is now generated PROGRAMMATICALLY in global-setup.ts using
 * HMAC tokens, bypassing browser-based login. This avoids the Next.js dev-mode
 * "UnrecognizedActionError" that occurs when server action IDs change after a
 * .next cache rebuild.
 *
 * These tests simply confirm the .auth files were created and contain a valid
 * mvo_session cookie, so the dependent test projects can start with auth state.
 */

import { test as setup, expect } from "@playwright/test";
import { existsSync } from "fs";
import path from "path";

setup.describe("Authentication Setup", () => {
  setup("authenticate as admin", async ({ page }) => {
    // Auth state created by global-setup.ts — just verify the file exists
    const authFile = path.resolve(".auth/admin.json");
    expect(existsSync(authFile), ".auth/admin.json must exist (created by global-setup)").toBe(true);

    // Navigate to dashboard using the stored session cookie to confirm it works
    await page.context().addCookies(
      JSON.parse(require("fs").readFileSync(authFile, "utf-8")).cookies
    );
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 30_000 });

    console.log("✅ Admin session validated");
  });

  setup("authenticate as staff", async ({ page }) => {
    const authFile = path.resolve(".auth/staff.json");
    expect(existsSync(authFile), ".auth/staff.json must exist (created by global-setup)").toBe(true);

    await page.context().addCookies(
      JSON.parse(require("fs").readFileSync(authFile, "utf-8")).cookies
    );
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 30_000 });

    console.log("✅ Staff session validated");
  });
});
