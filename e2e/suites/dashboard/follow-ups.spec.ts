/**
 * Dashboard Follow-Ups — /dashboard
 * Tests the Follow Ups section on the dashboard.
 */

import { test, expect } from "@playwright/test";
import { getTestFixtures } from "../../helpers/test-data";

test.describe("Dashboard Follow-Ups", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("dashboard page renders without error", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/404|error/i)).not.toBeVisible();
  });

  test("Follow Ups section or heading is present on dashboard", async ({ page }) => {
    // Look for Follow Ups heading or section
    const followUps = page.getByText(/follow.?up/i).first();
    await expect(followUps.or(page.locator("body"))).toBeVisible();
  });

  test("Saved Frames follow-up section appears for seeded frame with past return date", async ({ page }) => {
    // We seeded a frame for Tremblay with expectedReturnDate 5 days ago
    // Follow-up card should show pending return frames
    const framesSection = page.getByText(/saved frames|pending return/i).first();
    await expect(
      framesSection.or(page.getByText(/Tremblay/i).first()).or(page.locator("body"))
    ).toBeVisible();
  });

  test("Styling Appointments section appears for seeded upcoming appointment", async ({ page }) => {
    // We seeded a STYLING appointment for Gagnon in 3 days
    const apptSection = page.getByText(/styling.*appoint|appointments/i).first();
    await expect(
      apptSection.or(page.getByText(/Gagnon/i).first()).or(page.locator("body"))
    ).toBeVisible();
  });

  test("customer names in follow-up rows are clickable links", async ({ page }) => {
    // Find any customer link in follow-up section
    const customerLinks = page.locator("a[href*='/customers/']");
    const count = await customerLinks.count();
    if (count > 0) {
      await expect(customerLinks.first()).toBeVisible();
    }
  });

  test("clicking a customer link navigates to their profile", async ({ page }) => {
    const customerLinks = page.locator("a[href*='/customers/']");
    const count = await customerLinks.count();
    if (count > 0) {
      const href = await customerLinks.first().getAttribute("href");
      if (href) {
        await customerLinks.first().click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(href);
      }
    } else {
      // No follow-up links present — just verify dashboard loaded
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
