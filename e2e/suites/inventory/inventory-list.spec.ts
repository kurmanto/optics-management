/**
 * Inventory List — /inventory
 * Tests search, filters, stats, item rows, navigation.
 */

import { test, expect } from "@playwright/test";

test.describe("Inventory List", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");
  });

  test("renders All Frames heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "All Frames" })).toBeVisible();
  });

  test("New Item button links to /inventory/new", async ({ page }) => {
    await expect(page.getByRole("link", { name: "New Item" })).toHaveAttribute("href", "/inventory/new");
  });

  test("shows stats cards: Total Stock, On Order, Low Stock", async ({ page }) => {
    await expect(page.getByText("Total Stock").first()).toBeVisible();
    await expect(page.getByText("On Order").first()).toBeVisible();
    await expect(page.getByText("Low Stock").first()).toBeVisible();
  });

  test("search input has correct placeholder", async ({ page }) => {
    await expect(page.getByPlaceholder("Search brand, model, SKU, or color…")).toBeVisible();
  });

  test("Type filter links visible: Optical, Sun, Reading, Safety, Sport", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Optical", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sun", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reading", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Safety", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sport", exact: true })).toBeVisible();
  });

  test("Gender filter links visible: Men's, Women's, Unisex, Kids", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Men's", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Women's", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Unisex", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kids", exact: true })).toBeVisible();
  });

  test("seed item Ray-Ban RB5154 appears in list", async ({ page }) => {
    await expect(page.getByText(/Ray-Ban/).first()).toBeVisible();
    await expect(page.getByText(/RB5154/).first()).toBeVisible();
  });

  test("seed item Tom Ford TF5634 appears in list", async ({ page }) => {
    await expect(page.getByText(/Tom Ford/).first()).toBeVisible();
    await expect(page.getByText(/TF5634/).first()).toBeVisible();
  });

  test("seed item Gucci GG0026O appears in list", async ({ page }) => {
    await expect(page.getByText(/Gucci/).first()).toBeVisible();
  });

  test("search Ray-Ban filters to show only Ray-Ban items", async ({ page }) => {
    const input = page.getByPlaceholder("Search brand, model, SKU, or color…");
    await input.fill("Ray-Ban");
    await input.press("Enter");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/Ray-Ban/).first()).toBeVisible();
    await expect(page.getByText(/Tom Ford/).first()).not.toBeVisible();
  });

  test("search GG0026 shows Gucci item", async ({ page }) => {
    const input = page.getByPlaceholder("Search brand, model, SKU, or color…");
    await input.fill("GG0026");
    await input.press("Enter");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/GG0026/i).first()).toBeVisible();
  });

  test("search zzznomatch shows empty state", async ({ page }) => {
    const input = page.getByPlaceholder("Search brand, model, SKU, or color…");
    await input.fill("zzznomatch");
    await input.press("Enter");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/no frames match/i)).toBeVisible();
  });

  test("clicking Optical filter shows only OPTICAL items", async ({ page }) => {
    await page.getByRole("link", { name: "Optical", exact: true }).click();
    await page.waitForLoadState("networkidle");
    // OPTICAL frames (RB5154, TF5634, OX8046, GG0026, PO3007) should appear
    await expect(page.getByText(/RB5154/).first()).toBeVisible();
    // SUN frames like MJ440 should not appear
    await expect(page.getByText(/MJ440/).first()).not.toBeVisible();
  });

  test("item row is clickable and navigates to /inventory/[id]", async ({ page }) => {
    const firstLink = page.locator("a[href*='/inventory/']").first();
    const href = await firstLink.getAttribute("href");
    await firstLink.click();
    await expect(page).toHaveURL(new RegExp(href!));
  });
});
