/**
 * Scan Rx — /scan-rx
 * Tests customer search, quick create, step navigation.
 */

import { test, expect } from "@playwright/test";

test.describe("Scan Rx", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/scan-rx");
    await page.waitForLoadState("networkidle");
  });

  test("renders Scan Rx heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Scan Rx" })).toBeVisible();
  });

  test("shows subtitle about uploading prescription", async ({ page }) => {
    await expect(page.getByText(/photo|prescription/i).first()).toBeVisible();
  });

  test("Step 1 search input is visible with correct placeholder", async ({ page }) => {
    await expect(page.getByPlaceholder("Search by name, phone, or email…")).toBeVisible();
  });

  test("New patient — quick create button is visible", async ({ page }) => {
    await expect(page.getByText("New patient — quick create")).toBeVisible();
  });

  test("searching for Tremblay shows patient result", async ({ page }) => {
    const input = page.getByPlaceholder("Search by name, phone, or email…");
    // fill() fires the input event that triggers React's onChange for controlled inputs
    await input.fill("Tremblay");
    // Wait for 300ms debounce + server action latency; results are <li><button> elements
    await expect(
      page.locator("ul li button").filter({ hasText: /Tremblay/ }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("clicking a search result advances to Step 2", async ({ page }) => {
    const input = page.getByPlaceholder("Search by name, phone, or email…");
    await input.fill("Tremblay");
    const result = page.locator("ul li button").filter({ hasText: /Tremblay/ }).first();
    await expect(result).toBeVisible({ timeout: 10000 });
    await result.click();
    // Step 2: patient banner shows "Patient" label (uppercase tracking-wide)
    await expect(page.getByText("Patient", { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });

  test("clicking quick create shows New Patient form", async ({ page }) => {
    await page.getByText("New patient — quick create").click();
    // h2 "New Patient" inside the quick-create form
    await expect(page.getByText("New Patient", { exact: true })).toBeVisible();
    // Use exact: true — getByPlaceholder is case-insensitive by default and would
    // match both placeholder="Jane" AND placeholder="jane@example.com"
    await expect(page.getByPlaceholder("Jane", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Doe", { exact: true })).toBeVisible();
  });

  test("submitting quick create with empty names shows error", async ({ page }) => {
    await page.getByText("New patient — quick create").click();
    await page.getByRole("button", { name: /create patient/i }).click();
    await expect(page.getByText("First and last name are required")).toBeVisible({ timeout: 5000 });
  });

  test("Step 2 shows Change link to go back", async ({ page }) => {
    const input = page.getByPlaceholder("Search by name, phone, or email…");
    await input.fill("Tremblay");
    const result = page.locator("ul li button").filter({ hasText: /Tremblay/ }).first();
    await expect(result).toBeVisible({ timeout: 10000 });
    await result.click();
    await expect(page.getByText("Change")).toBeVisible({ timeout: 5000 });
  });
});
