/**
 * Insurance Policy Manager — /customers/[id]
 * Tests the InsurancePolicyManager component embedded on the customer detail page.
 */

import { test, expect } from "@playwright/test";
import { getTestFixtures } from "../../helpers/test-data";

test.describe("Insurance Policy Manager", () => {
  let customerId: string;

  test.beforeAll(() => {
    customerId = getTestFixtures().customerIds["Hassan"]; // no policies seeded
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`/customers/${customerId}`);
    await page.waitForLoadState("networkidle");
  });

  test("shows empty state when no policies exist", async ({ page }) => {
    await expect(page.getByText("No insurance policies on file.")).toBeVisible();
  });

  test("Add Insurance Policy button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /add insurance policy/i })).toBeVisible();
  });

  test("clicking Add Insurance Policy reveals the form", async ({ page }) => {
    await page.getByRole("button", { name: /add insurance policy/i }).click();
    // Form should show coverage type select and member ID field
    await expect(page.locator("select[name='coverageType']")).toBeVisible();
    await expect(page.locator("input[name='memberId']")).toBeVisible();
  });

  test("valid form creates a policy card", async ({ page }) => {
    await page.getByRole("button", { name: /add insurance policy/i }).click();
    // Select "Sun Life" from provider dropdown
    await page.locator("select").first().selectOption("Sun Life");
    // Select VISION coverage
    await page.locator("select[name='coverageType']").selectOption("VISION");
    await page.getByRole("button", { name: /add policy/i }).click();
    // Card should appear with provider name
    await expect(page.getByText("Sun Life")).toBeVisible();
  });

  test("policy card shows Edit button", async ({ page }) => {
    // First create a policy
    await page.getByRole("button", { name: /add insurance policy/i }).click();
    await page.locator("select").first().selectOption("Manulife");
    await page.locator("select[name='coverageType']").selectOption("EXTENDED_HEALTH");
    await page.getByRole("button", { name: /add policy/i }).click();
    await expect(page.getByText("Manulife")).toBeVisible();
    // Edit button (pencil icon) should be present in the card
    const editBtn = page.locator("button").filter({ has: page.locator("svg") }).first();
    await expect(editBtn).toBeVisible();
  });

  test("Deactivate (X) button removes the policy card", async ({ page }) => {
    // Create a policy first
    await page.getByRole("button", { name: /add insurance policy/i }).click();
    await page.locator("select").first().selectOption("Green Shield");
    await page.locator("select[name='coverageType']").selectOption("VISION");
    await page.getByRole("button", { name: /add policy/i }).click();
    await expect(page.getByText("Green Shield")).toBeVisible();
    // Click the X (deactivate) button
    const xBtn = page.locator("button[class*='hover:text-red']").first();
    await xBtn.click();
    // Policy should disappear
    await page.waitForTimeout(500);
    await expect(page.getByText("Green Shield")).not.toBeVisible();
  });

  test("Next Eligible date shown when lastClaimDate and interval are set", async ({ page }) => {
    await page.getByRole("button", { name: /add insurance policy/i }).click();
    await page.locator("select").first().selectOption("Blue Cross");
    await page.locator("select[name='coverageType']").selectOption("VISION");
    // Set a last claim date 13 months ago (eligible now with 12-month interval)
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);
    await page.locator("input[name='lastClaimDate']").fill(thirteenMonthsAgo.toISOString().slice(0, 10));
    await page.locator("input[name='eligibilityIntervalMonths']").fill("12");
    await page.getByRole("button", { name: /add policy/i }).click();
    // Next Eligible date should be visible
    await expect(page.getByText(/Next Eligible/)).toBeVisible();
  });
});
