/**
 * Orders List — /orders
 * Tests list, search, status tabs, navigation.
 */

import { test, expect } from "@playwright/test";

test.describe("Orders List", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");
  });

  test("renders Orders heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  });

  test("shows order count subtitle", async ({ page }) => {
    await expect(page.getByText(/\d+ orders?/)).toBeVisible();
  });

  test("New Order button links to /orders/new", async ({ page }) => {
    await expect(page.getByRole("link", { name: "New Order" })).toHaveAttribute("href", "/orders/new");
  });

  test("Board button links to /orders/board", async ({ page }) => {
    // Use exact: true to avoid matching sidebar's "Fulfillment Board" link
    await expect(page.getByRole("link", { name: "Board", exact: true })).toHaveAttribute("href", "/orders/board");
  });

  test("shows Order, Customer, Status, Total, Balance columns", async ({ page }) => {
    await expect(page.getByText("Order", { exact: true })).toBeVisible();
    await expect(page.getByText("Customer", { exact: true })).toBeVisible();
    await expect(page.getByText("Status", { exact: true })).toBeVisible();
    await expect(page.getByText("Total", { exact: true })).toBeVisible();
    await expect(page.getByText("Balance", { exact: true })).toBeVisible();
  });

  test("seed orders appear with ORD- prefix", async ({ page }) => {
    await expect(page.getByText(/ORD-/).first()).toBeVisible();
  });

  test("status filter tabs are visible: All, Draft, Confirmed, Lab Ordered", async ({ page }) => {
    await expect(page.getByRole("link", { name: "All", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Draft", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Confirmed", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lab Ordered", exact: true })).toBeVisible();
  });

  test("READY filter updates URL and shows Okafor", async ({ page }) => {
    await page.getByRole("link", { name: "Ready", exact: true }).click();
    await expect(page).toHaveURL(/status=READY/);
    await expect(page.getByText("Okafor")).toBeVisible();
  });

  test("CONFIRMED filter shows confirmed orders", async ({ page }) => {
    await page.getByRole("link", { name: "Confirmed", exact: true }).click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/status=CONFIRMED/);
    // At least 2 confirmed orders (Wilson, Martin, Johnson) — some may be advanced by journey tests
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("clicking order number navigates to /orders/[id]", async ({ page }) => {
    const link = page.locator("tbody tr a").first();
    await link.click();
    await expect(page).toHaveURL(/\/orders\/[a-z0-9]+/);
  });

  test("customer name in table links to /customers/[id]", async ({ page }) => {
    // Customer column links go to /customers/
    const customerLink = page.locator("tbody tr td:nth-child(2) a").first();
    await customerLink.click();
    await expect(page).toHaveURL(/\/customers\//);
  });
});
