/**
 * Inventory Analytics — /inventory/analytics
 * Tests headings, key sections render.
 */

import { test, expect } from "@playwright/test";

test.describe("Inventory Analytics", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/inventory/analytics");
    await page.waitForLoadState("networkidle");
  });

  test("renders Inventory Analytics heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Inventory Analytics" })).toBeVisible();
  });

  test("Dead Stock & Aging Report section visible", async ({ page }) => {
    await expect(page.getByText(/dead stock/i).first()).toBeVisible();
  });

  test("Best Sellers section visible", async ({ page }) => {
    await expect(page.getByText(/best sellers/i).first()).toBeVisible();
  });

  test("Worst Sellers section visible", async ({ page }) => {
    await expect(page.getByText(/worst sellers/i).first()).toBeVisible();
  });

  test("ABC Analysis section visible", async ({ page }) => {
    await expect(page.getByText(/abc analysis/i).first()).toBeVisible();
  });
});
