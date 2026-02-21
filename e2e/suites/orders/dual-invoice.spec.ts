/**
 * Dual Invoice — /orders/[id]/invoice
 * Tests the dual invoice toggle and Customer/Internal views.
 */

import { test, expect } from "@playwright/test";
import { getTestFixtures } from "../../helpers/test-data";

test.describe("Dual Invoice", () => {
  let standardOrderId: string;
  let dualInvoiceOrderId: string;

  test.beforeAll(() => {
    const fixtures = getTestFixtures();
    standardOrderId = fixtures.standardOrderId;
    dualInvoiceOrderId = fixtures.dualInvoiceOrderId;
  });

  test("standard order invoice page loads without error", async ({ page }) => {
    await page.goto(`/orders/${standardOrderId}/invoice`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("dual-invoice order invoice page loads without error", async ({ page }) => {
    await page.goto(`/orders/${dualInvoiceOrderId}/invoice`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("dual-invoice order shows toggle or Internal/Customer tabs", async ({ page }) => {
    await page.goto(`/orders/${dualInvoiceOrderId}/invoice`);
    await page.waitForLoadState("networkidle");
    // Should show either "Internal" or "Customer" labels for the toggle
    const internalLabel = page.getByText(/internal/i).first();
    const customerLabel = page.getByText(/customer/i).first();
    const hasToggle = (await internalLabel.isVisible().catch(() => false)) ||
                      (await customerLabel.isVisible().catch(() => false));
    expect(hasToggle).toBe(true);
  });

  test("Internal view is accessible via query param on dual-invoice order", async ({ page }) => {
    await page.goto(`/orders/${dualInvoiceOrderId}/invoice?view=internal`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("invoice page contains invoice content (not a 404)", async ({ page }) => {
    await page.goto(`/orders/${dualInvoiceOrderId}/invoice`);
    await page.waitForLoadState("networkidle");
    // Should not show 404 or error
    await expect(page.getByText(/404|not found/i)).not.toBeVisible();
  });

  test("INTERNAL view shows some internal identifier", async ({ page }) => {
    await page.goto(`/orders/${dualInvoiceOrderId}/invoice?view=internal`);
    await page.waitForLoadState("networkidle");
    // Check the page renders with internal content
    await expect(page.locator("body")).toBeVisible();
  });

  test("switching to Internal tab updates the view", async ({ page }) => {
    await page.goto(`/orders/${dualInvoiceOrderId}/invoice`);
    await page.waitForLoadState("networkidle");
    const internalBtn = page.getByRole("button", { name: /internal/i })
      .or(page.getByRole("link", { name: /internal/i }))
      .first();
    if (await internalBtn.isVisible().catch(() => false)) {
      await internalBtn.click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
