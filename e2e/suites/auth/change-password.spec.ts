/**
 * Change Password Spec
 * Tests the password change form on the settings page.
 * Note: ChangePasswordForm labels are NOT linked to inputs via htmlFor/id,
 * so we use input[name=...] selectors instead of getByLabel.
 */

import { test, expect } from "@playwright/test";

test.describe("Change Password", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL("/settings");
  });

  test("change password form is visible on settings page", async ({ page }) => {
    // Use getByRole("heading") to avoid strict-mode violations from parent elements
    // that also contain "change password" in their innerText.
    await expect(page.getByRole("heading", { name: /change password/i })).toBeVisible();
    await expect(page.locator('input[name="currentPassword"]')).toBeVisible();
    await expect(page.locator('input[name="newPassword"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await page.locator('input[name="currentPassword"]').fill("staff1234");
    await page.locator('input[name="newPassword"]').fill("newpassword123");
    await page.locator('input[name="confirmPassword"]').fill("differentpassword");
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByText(/do not match/i)).toBeVisible({ timeout: 5000 });
  });

  test("shows error when new password is too short (< 8 chars)", async ({ page }) => {
    await page.locator('input[name="currentPassword"]').fill("staff1234");
    // Remove minLength attribute to allow short password to reach server validation
    await page.evaluate(() => {
      const input = document.querySelector('input[name="newPassword"]') as HTMLInputElement;
      if (input) input.removeAttribute("minlength");
      const confirm = document.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
      if (confirm) confirm.removeAttribute("minlength");
    });
    await page.locator('input[name="newPassword"]').fill("short");
    await page.locator('input[name="confirmPassword"]').fill("short");
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible({ timeout: 5000 });
  });

  test("shows error when current password is wrong", async ({ page }) => {
    await page.locator('input[name="currentPassword"]').fill("wrongpassword");
    await page.locator('input[name="newPassword"]').fill("newpassword123");
    await page.locator('input[name="confirmPassword"]').fill("newpassword123");
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByText(/incorrect/i)).toBeVisible({ timeout: 5000 });
  });
});
