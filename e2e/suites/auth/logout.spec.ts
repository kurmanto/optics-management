/**
 * Logout Spec
 * Tests that the logout action clears the session and redirects to /login.
 */

import { test, expect } from "@playwright/test";

test.describe("Logout", () => {
  test("logs out and redirects to /login", async ({ page }) => {
    // Start authenticated (uses storageState from playwright.config.ts project)
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");

    // Find and click the logout / sign-out control in the sidebar
    // NOTE: If there's no explicit logout button in the UI, this will fail.
    //       Check the sidebar for a logout/sign-out button.
    //       BUG TO VERIFY: Confirm logout button exists in sidebar/header.
    const logoutButton = page
      .getByRole("button", { name: /sign out|logout/i })
      .or(page.getByRole("link", { name: /sign out|logout/i }));

    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("after logout, /dashboard redirects to /login", async ({ page, context }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");

    // Perform logout
    const logoutButton = page
      .getByRole("button", { name: /sign out|logout/i })
      .or(page.getByRole("link", { name: /sign out|logout/i }));
    await logoutButton.click();
    await page.waitForURL("/login");

    // Navigate to protected route after logout
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test("mvo_session cookie is cleared after logout", async ({ page, context }) => {
    await page.goto("/dashboard");

    // Logout
    const logoutButton = page
      .getByRole("button", { name: /sign out|logout/i })
      .or(page.getByRole("link", { name: /sign out|logout/i }));
    await logoutButton.click();
    await page.waitForURL("/login");

    // Check cookie is gone
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "mvo_session");
    expect(sessionCookie).toBeUndefined();
  });
});
