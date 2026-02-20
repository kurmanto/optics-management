/**
 * Purchase Orders — /inventory/purchase-orders
 * Tests PO list, status tabs, New PO button, and seed data.
 */

import { test, expect } from "@playwright/test";

test.describe("Purchase Orders", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/inventory/purchase-orders");
    await page.waitForLoadState("networkidle");
  });

  test("renders Purchase Orders heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Purchase Orders" })).toBeVisible();
  });

  test("New PO button is visible", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /new po/i }).or(
        page.getByRole("button", { name: /new po/i })
      )
    ).toBeVisible();
  });

  test("status tabs visible: All, Open, Received, Cancelled", async ({ page }) => {
    // Tabs render as "{label} ({count})" e.g. "All (1)"
    await expect(page.getByRole("link", { name: /^All \(/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Open \(/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Received \(/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Cancelled \(/ })).toBeVisible();
  });

  test("table columns visible: PO #, Vendor, Status, Total", async ({ page }) => {
    await expect(page.getByText("PO #")).toBeVisible();
    await expect(page.getByText("Vendor", { exact: true })).toBeVisible();
    await expect(page.getByText("Status", { exact: true })).toBeVisible();
    await expect(page.getByText("Total", { exact: true })).toBeVisible();
  });

  test("seeded PO-2026-0001 appears in list", async ({ page }) => {
    await expect(page.getByText("PO-2026-0001")).toBeVisible();
  });

  test("seeded PO shows Luxottica vendor", async ({ page }) => {
    await expect(page.getByText("Luxottica").first()).toBeVisible();
  });

  test("seeded PO shows DRAFT status", async ({ page }) => {
    await expect(page.getByText(/draft/i).first()).toBeVisible();
  });

  test("clicking PO navigates to PO detail", async ({ page }) => {
    const firstLink = page.locator("a[href*='/purchase-orders/']").first();
    const href = await firstLink.getAttribute("href");
    await firstLink.click();
    await expect(page).toHaveURL(new RegExp(href!));
  });

  test("Open tab filters to open POs", async ({ page }) => {
    await page.getByRole("link", { name: /^Open \(/ }).click();
    await page.waitForLoadState("networkidle");
    // The DRAFT PO should still appear (Draft is in "Open" bucket)
    await expect(page.getByText("PO-2026-0001")).toBeVisible();
  });
});
