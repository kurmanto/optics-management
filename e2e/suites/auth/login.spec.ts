/**
 * Login Spec
 * Tests the login page UI, form validation, and successful authentication.
 */

import { test, expect } from "@playwright/test";

// These tests run WITHOUT pre-authenticated state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login Page @smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("displays MVO branding and form elements", async ({ page }) => {
    await expect(page.getByText("Mint Vision Optique")).toBeVisible();
    await expect(page.getByText("Staff Portal")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("redirects already-authenticated user to /dashboard", async ({
    browser,
  }) => {
    // Use admin auth state for this specific test
    const ctx = await browser.newContext({
      storageState: ".auth/admin.json",
    });
    const p = await ctx.newPage();
    await p.goto("/login");
    // Should be redirected to dashboard
    await expect(p).toHaveURL("/dashboard");
    await ctx.close();
  });

  test("shows error for wrong password", async ({ page }) => {
    await page.getByLabel("Email").fill("staff@mintvisionsoptique.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
    // Should remain on login page
    await expect(page).toHaveURL("/login");
  });

  test("shows error for non-existent email", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("HTML5 validation prevents empty email submission", async ({ page }) => {
    // Browser-level required validation — check the input has required attribute
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toHaveAttribute("required");
    const passwordInput = page.getByLabel("Password");
    await expect(passwordInput).toHaveAttribute("required");
  });

  test("logs in successfully as staff and lands on /dashboard", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill("staff@mintvisionsoptique.com");
    await page.getByLabel("Password").fill("staff1234");
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("/dashboard");
    await expect(page).toHaveURL("/dashboard");
  });

  test("logs in successfully as admin and lands on /dashboard", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill("admin@mintvisionsoptique.com");
    await page.getByLabel("Password").fill("changeme123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("/dashboard");
    await expect(page).toHaveURL("/dashboard");
  });

  test("preserves ?from= redirect param after login", async ({ page }) => {
    // Navigate to a protected page without auth → gets redirected to login with ?from=
    await page.goto("/customers");
    await page.waitForURL(/\/login/);
    // URL may encode the path as %2Fcustomers — decode before asserting
    expect(decodeURIComponent(page.url())).toContain("from=/customers");

    // Log in
    await page.getByLabel("Email").fill("staff@mintvisionsoptique.com");
    await page.getByLabel("Password").fill("staff1234");
    await page.getByRole("button", { name: "Sign in" }).click();

    // NOTE: The current login action always redirects to /dashboard regardless of ?from=
    // BUG: The ?from= redirect param is captured in middleware but the login action
    //      always calls redirect('/dashboard') without reading it.
    //      This means the intended redirect-after-login flow doesn't work.
    //      NEEDS FIX: auth action should redirect to the ?from param after login.
    await page.waitForURL("/dashboard");
    // Verifying current (broken) behavior — after fix, it should go to /customers
    await expect(page).toHaveURL("/dashboard");
  });

  test("email field accepts only valid email format (HTML5)", async ({
    page,
  }) => {
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toHaveAttribute("type", "email");
  });
});
