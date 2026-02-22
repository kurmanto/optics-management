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
    // Form heading should appear
    await expect(page.getByRole("heading", { name: /book appointment/i, level: 3 })).toBeVisible();
    // Type combobox (first select in form)
    await expect(page.getByRole("combobox").first()).toBeVisible();
    // Date/time input
    await expect(page.locator("input[type='datetime-local']").first()).toBeVisible();
  });

  test("booking an appointment creates a row in the upcoming list", async ({ page }) => {
    await page.getByRole("button", { name: /book appointment/i }).click();
    await expect(page.getByRole("heading", { name: /book appointment/i, level: 3 })).toBeVisible();

    // Fill datetime-local with tomorrow at 10:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tomorrowDT = tomorrow.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"

    const dtInput = page.locator("input[type='datetime-local']").first();
    if (await dtInput.isVisible().catch(() => false)) {
      await dtInput.fill(tomorrowDT);
    } else {
      // Fallback: separate date + time inputs
      const dateInput = page.locator("input[type='date']").first();
      if (await dateInput.isVisible().catch(() => false)) {
        await dateInput.fill(tomorrowDT.slice(0, 10));
      }
      const timeInput = page.locator("input[type='time']").first();
      if (await timeInput.isVisible().catch(() => false)) {
        await timeInput.fill("10:00");
      }
    }

    // Select Styling type
    const typeSelect = page.getByRole("combobox").first();
    await typeSelect.selectOption("STYLING");

    // Submit
    await page.getByRole("button", { name: /^book appointment$/i }).click();
    await page.waitForTimeout(800);

    // Appointment should appear in list
    await expect(page.getByText(/styling/i)).toBeVisible();
  });

  test("cancelling an appointment removes it from the list", async ({ page }) => {
    // Count cancel buttons already present (previous tests may have created appointments)
    const initialCancelCount = await page.locator("button[title='Cancel appointment']").count();

    // Book a new appointment
    await page.getByRole("button", { name: /book appointment/i }).click();
    await expect(page.getByRole("heading", { name: /book appointment/i, level: 3 })).toBeVisible();

    const future = new Date();
    future.setDate(future.getDate() + 2);
    future.setHours(14, 0, 0, 0);
    const futureDT = future.toISOString().slice(0, 16);

    const dtInput = page.locator("input[type='datetime-local']").first();
    if (await dtInput.isVisible().catch(() => false)) {
      await dtInput.fill(futureDT);
    }

    const typeSelect = page.getByRole("combobox").first();
    await typeSelect.selectOption("FOLLOW_UP");

    await page.getByRole("button", { name: /^book appointment$/i }).click();
    await page.waitForTimeout(800);

    // Should now have one more cancel button
    await expect(page.locator("button[title='Cancel appointment']")).toHaveCount(initialCancelCount + 1);

    // Cancel the last one (the one we just created)
    await page.locator("button[title='Cancel appointment']").last().click();
    await page.waitForTimeout(500);

    // Should be back to the initial count
    await expect(page.locator("button[title='Cancel appointment']")).toHaveCount(initialCancelCount);
  });
});
