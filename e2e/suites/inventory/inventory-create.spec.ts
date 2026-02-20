/**
 * Inventory Create — /inventory/new
 * Tests form fields, validation, and successful creation.
 */

import { test, expect } from "@playwright/test";
import { uniqueSuffix } from "../../helpers/test-data";

test.describe("Inventory Create", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/inventory/new");
    await page.waitForLoadState("networkidle");
  });

  test("renders New Inventory Item heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "New Inventory Item" })).toBeVisible();
  });

  test("Brand input is required", async ({ page }) => {
    await expect(page.locator('input[name="brand"]')).toHaveAttribute("required", "");
  });

  test("Model input is required", async ({ page }) => {
    await expect(page.locator('input[name="model"]')).toHaveAttribute("required", "");
  });

  test("Brand has placeholder e.g. Ray-Ban", async ({ page }) => {
    await expect(page.locator('input[name="brand"]')).toHaveAttribute("placeholder", "e.g. Ray-Ban");
  });

  test("Category select has Optical, Sun, Reading, Safety, Sport options", async ({ page }) => {
    const cat = page.locator('select[name="category"]');
    await expect(cat.locator('option[value="OPTICAL"]')).toHaveText("Optical");
    await expect(cat.locator('option[value="SUN"]')).toHaveText("Sun");
    await expect(cat.locator('option[value="READING"]')).toHaveText("Reading");
    await expect(cat.locator('option[value="SAFETY"]')).toHaveText("Safety");
    await expect(cat.locator('option[value="SPORT"]')).toHaveText("Sport");
  });

  test("Gender select has Men's, Women's, Unisex, Kids options", async ({ page }) => {
    const gen = page.locator('select[name="gender"]');
    await expect(gen.locator('option[value="MENS"]')).toHaveText("Men's");
    await expect(gen.locator('option[value="WOMENS"]')).toHaveText("Women's");
    await expect(gen.locator('option[value="UNISEX"]')).toHaveText("Unisex");
    await expect(gen.locator('option[value="KIDS"]')).toHaveText("Kids");
  });

  test("Wholesale Cost and Retail Price fields exist", async ({ page }) => {
    await expect(page.getByText("Wholesale Cost")).toBeVisible();
    await expect(page.getByText("Retail Price")).toBeVisible();
  });

  test("Stock Quantity and Reorder Point fields exist", async ({ page }) => {
    await expect(page.getByText("Stock Quantity")).toBeVisible();
    await expect(page.getByText("Reorder Point")).toBeVisible();
  });

  test("submit button shows Add to Inventory", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Add to Inventory" })).toBeVisible();
  });

  test("submitting with brand + model + category + gender creates item and redirects", async ({ page }) => {
    const suffix = uniqueSuffix();
    await page.locator('input[name="brand"]').fill(`TestBrand${suffix}`);
    await page.locator('input[name="model"]').fill(`TM-001`);
    await page.locator('select[name="category"]').selectOption("OPTICAL");
    await page.locator('select[name="gender"]').selectOption("UNISEX");
    await page.getByRole("button", { name: "Add to Inventory" }).click();
    await page.waitForURL(/\/inventory\/[a-z0-9]+/, { timeout: 20_000 });
    await expect(page.getByText(`TestBrand${suffix}`)).toBeVisible();
  });
});
