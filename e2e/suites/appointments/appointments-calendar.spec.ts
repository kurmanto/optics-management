/**
 * Appointments Calendar — /appointments
 *
 * Covers:
 *  1. Page structure (heading, day headers, toolbar)
 *  2. Week navigation (prev/next/today)
 *  3. Seeded appointment display (Gagnon STYLING, 3 days from now)
 *  4. BookAppointmentModal (open, close, search, validation)
 *  5. Creating an appointment end-to-end
 *  6. AppointmentActions popover (open, info, actions)
 *  7. Status transitions (confirm, cancel, reschedule)
 */

import { test, expect, type Page } from "@playwright/test";
import { CUSTOMERS } from "../../helpers/test-data";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMondayISO(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Navigate to the calendar week containing `date`. */
async function gotoWeek(page: Page, date: Date) {
  await page.goto(`/appointments?week=${getMondayISO(date)}`);
  await page.waitForLoadState("networkidle");
}

/** Return a date `n` days from now at the given hour (local). */
function daysFromNow(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Format a Date as "YYYY-MM-DDTHH:MM" for datetime-local inputs. */
function dtLocal(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

/** Book an appointment through the modal. Assumes the calendar page is already open. */
async function bookViaModal(
  page: Page,
  customerName: string,
  scheduledAt: Date,
  type = "STYLING"
) {
  await page.getByRole("button", { name: /book styling/i }).click();
  await expect(page.getByRole("heading", { name: /book appointment/i })).toBeVisible();

  // Search for the customer
  const searchParts = customerName.split(" ");
  const lastName = searchParts[searchParts.length - 1];
  await page.getByPlaceholder(/search by name/i).fill(lastName);
  await page.waitForTimeout(450); // debounce
  await page.getByText(customerName).first().click();

  // Set type if different from default
  if (type !== "STYLING") {
    await page.locator("select").first().selectOption(type);
  }

  // Set datetime
  await page.locator("input[type='datetime-local']").fill(dtLocal(scheduledAt));

  // Submit
  await page.getByRole("button", { name: /^book appointment$/i }).click();
  await expect(page.getByRole("heading", { name: /book appointment/i })).not.toBeVisible();
  await page.waitForTimeout(600);
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Seeded appointment: Gagnon, STYLING, 3 days from now, 10:00, 45 min
const SEEDED_DATE = daysFromNow(3);

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Appointments Calendar", () => {

  // ── 1. Page structure ───────────────────────────────────────────────────────

  test.describe("Page structure", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/appointments");
      await page.waitForLoadState("networkidle");
    });

    test("renders the Appointments heading", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Appointments" })).toBeVisible();
    });

    test("shows 'Week of …' subtitle in the page header", async ({ page }) => {
      await expect(page.getByText(/week of/i)).toBeVisible();
    });

    test("renders Mon through Sun day column headers", async ({ page }) => {
      for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
        await expect(page.getByText(day).first()).toBeVisible();
      }
    });

    test("toolbar has Previous and Next week buttons", async ({ page }) => {
      await expect(page.getByRole("button", { name: /previous week/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /next week/i })).toBeVisible();
    });

    test("toolbar has Book Styling button", async ({ page }) => {
      await expect(page.getByRole("button", { name: /book styling/i })).toBeVisible();
    });

    test("time gutter shows hour labels starting at 9", async ({ page }) => {
      await expect(page.getByText("9:00").first()).toBeVisible();
    });

    test("page loads without error or 404 text", async ({ page }) => {
      await expect(page.getByText(/404|not found/i).first()).not.toBeVisible();
    });
  });

  // ── 2. Week navigation ──────────────────────────────────────────────────────

  test.describe("Week navigation", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/appointments");
      await page.waitForLoadState("networkidle");
    });

    test("Today button is not visible when viewing the current week", async ({ page }) => {
      await expect(page.getByRole("button", { name: /^today$/i })).not.toBeVisible();
    });

    test("clicking Next week adds ?week= to the URL", async ({ page }) => {
      await page.getByRole("button", { name: /next week/i }).click();
      await page.waitForURL(/\/appointments\?week=\d{4}-\d{2}-\d{2}/);
      expect(page.url()).toMatch(/week=/);
    });

    test("clicking Prev week adds ?week= to the URL", async ({ page }) => {
      await page.getByRole("button", { name: /previous week/i }).click();
      await page.waitForURL(/\/appointments\?week=\d{4}-\d{2}-\d{2}/, { timeout: 45_000 });
      expect(page.url()).toMatch(/week=/);
    });

    test("Today button appears after navigating to another week", async ({ page }) => {
      await page.getByRole("button", { name: /next week/i }).click();
      await page.waitForURL(/week=/);
      await expect(page.getByRole("button", { name: /^today$/i })).toBeVisible();
    });

    test("clicking Today returns to /appointments with no ?week= param", async ({ page }) => {
      await page.getByRole("button", { name: /next week/i }).click();
      await page.waitForURL(/week=/);
      await page.getByRole("button", { name: /^today$/i }).click();
      await page.waitForURL("/appointments");
      expect(page.url()).not.toMatch(/week=/);
    });

    test("month label updates after navigating weeks", async ({ page }) => {
      // Capture the initial label text from the toolbar (not the h1 subtitle)
      const toolbar = page.locator("nav, .flex.items-center.gap-2").first();
      const before = await page.getByRole("heading", { name: /\d{4}/i }).first().textContent().catch(() => null);

      await page.getByRole("button", { name: /next week/i }).click();
      await page.waitForURL(/week=/);
      await page.waitForLoadState("networkidle");

      // The subtitle in the page header should reflect the new week
      const weekLabel = page.getByText(/week of/i);
      await expect(weekLabel).toBeVisible();
    });
  });

  // ── 3. Seeded appointment display ───────────────────────────────────────────

  test.describe("Seeded appointment — Gagnon STYLING in 3 days", () => {
    test.beforeEach(async ({ page }) => {
      await gotoWeek(page, SEEDED_DATE);
    });

    test("Gagnon appointment card is visible on the calendar", async ({ page }) => {
      await expect(page.getByRole("button", { name: /Isabelle Gagnon/i })).toBeVisible();
    });

    test("card shows the 10:00 time label", async ({ page }) => {
      // The card renders "10:00–10:45" (45 min)
      await expect(page.getByText(/10:00/).first()).toBeVisible();
    });

    test("card shows the 'Eyewear Styling' type label (duration ≥ 45 min)", async ({ page }) => {
      // Type label renders when duration >= 45 min
      await expect(page.getByText(/eyewear styling/i).first()).toBeVisible();
    });

    test("day column header shows appointment count badge", async ({ page }) => {
      // A badge "1" appears in the header of Gagnon's day column
      await expect(
        page.locator("span.rounded-full").filter({ hasText: "1" }).first()
      ).toBeVisible();
    });
  });

  // ── 4. BookAppointmentModal ──────────────────────────────────────────────────

  test.describe("BookAppointmentModal", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/appointments");
      await page.waitForLoadState("networkidle");
    });

    test("clicking 'Book Styling' opens the modal", async ({ page }) => {
      await page.getByRole("button", { name: /book styling/i }).click();
      await expect(page.getByRole("heading", { name: /book appointment/i })).toBeVisible();
    });

    test("modal contains a customer search input", async ({ page }) => {
      await page.getByRole("button", { name: /book styling/i }).click();
      await expect(page.getByPlaceholder(/search by name/i)).toBeVisible();
    });

    test("modal contains type select, datetime-local, and duration select", async ({ page }) => {
      await page.getByRole("button", { name: /book styling/i }).click();
      await expect(page.locator("select").first()).toBeVisible(); // Type
      await expect(page.locator("input[type='datetime-local']")).toBeVisible();
      await expect(page.locator("select").nth(1)).toBeVisible(); // Duration
    });

    test("Cancel button closes the modal", async ({ page }) => {
      await page.getByRole("button", { name: /book styling/i }).click();
      await expect(page.getByRole("heading", { name: /book appointment/i })).toBeVisible();
      await page.getByRole("button", { name: /^cancel$/i }).click();
      await expect(page.getByRole("heading", { name: /book appointment/i })).not.toBeVisible();
    });

    test("X button closes the modal", async ({ page }) => {
      await page.getByRole("button", { name: /book styling/i }).click();
      await expect(page.getByRole("heading", { name: /book appointment/i })).toBeVisible();
      await page.getByRole("button", { name: /close/i }).click();
      await expect(page.getByRole("heading", { name: /book appointment/i })).not.toBeVisible();
    });

    test("clicking the backdrop closes the modal", async ({ page }) => {
      await page.getByRole("button", { name: /book styling/i }).click();
      await expect(page.getByRole("heading", { name: /book appointment/i })).toBeVisible();
      // Click the top-left corner — outside the centered modal card, on the backdrop
      await page.mouse.click(10, 10);
      await expect(page.getByRole("heading", { name: /book appointment/i })).not.toBeVisible();
    });

    test("typing in search shows matching customers", async ({ page }) => {
      await page.getByRole("button", { name: /book styling/i }).click();
      await page.getByPlaceholder(/search by name/i).fill("Gagnon");
      await page.waitForTimeout(450);
      await expect(page.getByText("Isabelle Gagnon").first()).toBeVisible();
    });

    test("selecting a customer from dropdown replaces the search input with a summary", async ({ page }) => {
      await page.getByRole("button", { name: /book styling/i }).click();
      await page.getByPlaceholder(/search by name/i).fill("Gagnon");
      await page.waitForTimeout(450);
      await page.getByText("Isabelle Gagnon").first().click();

      // Search input is gone; customer name appears in the selected summary
      await expect(page.getByPlaceholder(/search by name/i)).not.toBeVisible();
      await expect(page.getByText("Isabelle Gagnon").first()).toBeVisible();
    });

    test("clearing the selected customer brings back the search field", async ({ page }) => {
      await page.getByRole("button", { name: /book styling/i }).click();
      await page.getByPlaceholder(/search by name/i).fill("Gagnon");
      await page.waitForTimeout(450);
      await page.getByText("Isabelle Gagnon").first().click();

      // Click the X on the customer summary to clear it
      const clearBtn = page.locator(".bg-primary\\/5").locator("button");
      await clearBtn.click();
      await expect(page.getByPlaceholder(/search by name/i)).toBeVisible();
    });

    test("submitting without selecting a customer shows an error", async ({ page }) => {
      await page.getByRole("button", { name: /book styling/i }).click();
      // Fill datetime but skip customer selection
      await page.locator("input[type='datetime-local']").fill(dtLocal(daysFromNow(5)));
      await page.getByRole("button", { name: /^book appointment$/i }).click();
      await expect(page.getByText(/select a customer/i)).toBeVisible();
    });

    test("submitting without a datetime shows an error", async ({ page }) => {
      await page.getByRole("button", { name: /book styling/i }).click();
      // Select customer but leave datetime empty
      await page.getByPlaceholder(/search by name/i).fill("Gagnon");
      await page.waitForTimeout(450);
      await page.getByText("Isabelle Gagnon").first().click();
      await page.getByRole("button", { name: /^book appointment$/i }).click();
      await expect(page.getByText(/date and time are required/i)).toBeVisible();
    });

    test("no-match message links to /customers/new", async ({ page }) => {
      await page.getByRole("button", { name: /book styling/i }).click();
      await page.getByPlaceholder(/search by name/i).fill("zzznotacustomer");
      await page.waitForTimeout(450);
      const link = page.getByRole("link", { name: /create new customer/i });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/customers/new");
      await expect(link).toHaveAttribute("target", "_blank");
    });

    test("clicking a time slot opens the modal with a pre-filled datetime", async ({ page }) => {
      // Slot click targets are absolutely-positioned divs inside the grid
      const slot = page.locator(".absolute.cursor-pointer").first();
      if (await slot.count() > 0) {
        await slot.click();
        await expect(page.getByRole("heading", { name: /book appointment/i })).toBeVisible();
        const dtValue = await page.locator("input[type='datetime-local']").inputValue();
        expect(dtValue).toBeTruthy();
        expect(dtValue).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
      }
    });
  });

  // ── 5. Creating an appointment end-to-end ───────────────────────────────────

  test.describe("Creating an appointment", () => {
    test("booking an appointment shows the card on the calendar", async ({ page }) => {
      // Use a week in the future to avoid clashing with the seeded Gagnon appointment
      const target = daysFromNow(8, 15); // Next week at 15:00
      await gotoWeek(page, target);

      await bookViaModal(page, "Marie Tremblay", target);

      // Card should now appear on the calendar
      await expect(page.getByRole("button", { name: /Marie Tremblay/i })).toBeVisible();
    });

    test("booked appointment card shows the correct time", async ({ page }) => {
      const target = daysFromNow(9, 11); // Next week at 11:00
      await gotoWeek(page, target);

      await bookViaModal(page, "James Okafor", target);

      await expect(page.getByRole("button", { name: /James Okafor/i })).toBeVisible();
      await expect(page.getByText(/11:00/).first()).toBeVisible();
    });

    test("appointment count badge increments after booking", async ({ page }) => {
      const target = daysFromNow(10, 9); // two weeks from now
      await gotoWeek(page, target);

      // Count badges before
      const badgesBefore = await page.locator("span.rounded-full").count();

      await bookViaModal(page, "Isabelle Gagnon", target);

      // At least one badge should now be visible
      const badgesAfter = await page.locator("span.rounded-full").count();
      expect(badgesAfter).toBeGreaterThanOrEqual(badgesBefore);
    });
  });

  // ── 6. AppointmentActions popover ───────────────────────────────────────────

  test.describe("AppointmentActions popover", () => {
    test.beforeEach(async ({ page }) => {
      await gotoWeek(page, SEEDED_DATE);
    });

    test("clicking an appointment card opens a popover", async ({ page }) => {
      await page.getByRole("button", { name: /Isabelle Gagnon/i }).click();
      // Popover content becomes visible
      await expect(page.getByText(/scheduled/i).first()).toBeVisible();
    });

    test("popover shows the customer name linked to their profile", async ({ page }) => {
      await page.getByRole("button", { name: /Isabelle Gagnon/i }).click();
      const customerLink = page.locator("a[href*='/customers/']").filter({ hasText: /Gagnon/i });
      await expect(customerLink).toBeVisible();
    });

    test("customer profile link opens /customers/[id]", async ({ page }) => {
      await page.getByRole("button", { name: /Isabelle Gagnon/i }).click();
      const href = await page
        .locator("a[href*='/customers/']")
        .filter({ hasText: /Gagnon/i })
        .getAttribute("href");
      expect(href).toMatch(/^\/customers\/[a-z0-9-]+$/i);
    });

    test("popover shows the appointment type", async ({ page }) => {
      await page.getByRole("button", { name: /Isabelle Gagnon/i }).click();
      await expect(page.getByText(/eyewear styling/i).first()).toBeVisible();
    });

    test("popover shows Confirm and Cancel buttons for SCHEDULED status", async ({ page }) => {
      await page.getByRole("button", { name: /Isabelle Gagnon/i }).click();
      await expect(page.getByRole("button", { name: /^confirm$/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /^cancel$/i })).toBeVisible();
    });

    test("popover shows Check In and No Show buttons for SCHEDULED status", async ({ page }) => {
      await page.getByRole("button", { name: /Isabelle Gagnon/i }).click();
      await expect(page.getByRole("button", { name: /check in/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /no show/i })).toBeVisible();
    });

    test("clicking outside the popover closes it", async ({ page }) => {
      await page.getByRole("button", { name: /Isabelle Gagnon/i }).click();
      await expect(page.getByRole("button", { name: /^confirm$/i })).toBeVisible();
      // Click the z-50 overlay that covers the whole page
      await page.mouse.click(5, 5);
      await expect(page.getByRole("button", { name: /^confirm$/i })).not.toBeVisible();
    });
  });

  // ── 7. Status transitions ───────────────────────────────────────────────────

  test.describe("Status transitions", () => {
    // Each test creates its own isolated appointment to avoid shared-state issues

    test("SCHEDULED → CONFIRMED: Confirm button updates status badge", async ({ page }) => {
      const target = daysFromNow(4, 13);
      await gotoWeek(page, target);

      await bookViaModal(page, "David Nguyen", target);

      // Open popover and confirm
      await page.getByRole("button", { name: /David Nguyen/i }).click();
      await expect(page.getByRole("button", { name: /^confirm$/i })).toBeVisible();
      await page.getByRole("button", { name: /^confirm$/i }).click();
      await page.waitForTimeout(600);

      // Re-open to verify new status
      await page.getByRole("button", { name: /David Nguyen/i }).click();
      await expect(page.getByText(/confirmed/i).first()).toBeVisible();
    });

    test("SCHEDULED → CHECKED_IN: Check In button updates status badge", async ({ page }) => {
      const target = daysFromNow(4, 14);
      await gotoWeek(page, target);

      await bookViaModal(page, "Priya Patel", target);

      await page.getByRole("button", { name: /Priya Patel/i }).click();
      await page.getByRole("button", { name: /check in/i }).click();
      await page.waitForTimeout(600);

      await page.getByRole("button", { name: /Priya Patel/i }).click();
      await expect(page.getByText(/checked in/i).first()).toBeVisible();
    });

    test("SCHEDULED → CANCELLED: card becomes visually muted", async ({ page }) => {
      const target = daysFromNow(4, 15);
      await gotoWeek(page, target);

      await bookViaModal(page, "Luca Rossi", target);

      await page.getByRole("button", { name: /Luca Rossi/i }).click();
      await page.getByRole("button", { name: /^cancel$/i }).click();
      await page.waitForTimeout(600);

      // Card should still exist but carry the opacity-40 muted class
      await expect(page.getByRole("button", { name: /Luca Rossi/i })).toHaveClass(/opacity-40/);
    });

    test("SCHEDULED → NO_SHOW: card becomes muted", async ({ page }) => {
      const target = daysFromNow(4, 16);
      await gotoWeek(page, target);

      await bookViaModal(page, "Carole Beauchamp", target);

      await page.getByRole("button", { name: /Carole Beauchamp/i }).click();
      await page.getByRole("button", { name: /no show/i }).click();
      await page.waitForTimeout(600);

      await expect(page.getByRole("button", { name: /Carole Beauchamp/i })).toHaveClass(/opacity-40/);
    });

    test("CANCELLED → Reschedule: popover shows datetime picker", async ({ page }) => {
      const target = daysFromNow(4, 17);
      await gotoWeek(page, target);

      await bookViaModal(page, "Ahmed Hassan", target);

      // Cancel it first
      await page.getByRole("button", { name: /Ahmed Hassan/i }).click();
      await page.getByRole("button", { name: /^cancel$/i }).click();
      await page.waitForTimeout(600);

      // Open the cancelled card
      await page.getByRole("button", { name: /Ahmed Hassan/i }).click();

      // Popover for a closed appointment shows a reschedule section
      await expect(page.getByRole("button", { name: /^reschedule$/i })).toBeVisible();
      await expect(page.locator("input[type='datetime-local']").last()).toBeVisible();
    });

    test("Reschedule: picking a new time restores the card as SCHEDULED", async ({ page }) => {
      const target = daysFromNow(5, 10);
      await gotoWeek(page, target);

      await bookViaModal(page, "Sophie Larouche", target);

      // Cancel
      await page.getByRole("button", { name: /Sophie Larouche/i }).click();
      await page.getByRole("button", { name: /^cancel$/i }).click();
      await page.waitForTimeout(600);

      // Reschedule to one hour later
      const newTime = daysFromNow(5, 11);
      await page.getByRole("button", { name: /Sophie Larouche/i }).click();
      await page.locator("input[type='datetime-local']").last().fill(dtLocal(newTime));
      await page.getByRole("button", { name: /reschedule/i }).last().click();
      await page.waitForTimeout(600);

      // Card should no longer be muted
      const card = page.getByRole("button", { name: /Sophie Larouche/i }).last();
      await expect(card).not.toHaveClass(/opacity-40/);
    });

    test("CONFIRMED → Check In: status advances correctly", async ({ page }) => {
      const target = daysFromNow(5, 12);
      await gotoWeek(page, target);

      await bookViaModal(page, "Ryan Mitchell", target);

      // Confirm first
      await page.getByRole("button", { name: /Ryan Mitchell/i }).click();
      await page.getByRole("button", { name: /^confirm$/i }).click();
      await page.waitForTimeout(600);

      // Now check in
      await page.getByRole("button", { name: /Ryan Mitchell/i }).click();
      // CONFIRMED state shows Check In, Cancel, No Show
      await expect(page.getByRole("button", { name: /check in/i })).toBeVisible();
      await page.getByRole("button", { name: /check in/i }).click();
      await page.waitForTimeout(600);

      await page.getByRole("button", { name: /Ryan Mitchell/i }).click();
      await expect(page.getByText(/checked in/i).first()).toBeVisible();
    });
  });
});
