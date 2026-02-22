/**
 * Vendors — /inventory/vendors
 * Tests vendor list, creation, and navigation.
 */

import { test, expect } from "@playwright/test";
import { uniqueSuffix, VENDOR } from "../../helpers/test-data";

test.describe("Vendors", () => {
  test.describe("Vendors list", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/inventory/vendors");
      await page.waitForLoadState("networkidle");
    });

    test("renders Vendors heading", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Vendors" })).toBeVisible();
    });

    test("New Vendor button links to /inventory/vendors/new", async ({ page }) => {
      await expect(page.getByRole("link", { name: "New Vendor" })).toHaveAttribute("href", "/inventory/vendors/new");
    });

    test("table columns visible: Vendor, Contact, Email, Lead Time", async ({ page }) => {
      await expect(page.getByText("Vendor", { exact: true })).toBeVisible();
      await expect(page.getByText("Contact", { exact: true })).toBeVisible();
      await expect(page.getByText("Email", { exact: true })).toBeVisible();
      await expect(page.getByText("Lead Time", { exact: true })).toBeVisible();
    });

    test("seeded Luxottica vendor appears", async ({ page }) => {
      await expect(page.getByText(VENDOR.Luxottica.name).first()).toBeVisible();
    });

    test("vendor row links to vendor detail", async ({ page }) => {
      const firstLink = page.locator("a[href*='/inventory/vendors/']").first();
      const href = await firstLink.getAttribute("href");
      await firstLink.click();
      await expect(page).toHaveURL(new RegExp(href!));
    });
  });

  test.describe("Vendor creation", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/inventory/vendors/new");
      await page.waitForLoadState("networkidle");
    });

    test("renders New Vendor heading", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "New Vendor" })).toBeVisible();
    });

    test("Name input is required", async ({ page }) => {
      await expect(page.locator('input[name="name"]')).toHaveAttribute("required", "");
    });

    test("Contact Name, Email, Phone, Lead Time fields visible", async ({ page }) => {
      await expect(page.locator('input[name="contactName"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="phone"]')).toBeVisible();
      await expect(page.locator('input[name="leadTimeDays"]')).toBeVisible();
    });

    test("creating a vendor with name redirects to vendor detail", async ({ page }) => {
      const suffix = uniqueSuffix();
      const name = `TestVendor${suffix}`;
      await page.locator('input[name="name"]').fill(name);
      await page.getByRole("button", { name: "Add Vendor" }).click();
      await page.waitForURL(/\/inventory\/vendors\/[a-z0-9]+/, { timeout: 20_000 });
      await expect(page.getByText(name)).toBeVisible();
    });

    test("new vendor appears in vendor list", async ({ page }) => {
      const suffix = uniqueSuffix();
      const name = `ListVendor${suffix}`;
      await page.locator('input[name="name"]').fill(name);
      await page.getByRole("button", { name: "Add Vendor" }).click();
      await page.waitForURL(/\/inventory\/vendors\/[a-z0-9]+/, { timeout: 20_000 });

      await page.goto("/inventory/vendors");
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(name)).toBeVisible({ timeout: 20_000 });
    });
  });
});
