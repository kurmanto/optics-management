/**
 * Notifications — Bell icon in portal header
 * Tests popover, empty/non-empty state, mark all read.
 */

import { test, expect } from "@playwright/test";

test.describe("Notifications", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("bell icon button visible with aria-label Notifications", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Notifications" })).toBeVisible();
  });

  test("clicking bell opens notifications popover", async ({ page }) => {
    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByText("Notifications").first()).toBeVisible();
  });

  test("popover shows seeded ORDER_READY notification title", async ({ page }) => {
    await page.getByRole("button", { name: "Notifications" }).click();
    // Seeded notification: "Order Ready for Pickup"
    await expect(page.getByText(/order ready|ready for pickup/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("popover has Mark all read button when there are unread notifications", async ({ page }) => {
    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByRole("button", { name: /mark all read/i })).toBeVisible({ timeout: 8000 });
  });

  test("clicking Mark all read hides the button", async ({ page }) => {
    await page.getByRole("button", { name: "Notifications" }).click();
    const markAllBtn = page.getByRole("button", { name: /mark all read/i });
    await markAllBtn.waitFor({ timeout: 8000 });
    await markAllBtn.click();
    // After marking all read, button should disappear
    await expect(markAllBtn).not.toBeVisible({ timeout: 5000 });
  });

  test("popover closes when clicking outside", async ({ page }) => {
    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByText("Notifications").first()).toBeVisible();
    // Click somewhere outside the popover
    await page.locator("h1").first().click();
    await expect(page.getByRole("button", { name: /mark all read/i })).not.toBeVisible({ timeout: 3000 });
  });
});
