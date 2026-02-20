/**
 * Sidebar Navigation Spec
 * Verifies all sidebar links navigate correctly and active states work.
 * Based on the actual Sidebar.tsx component structure.
 */

import { test, expect } from "@playwright/test";

test.describe("Sidebar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("sidebar displays Mint Vision branding", async ({ page }) => {
    await expect(page.getByText("Mint Vision")).toBeVisible();
    await expect(page.getByText("Staff Portal")).toBeVisible();
  });

  test("Dashboard link is visible and active on /dashboard", async ({ page }) => {
    const dashLink = page.getByRole("link", { name: "Dashboard" });
    await expect(dashLink).toBeVisible();
    // Should be highlighted (active) on dashboard
    await expect(dashLink).toHaveClass(/bg-primary/);
  });

  test("Customers link navigates to /customers", async ({ page }) => {
    await page.getByRole("link", { name: "Customers" }).click();
    await expect(page).toHaveURL("/customers");
  });

  test("Forms link navigates to /forms", async ({ page }) => {
    await page.getByRole("link", { name: "Forms" }).click();
    await expect(page).toHaveURL("/forms");
  });

  test("Orders group shows sub-nav items when active", async ({ page }) => {
    // Click Orders — it navigates to first child: /orders/board
    await page.getByRole("link", { name: "Orders" }).click();
    await expect(page).toHaveURL("/orders/board");

    // Sub-nav items should now be visible
    await expect(page.getByRole("link", { name: "Fulfillment Board" })).toBeVisible();
    await expect(page.getByRole("link", { name: "All Orders" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Invoices" })).toBeVisible();
  });

  test("All Orders sub-nav navigates to /orders", async ({ page }) => {
    await page.getByRole("link", { name: "Orders" }).click();
    await page.getByRole("link", { name: "All Orders" }).click();
    await expect(page).toHaveURL("/orders");
  });

  test("Invoices sub-nav navigates to /invoices", async ({ page }) => {
    await page.getByRole("link", { name: "Orders" }).click();
    await page.getByRole("link", { name: "Invoices" }).click();
    await expect(page).toHaveURL("/invoices");
  });

  test("Inventory group shows sub-nav items when active", async ({ page }) => {
    await page.getByRole("link", { name: "Inventory" }).click();
    await expect(page).toHaveURL("/inventory");

    await expect(page.getByRole("link", { name: "All Frames" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Vendors" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Purchase Orders" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Analytics" })).toBeVisible();
  });

  test("Vendors sub-nav navigates to /inventory/vendors", async ({ page }) => {
    await page.getByRole("link", { name: "Inventory" }).click();
    await page.getByRole("link", { name: "Vendors" }).click();
    await expect(page).toHaveURL("/inventory/vendors");
  });

  test("Purchase Orders sub-nav navigates to /inventory/purchase-orders", async ({ page }) => {
    await page.getByRole("link", { name: "Inventory" }).click();
    await page.getByRole("link", { name: "Purchase Orders" }).click();
    await expect(page).toHaveURL("/inventory/purchase-orders");
  });

  test("Analytics sub-nav navigates to /inventory/analytics", async ({ page }) => {
    await page.getByRole("link", { name: "Inventory" }).click();
    await page.getByRole("link", { name: "Analytics" }).click();
    await expect(page).toHaveURL("/inventory/analytics");
  });

  test("Settings link navigates to /settings", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL("/settings");
  });

  test("displays user name and role in sidebar footer", async ({ page }) => {
    // Admin is logged in via storageState
    await expect(page.getByText("Alex Dumont")).toBeVisible();
    await expect(page.getByText("admin", { exact: true })).toBeVisible();
  });

  test("Sign out button is visible in sidebar", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("Sign out button logs out and redirects to /login", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("User Guide link is visible and external", async ({ page }) => {
    const userGuideLink = page.getByRole("link", { name: "User Guide" });
    await expect(userGuideLink).toBeVisible();
    await expect(userGuideLink).toHaveAttribute("target", "_blank");
  });
});
