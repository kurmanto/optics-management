/**
 * Journey: Inventory Purchase
 * Create vendor → create PO → verify in list → check PO detail.
 */

import { test, expect } from "@playwright/test";
import { uniqueSuffix, VENDOR } from "../../helpers/test-data";

test.describe("Inventory Purchase Journey", () => {
  test("seeded vendor Luxottica appears in vendor list", async ({ page }) => {
    await page.goto("/inventory/vendors");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(VENDOR.Luxottica.name).first()).toBeVisible();
  });

  test("seeded PO-2026-0001 appears in purchase orders list", async ({ page }) => {
    await page.goto("/inventory/purchase-orders");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("PO-2026-0001")).toBeVisible();
    await expect(page.getByText("Luxottica").first()).toBeVisible();
  });

  test("seeded PO detail page loads and shows line items", async ({ page }) => {
    await page.goto("/inventory/purchase-orders");
    await page.waitForLoadState("networkidle");

    // Click on the seeded PO
    const poLink = page.getByText("PO-2026-0001").first();
    await poLink.click();
    await page.waitForLoadState("networkidle");

    // PO detail should show vendor name and status
    await expect(page.getByText(/Luxottica/).first()).toBeVisible();
    await expect(page.getByText(/draft/i).first()).toBeVisible();
    // Line items: Ray-Ban and Tom Ford
    await expect(page.getByText(/Ray-Ban/).first()).toBeVisible();
    await expect(page.getByText(/Tom Ford/).first()).toBeVisible();
  });

  test("create a new vendor and verify it appears in the list", async ({ page }) => {
    const suffix = uniqueSuffix();
    const vendorName = `PurchaseVendor${suffix}`;

    await page.goto("/inventory/vendors/new");
    await page.waitForLoadState("networkidle");
    await page.locator('input[name="name"]').fill(vendorName);
    await page.locator('input[name="leadTimeDays"]').fill("7");
    await page.getByRole("button", { name: "Add Vendor" }).click();
    // Exclude "new" from the pattern so we wait for the actual CUID-based vendor detail URL
    await page.waitForURL(/\/inventory\/vendors\/(?!new)[a-z0-9]+/, { timeout: 20_000 });

    // Navigate back to vendor list
    await page.goto("/inventory/vendors");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(vendorName)).toBeVisible();
  });

  test("New PO button on purchase orders page navigates to create form", async ({ page }) => {
    await page.goto("/inventory/purchase-orders");
    await page.waitForLoadState("networkidle");

    const newPOBtn = page
      .getByRole("link", { name: /new po/i })
      .or(page.getByRole("button", { name: /new po/i }))
      .first();
    await expect(newPOBtn).toBeVisible();
    await newPOBtn.click();
    await expect(page).toHaveURL(/\/purchase-orders\/new/, { timeout: 10_000 });
  });

  test("PO list Open tab shows seeded DRAFT PO", async ({ page }) => {
    await page.goto("/inventory/purchase-orders");
    await page.waitForLoadState("networkidle");
    // Tabs render as "Open (N)" with count
    await page.getByRole("link", { name: /^Open \(/ }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("PO-2026-0001")).toBeVisible();
  });
});
