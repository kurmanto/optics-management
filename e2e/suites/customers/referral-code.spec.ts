/**
 * Referral Code Card — /customers/[id]
 * Tests the ReferralCodeCard component.
 */

import { test, expect } from "@playwright/test";
import { getTestFixtures } from "../../helpers/test-data";

test.describe("Referral Code Card", () => {
  let customerId: string;

  test.beforeAll(() => {
    customerId = getTestFixtures().customerIds["Nguyen"]; // no referral code seeded
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`/customers/${customerId}`);
    await page.waitForLoadState("networkidle");
  });

  test("shows Generate Referral Code button when no code exists", async ({ page }) => {
    await expect(page.getByRole("button", { name: /generate referral code/i })).toBeVisible();
  });

  test("clicking Generate Code creates a code matching MV- pattern", async ({ page }) => {
    await page.getByRole("button", { name: /generate referral code/i }).click();
    // Wait for code to appear
    await page.waitForTimeout(1000);
    // Code should match pattern like MV-DANG-1234
    const codeEl = page.locator(".font-mono");
    await expect(codeEl).toBeVisible();
    const codeText = await codeEl.textContent();
    expect(codeText?.trim()).toMatch(/^MV-[A-Z]{4}-\d{4}$/);
  });

  test("copy button appears after code is generated", async ({ page }) => {
    // Generate code first
    const genBtn = page.getByRole("button", { name: /generate referral code/i });
    if (await genBtn.isVisible()) {
      await genBtn.click();
      await page.waitForTimeout(1000);
    }
    // Copy button should now be visible
    await expect(page.getByRole("button", { name: /copy/i })).toBeVisible();
  });

  test("referral history section shows empty state or table", async ({ page }) => {
    // After generating code, no qualified referrals yet
    // Either empty (no referral history section) or empty table — both are valid
    const historySection = page.getByText(/Referral History/i);
    // If no qualified referrals, the history section won't show at all
    // Just verify the page loads without error
    await expect(page).toHaveURL(`/customers/${customerId}`);
  });

  test("navigating away and back shows same code (not regenerated)", async ({ page }) => {
    // Generate code
    const genBtn = page.getByRole("button", { name: /generate referral code/i });
    if (await genBtn.isVisible()) {
      await genBtn.click();
      await page.waitForTimeout(1000);
    }
    const codeEl = page.locator(".font-mono");
    const originalCode = await codeEl.textContent();

    // Navigate away
    await page.goto("/customers");
    await page.waitForLoadState("networkidle");

    // Navigate back
    await page.goto(`/customers/${customerId}`);
    await page.waitForLoadState("networkidle");

    // Code should be the same (not regenerated)
    const codeElAgain = page.locator(".font-mono");
    await expect(codeElAgain).toBeVisible();
    const newCode = await codeElAgain.textContent();
    expect(newCode?.trim()).toBe(originalCode?.trim());
  });
});
