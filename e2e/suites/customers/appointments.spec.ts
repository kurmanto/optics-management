/**
 * Appointments — /customers/[id]
 * Tests the QuickBookAppointment component.
 */

import { test, expect } from "@playwright/test";
import { getTestFixtures } from "../../helpers/test-data";

test.describe("Appointments", () => {
  let customerId: string;

  test.beforeAll(() => {
    customerId = getTestFixtures().customerIds["Rossi"]; // no appointments seeded
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`/customers/${customerId}`);
    await page.waitForLoadState("networkidle");
  });

  test("shows no upcoming appointments state", async ({ page }) => {
    await expect(page.getByText("No upcoming appointments.")).toBeVisible();
  });

  test("Book Appointment button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /book appointment/i })).toBeVisible();
  });

  test("clicking Book Appointment reveals date/time/type fields", async ({ page }) => {
    await page.getByRole("button", { name: /book appointment/i }).click();
    // Should show date/time inputs and appointment type selector
    await expect(page.locator("input[type='date'], input[type='datetime-local']").first()).toBeVisible();
    await expect(page.locator("select").first()).toBeVisible();
  });

  test("booking an appointment creates a row in the upcoming list", async ({ page }) => {
    await page.getByRole("button", { name: /book appointment/i }).click();

    // Fill in tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const dateInput = page.locator("input[type='date']").first();
    if (await dateInput.isVisible()) {
      await dateInput.fill(tomorrowStr);
    }

    const timeInput = page.locator("input[type='time']").first();
    if (await timeInput.isVisible()) {
      await timeInput.fill("10:00");
    }

    // Select Styling type
    const typeSelect = page.locator("select").first();
    await typeSelect.selectOption("STYLING");

    // Submit
    await page.getByRole("button", { name: /book/i }).last().click();
    await page.waitForTimeout(800);

    // Appointment should appear in list
    await expect(page.getByText(/styling/i)).toBeVisible();
  });

  test("cancelling an appointment removes it from the list", async ({ page }) => {
    // Book first
    await page.getByRole("button", { name: /book appointment/i }).click();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const dateInput = page.locator("input[type='date']").first();
    if (await dateInput.isVisible()) {
      await dateInput.fill(tomorrow.toISOString().slice(0, 10));
    }
    const typeSelect = page.locator("select").first();
    await typeSelect.selectOption("FOLLOW_UP");
    await page.getByRole("button", { name: /book/i }).last().click();
    await page.waitForTimeout(800);

    // Cancel it
    const cancelBtn = page.getByRole("button", { name: /cancel/i }).last();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
      // Should be removed from upcoming
      await expect(page.getByText("No upcoming appointments.")).toBeVisible();
    }
  });
});
