/**
 * Client Portal Login — /my/login
 * Tests the client portal login page UI, form elements, tab switching,
 * and basic validation. This is a separate auth system from the staff portal
 * (uses mvo_client_session cookie, not mvo_session).
 */

import { test, expect } from "@playwright/test";

// Client portal tests run WITHOUT staff auth — clear all cookies
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Client Portal Login @smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/my/login");
    await page.waitForLoadState("load");
  });

  test("displays MV branding and welcome text", async ({ page }) => {
    await expect(page.getByText("MV")).toBeVisible();
    await expect(page.getByText("Welcome Back")).toBeVisible();
    await expect(
      page.getByText("Sign in to your family vision portal")
    ).toBeVisible();
  });

  test("shows patient-only notice", async ({ page }) => {
    await expect(
      page.getByText("This portal is for Mint Vision patients only.")
    ).toBeVisible();
    await expect(
      page.getByText("Ask your optician to enable portal access.")
    ).toBeVisible();
  });

  test("defaults to magic link (Email Link) tab", async ({ page }) => {
    // The Email Link tab should be active by default
    await expect(page.getByRole("button", { name: "Email Link" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Password" })).toBeVisible();

    // Magic link form should be visible — email label + submit button
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send me a sign-in link" })
    ).toBeVisible();
  });

  test("magic link email field requires valid email (HTML5)", async ({
    page,
  }) => {
    const emailInput = page.getByLabel("Email address");
    await expect(emailInput).toHaveAttribute("required");
    await expect(emailInput).toHaveAttribute("type", "email");
  });

  test("switches to password tab and shows password form", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Password" }).click();

    // Password form should now be visible
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in with password" })
    ).toBeVisible();
  });

  test("password form fields have required attribute", async ({ page }) => {
    await page.getByRole("button", { name: "Password" }).click();

    const emailInput = page.getByLabel("Email address");
    const passwordInput = page.getByLabel("Password");
    await expect(emailInput).toHaveAttribute("required");
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(passwordInput).toHaveAttribute("required");
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("can switch between tabs without losing page state", async ({
    page,
  }) => {
    // Start on magic link tab
    await expect(
      page.getByRole("button", { name: "Send me a sign-in link" })
    ).toBeVisible();

    // Switch to password
    await page.getByRole("button", { name: "Password" }).click();
    await expect(
      page.getByRole("button", { name: "Sign in with password" })
    ).toBeVisible();

    // Switch back to magic link
    await page.getByRole("button", { name: "Email Link" }).click();
    await expect(
      page.getByRole("button", { name: "Send me a sign-in link" })
    ).toBeVisible();
  });

  test("magic link form accepts email input", async ({ page }) => {
    const emailInput = page.getByLabel("Email address");
    await emailInput.fill("patient@example.com");
    await expect(emailInput).toHaveValue("patient@example.com");
  });

  test("password form accepts email and password input", async ({ page }) => {
    await page.getByRole("button", { name: "Password" }).click();

    const emailInput = page.getByLabel("Email address");
    const passwordInput = page.getByLabel("Password");

    await emailInput.fill("patient@example.com");
    await passwordInput.fill("TestPassword123!");

    await expect(emailInput).toHaveValue("patient@example.com");
    await expect(passwordInput).toHaveValue("TestPassword123!");
  });
});

test.describe("Client Portal Login — Idle Timeout @smoke", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows idle timeout notice when reason=idle_timeout", async ({
    page,
  }) => {
    await page.goto("/my/login?reason=idle_timeout");
    await page.waitForLoadState("load");

    await expect(
      page.getByText(
        "Your session expired due to inactivity. Please sign in again."
      )
    ).toBeVisible();
  });

  test("does not show idle timeout notice without reason param", async ({
    page,
  }) => {
    await page.goto("/my/login");
    await page.waitForLoadState("load");

    await expect(
      page.getByText("Your session expired due to inactivity.")
    ).not.toBeVisible();
  });
});
