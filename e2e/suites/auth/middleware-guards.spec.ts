/**
 * Middleware Guards Spec
 * Verifies that protected routes require authentication and
 * public routes are accessible without auth.
 */

import { test, expect } from "@playwright/test";

// Run WITHOUT auth state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Protected Route Guards", () => {
  const protectedRoutes = [
    "/dashboard",
    "/customers",
    "/orders",
    "/orders/board",
    "/inventory",
    "/forms",
    "/invoices",
    "/settings",
    "/inventory/vendors",
    "/inventory/purchase-orders",
    "/inventory/analytics",
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users to /login`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL(/\/login/);
      expect(page.url()).toContain("/login");
    });
  }

  test("redirect includes ?from= param with the original path", async ({ page }) => {
    await page.goto("/customers");
    await page.waitForURL(/\/login/);
    // URL may encode the path as %2Fcustomers — decode before asserting
    expect(decodeURIComponent(page.url())).toContain("from=/customers");
  });
});

test.describe("Public Routes — No Auth Required", () => {
  // These need a real token — we'll just verify they don't redirect to login
  // The token itself might show a "not found" or "expired" page, but NOT a login redirect
  test("/f/[fake-token] is accessible without auth (no login redirect)", async ({ page }) => {
    const response = await page.goto("/f/fake-token-for-e2e-test");
    // Should NOT redirect to /login — may show 404 or expired page
    expect(page.url()).not.toContain("/login");
  });

  test("/intake/[fake-token] is accessible without auth (no login redirect)", async ({ page }) => {
    await page.goto("/intake/fake-token-for-e2e-test");
    expect(page.url()).not.toContain("/login");
  });

  test("/login page is accessible without auth", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).not.toBe(404);
    await expect(page.getByText("Mint Vision Optique")).toBeVisible();
  });

  test("/api/health is accessible without auth", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
  });
});
