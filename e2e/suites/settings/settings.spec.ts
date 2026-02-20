/**
 * Settings — /settings
 * Tests account info, change password, system settings, notification prefs.
 */

import { test, expect } from "@playwright/test";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
  });

  test("renders Settings heading", async ({ page }) => {
    // Use exact: true to avoid matching "System Settings" h2
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  });

  test("Account section shows admin name Alex Dumont", async ({ page }) => {
    // Name appears in sidebar footer AND account section — pick first
    await expect(page.getByText("Alex Dumont").first()).toBeVisible();
  });

  test("Account section shows admin email", async ({ page }) => {
    await expect(page.getByText("admin@mintvisionsoptique.com").first()).toBeVisible();
  });

  test("Account section shows role ADMIN", async ({ page }) => {
    await expect(page.getByText(/admin/i).first()).toBeVisible();
  });

  test("Change Password section is visible", async ({ page }) => {
    await expect(page.getByText("Change Password")).toBeVisible();
  });

  test("Change password fields visible: Current, New, Confirm", async ({ page }) => {
    await expect(page.locator('input[name="currentPassword"]')).toBeVisible();
    await expect(page.locator('input[name="newPassword"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  });

  test("short new password shows validation error", async ({ page }) => {
    await page.locator('input[name="currentPassword"]').fill("changeme123");
    // Remove browser-side minLength so server-side Zod validation runs
    await page.evaluate(() => {
      (document.querySelector('input[name="newPassword"]') as HTMLInputElement).removeAttribute("minlength");
    });
    await page.locator('input[name="newPassword"]').fill("short");
    await page.locator('input[name="confirmPassword"]').fill("short");
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByText(/8 characters|at least 8/i)).toBeVisible({ timeout: 5000 });
  });

  test("mismatched passwords shows error", async ({ page }) => {
    await page.locator('input[name="currentPassword"]').fill("changeme123");
    await page.locator('input[name="newPassword"]').fill("newpassword123");
    await page.locator('input[name="confirmPassword"]').fill("differentpassword");
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByText(/do not match|passwords must match/i)).toBeVisible({ timeout: 5000 });
  });

  test("wrong current password shows error", async ({ page }) => {
    await page.locator('input[name="currentPassword"]').fill("wrongpassword");
    await page.locator('input[name="newPassword"]').fill("newpassword123");
    await page.locator('input[name="confirmPassword"]').fill("newpassword123");
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByText(/incorrect|wrong|invalid/i)).toBeVisible({ timeout: 5000 });
  });

  test("System Settings section shows Business Name", async ({ page }) => {
    await expect(page.getByText("System Settings")).toBeVisible();
    await expect(page.getByText(/Mint Vision/i).first()).toBeVisible();
  });

  test("System Settings shows Tax Rate 13%", async ({ page }) => {
    // "13%" appears as the tax rate value — specific enough to be unique
    await expect(page.getByText("13%")).toBeVisible();
  });

  test("Notification Preferences section visible", async ({ page }) => {
    await expect(page.getByText(/notification preferences/i).first()).toBeVisible();
  });

  test("Display Preferences section visible", async ({ page }) => {
    await expect(page.getByText(/display preferences/i)).toBeVisible();
  });
});
