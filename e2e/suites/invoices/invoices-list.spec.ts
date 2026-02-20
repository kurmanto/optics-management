/**
 * Invoices List — /invoices
 * Tests heading, subtitle, table columns, and seeded invoice data.
 */

import { test, expect } from "@playwright/test";

test.describe("Invoices List", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/invoices");
    await page.waitForLoadState("networkidle");
  });

  test("renders Invoices heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
  });

  test("shows subtitle All issued customer invoices", async ({ page }) => {
    await expect(page.getByText("All issued customer invoices")).toBeVisible();
  });

  test("table columns visible: Issued, Order, Customer, Total, Balance", async ({ page }) => {
    await expect(page.getByText("Issued", { exact: true })).toBeVisible();
    await expect(page.getByText("Order", { exact: true })).toBeVisible();
    await expect(page.getByText("Customer", { exact: true })).toBeVisible();
    await expect(page.getByText("Total", { exact: true })).toBeVisible();
    await expect(page.getByText("Balance", { exact: true })).toBeVisible();
  });

  test("seeded Okafor invoice appears (order ORD- prefix)", async ({ page }) => {
    await expect(page.getByText(/ORD-/).first()).toBeVisible();
  });

  test("seeded invoice shows Okafor customer name", async ({ page }) => {
    await expect(page.getByText(/Okafor/).first()).toBeVisible();
  });

  test("seeded invoice shows total amount ($640 or $736)", async ({ page }) => {
    await expect(page.getByText(/\$640|\$736/)).toBeVisible();
  });

  test("clicking invoice row navigates to order or invoice detail", async ({ page }) => {
    const firstLink = page.locator("a[href*='/orders/']").first();
    const href = await firstLink.getAttribute("href");
    if (href) {
      await firstLink.click();
      await expect(page).toHaveURL(new RegExp(href));
    }
  });
});
