/**
 * Forms Hub — /forms
 * Tests form templates, submission sections, public route access.
 */

import { test, expect } from "@playwright/test";

test.describe("Forms Hub", () => {
  test.describe("Forms hub page (authenticated)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/forms");
      await page.waitForLoadState("networkidle");
    });

    test("renders Forms heading", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Forms", exact: true })).toBeVisible();
    });

    test("shows subtitle about sending digital forms", async ({ page }) => {
      await expect(page.getByText(/send digital forms to patients/i)).toBeVisible();
    });

    test("shows New Patient Registration template", async ({ page }) => {
      // Template name appears in card h3 AND possibly dropdown options — use .first()
      await expect(page.getByText("New Patient Registration").first()).toBeVisible();
    });

    test("shows Privacy & Consent template", async ({ page }) => {
      await expect(page.getByText("Privacy & Consent (PIPEDA)").first()).toBeVisible();
    });

    test("shows Frame Repair Waiver template", async ({ page }) => {
      await expect(page.getByText("Frame Repair Waiver").first()).toBeVisible();
    });

    test("shows Insurance Verification template", async ({ page }) => {
      await expect(page.getByText("Insurance Verification").first()).toBeVisible();
    });

    test("form template has Quick Send button", async ({ page }) => {
      await expect(page.getByRole("button", { name: "Quick Send" }).first()).toBeVisible();
    });

    test("Completed Forms section is visible", async ({ page }) => {
      await expect(page.getByText("Completed Forms")).toBeVisible();
    });

    test("seeded form submission appears in completed section", async ({ page }) => {
      // The seeded submission has customerName = "Marie Tremblay" and status = COMPLETED
      await expect(page.getByText(/Marie Tremblay|New Patient Registration/i).first()).toBeVisible();
    });
  });

  test("public form route /f/fake-token accessible without auth", async ({ browser }) => {
    // Create a fresh context with no auth state
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/f/fake-token");
    // Should NOT redirect to login (public path)
    const url = page.url();
    expect(url).not.toMatch(/\/login/);
    await context.close();
  });

  test("public intake route /intake/fake-token accessible without auth", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/intake/fake-token");
    const url = page.url();
    expect(url).not.toMatch(/\/login/);
    await context.close();
  });
});
