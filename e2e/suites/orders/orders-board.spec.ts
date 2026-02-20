/**
 * Orders Board — /orders/board
 * Tests Kanban columns, cards, advance buttons, modal.
 */

import { test, expect } from "@playwright/test";

test.describe("Fulfillment Board (Kanban)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/orders/board");
    await page.waitForLoadState("networkidle");
  });

  test("renders Fulfillment Board heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Fulfillment Board" })).toBeVisible();
  });

  test("shows active order count subtitle", async ({ page }) => {
    await expect(page.getByText(/\d+ active orders?/)).toBeVisible();
  });

  test("List View link has href=/orders", async ({ page }) => {
    await expect(page.getByRole("link", { name: "List View" })).toHaveAttribute("href", "/orders");
  });

  test("New Order link has href=/orders/new", async ({ page }) => {
    await expect(page.getByRole("link", { name: "New Order" })).toHaveAttribute("href", "/orders/new");
  });

  test("all Kanban column headers are visible", async ({ page }) => {
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
    await expect(page.getByText("Lab Ordered", { exact: true })).toBeVisible();
    await expect(page.getByText("Lab Received", { exact: true })).toBeVisible();
    await expect(page.getByText("Verified (Rx Check)", { exact: true })).toBeVisible();
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  });

  test("Confirmed column shows Wilson, Martin, Johnson cards", async ({ page }) => {
    await expect(page.getByText(/Wilson,/).first()).toBeVisible();
    await expect(page.getByText(/Martin,/).first()).toBeVisible();
    await expect(page.getByText(/Johnson,/).first()).toBeVisible();
  });

  test("Lab Received column shows Tremblay", async ({ page }) => {
    await expect(page.getByText(/Tremblay,/).first()).toBeVisible();
  });

  test("Lab Ordered column shows Gagnon", async ({ page }) => {
    await expect(page.getByText(/Gagnon,/).first()).toBeVisible();
  });

  test("Ready column shows Okafor", async ({ page }) => {
    await expect(page.getByText(/Okafor,/).first()).toBeVisible();
  });

  test("order cards show frame brand (Ray-Ban)", async ({ page }) => {
    await expect(page.getByText(/Ray-Ban/).first()).toBeVisible();
  });

  test("CONFIRMED cards have → Lab Ordered advance button", async ({ page }) => {
    await expect(page.getByRole("button", { name: "→ Lab Ordered" }).first()).toBeVisible();
  });

  test("READY card has Mark Picked Up advance button", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Mark Picked Up" })).toBeVisible();
  });

  test("clicking READY order advance opens PickupCompleteModal", async ({ page }) => {
    await page.getByRole("button", { name: "Mark Picked Up" }).click();
    // Modal shows "Mark as Picked Up" heading and engagement options
    await expect(page.getByText("Choose post-pickup engagement options")).toBeVisible({ timeout: 8000 });
  });

  test("order number link navigates to order detail", async ({ page }) => {
    const firstOrderLink = page.locator("a[href*='/orders/']").first();
    const href = await firstOrderLink.getAttribute("href");
    await firstOrderLink.click();
    await expect(page).toHaveURL(new RegExp(href!));
  });
});
