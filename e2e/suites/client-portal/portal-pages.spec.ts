/**
 * Client Portal Route Guards & Page Smoke — /my/*
 * Verifies that protected client portal routes redirect to /my/login
 * without a valid mvo_client_session cookie, and that public client
 * routes (/my/login, /my/verify) are accessible without auth.
 */

import { test, expect } from "@playwright/test";

// Client portal tests run WITHOUT any auth state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Client Portal Route Guards @smoke", () => {
  const protectedRoutes = [
    "/my",
    "/my/book",
    "/my/unlocks",
    "/my/settings",
    "/my/style",
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects to /my/login without auth`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL(/\/my\/login/);
      expect(page.url()).toContain("/my/login");
    });
  }
});

test.describe("Client Portal Public Routes @smoke", () => {
  test("/my/login is accessible without auth (no redirect loop)", async ({
    page,
  }) => {
    const response = await page.goto("/my/login");
    expect(response?.status()).not.toBe(404);
    await expect(page).toHaveURL(/\/my\/login/);
    await expect(page.getByText("Welcome Back")).toBeVisible();
  });

  test("/my/verify is accessible without auth (no login redirect)", async ({
    page,
  }) => {
    const response = await page.goto("/my/verify");
    // Should NOT redirect to /my/login — may show expired/invalid page
    expect(page.url()).not.toContain("/my/login");
  });
});

test.describe("Client Portal Login Page Elements @smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/my/login");
    await page.waitForLoadState("load");
  });

  test("renders both auth mode tabs", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Email Link" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Password" })).toBeVisible();
  });

  test("renders magic link submit button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Send me a sign-in link" })
    ).toBeVisible();
  });

  test("renders email input with placeholder", async ({ page }) => {
    const emailInput = page.getByLabel("Email address");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("placeholder", "you@example.com");
  });

  test("magic link form accepts and retains email value", async ({ page }) => {
    const emailInput = page.getByLabel("Email address");
    await emailInput.fill("test@example.com");
    await expect(emailInput).toHaveValue("test@example.com");
  });

  test("password tab shows email and password fields", async ({ page }) => {
    await page.getByRole("button", { name: "Password" }).click();

    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in with password" })
    ).toBeVisible();
  });
});

test.describe("Client Portal Auth Isolation @smoke", () => {
  test("staff auth cookie does NOT grant access to client portal", async ({
    browser,
  }) => {
    // Use the staff auth state (mvo_session cookie) — should NOT work for /my routes
    const ctx = await browser.newContext({
      storageState: ".auth/staff.json",
    });
    const page = await ctx.newPage();
    await page.goto("/my");
    // Should redirect to /my/login because mvo_client_session is missing
    await page.waitForURL(/\/my\/login/);
    expect(page.url()).toContain("/my/login");
    await ctx.close();
  });
});
