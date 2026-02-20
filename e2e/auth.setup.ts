/**
 * Auth Setup — runs as a Playwright "project" before all test suites.
 * Logs in as admin and staff, saves browser storage state to .auth/.
 * All subsequent test projects use these stored states to skip logging in.
 */

import { test as setup, expect } from "@playwright/test";

setup.describe("Authentication Setup", () => {
  setup("authenticate as admin", async ({ page }) => {
    await page.goto("/login");

    // Verify login page is visible
    await expect(page.getByText("Mint Vision Optique")).toBeVisible();

    await page.getByLabel("Email").fill("admin@mintvisionsoptique.com");
    await page.getByLabel("Password").fill("changeme123");
    await page.getByRole("button", { name: "Sign in" }).click();

    // After login, should land on /dashboard (login action redirects directly)
    await page.waitForURL("/dashboard", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Save admin auth state
    await page.context().storageState({ path: ".auth/admin.json" });
    console.log("✅ Admin session saved to .auth/admin.json");
  });

  setup("authenticate as staff", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("staff@mintvisionsoptique.com");
    await page.getByLabel("Password").fill("staff1234");
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("/dashboard", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Save staff auth state
    await page.context().storageState({ path: ".auth/staff.json" });
    console.log("✅ Staff session saved to .auth/staff.json");
  });
});
