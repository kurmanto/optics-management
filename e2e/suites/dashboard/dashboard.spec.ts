/**
 * Dashboard — /dashboard
 * Tests scoreboard, opportunities, conversion metrics, recent orders.
 */

import { test, expect } from "@playwright/test";

test.describe("Dashboard @smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("renders Dashboard heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("shows today's date", async ({ page }) => {
    // Dashboard renders a formatted date — just check something date-like is visible
    const year = new Date().getFullYear().toString();
    await expect(page.getByText(new RegExp(year)).first()).toBeVisible();
  });

  test("Scoreboard section shows Revenue", async ({ page }) => {
    await expect(page.getByText(/revenue/i).first()).toBeVisible();
  });

  test("Scoreboard shows Avg Ticket metric", async ({ page }) => {
    await expect(page.getByText(/avg ticket/i).first()).toBeVisible();
  });

  test("Scoreboard shows Orders count", async ({ page }) => {
    await expect(page.getByText(/orders/i).first()).toBeVisible();
  });

  test("Monthly Goal progress bar visible with $X / $40,000", async ({ page }) => {
    await expect(page.getByText(/\$40,000|\$40000/i)).toBeVisible();
  });

  test("Money on the Table section visible", async ({ page }) => {
    await expect(page.getByText(/money on the table/i)).toBeVisible();
  });

  test("Deposit Taken — Not Picked Up shows Okafor (READY order)", async ({ page }) => {
    // Okafor has READY status — shows up as deposit taken, not picked up
    await expect(page.getByText(/Okafor/).first()).toBeVisible();
  });

  test("Exams Without Purchase section visible", async ({ page }) => {
    await expect(page.getByText(/exams without purchase/i)).toBeVisible();
  });

  test("Due for Recall section visible", async ({ page }) => {
    await expect(page.getByText(/due for recall|recall/i).first()).toBeVisible();
  });

  test("Due for Recall shows Beauchamp (exam 16 months ago)", async ({ page }) => {
    await expect(page.getByText(/Beauchamp/).first()).toBeVisible();
  });

  test("Contact Lens Drop-offs section visible", async ({ page }) => {
    await expect(page.getByText(/contact lens|drop.off/i).first()).toBeVisible();
  });

  test("Conversion Metrics section visible", async ({ page }) => {
    await expect(page.getByText(/conversion/i).first()).toBeVisible();
  });

  test("Exam to Purchase Rate metric visible", async ({ page }) => {
    await expect(page.getByText(/exam.*purchase|conversion rate/i).first()).toBeVisible();
  });

  test("Recent Orders section visible", async ({ page }) => {
    await expect(page.getByText(/recent orders/i).first()).toBeVisible();
  });

  test("admin-only Revenue Growth visible (logged in as admin)", async ({ page }) => {
    // Admin-specific section
    await expect(page.getByText(/revenue growth|owner|manager/i).first()).toBeVisible();
  });
});
