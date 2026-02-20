/**
 * Journey: Intake Form Flow
 * Tests forms hub, template navigation, and public form accessibility.
 */

import { test, expect } from "@playwright/test";

test.describe("Intake Form Flow Journey", () => {
  test("forms hub shows all 4 templates", async ({ page }) => {
    await page.goto("/forms");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("New Patient Registration").first()).toBeVisible();
    await expect(page.getByText("Privacy & Consent (PIPEDA)").first()).toBeVisible();
    await expect(page.getByText("Frame Repair Waiver").first()).toBeVisible();
    await expect(page.getByText("Insurance Verification").first()).toBeVisible();
  });

  test("clicking on a form template navigates to form detail", async ({ page }) => {
    await page.goto("/forms");
    await page.waitForLoadState("networkidle");

    // Click on the first form template
    const firstFormLink = page.locator("a[href*='/forms/']").first();
    if (await firstFormLink.isVisible()) {
      const href = await firstFormLink.getAttribute("href");
      await firstFormLink.click();
      await expect(page).toHaveURL(new RegExp(href!));
    } else {
      // Templates may be buttons; click the first form template
      await page.getByText("New Patient Registration").click();
      await expect(page).toHaveURL(/\/forms\//);
    }
  });

  test("seeded completed submission visible on forms hub", async ({ page }) => {
    await page.goto("/forms");
    await page.waitForLoadState("networkidle");
    // Seeded: Tremblay's completed NEW_PATIENT submission
    await expect(page.getByText(/completed|submission/i).first()).toBeVisible();
  });

  test("public /f/ route does not redirect to login", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/f/fake-token-that-does-not-exist");
    await page.waitForLoadState("networkidle");
    // Should NOT end up at /login
    expect(page.url()).not.toMatch(/\/login/);
    await context.close();
  });

  test("public /intake/ route does not redirect to login", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/intake/fake-intake-token");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toMatch(/\/login/);
    await context.close();
  });

  test("form detail page at /forms/[id] shows template info", async ({ page }) => {
    await page.goto("/forms");
    await page.waitForLoadState("networkidle");

    // Navigate to forms list and pick the first form template link
    const templateLinks = page.locator("a[href*='/forms/']");
    const count = await templateLinks.count();
    if (count > 0) {
      await templateLinks.first().click();
      await page.waitForLoadState("networkidle");
      // Form detail should show template name
      await expect(
        page.getByText(/patient registration|consent|waiver|insurance/i).first()
      ).toBeVisible();
    }
  });
});
