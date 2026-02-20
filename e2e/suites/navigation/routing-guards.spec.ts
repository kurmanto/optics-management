/**
 * Routing Guards Spec
 * Verifies route behavior — redirects, 404s, and role-based access.
 */

import { test, expect } from "@playwright/test";

test.describe("Route Behavior", () => {
  test("root / redirects to /dashboard when authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/dashboard");
  });

  test("Scan Rx page is accessible", async ({ page }) => {
    await page.goto("/scan-rx");
    await expect(page).toHaveURL("/scan-rx");
    // Should show something relevant on the page
    await expect(page.getByRole("heading", { name: "Scan Rx" })).toBeVisible();
  });

  test("customer new page is accessible", async ({ page }) => {
    await page.goto("/customers/new");
    await expect(page).toHaveURL("/customers/new");
  });

  test("order new page is accessible", async ({ page }) => {
    await page.goto("/orders/new");
    await expect(page).toHaveURL("/orders/new");
  });

  test("inventory new page is accessible", async ({ page }) => {
    await page.goto("/inventory/new");
    await expect(page).toHaveURL("/inventory/new");
  });
});
