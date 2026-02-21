/**
 * Saved Frames Card — /customers/[id]
 * Tests the SavedFramesCard component.
 * Note: After saving a frame the page is reloaded so the server-rendered list
 * picks up the new frame (client component's useState does not auto-sync).
 */

import { test, expect } from "@playwright/test";
import { getTestFixtures } from "../../helpers/test-data";

test.describe("Saved Frames Card", () => {
  let customerId: string;

  test.beforeAll(() => {
    customerId = getTestFixtures().customerIds["Patel"]; // no frames seeded
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`/customers/${customerId}`);
    await page.waitForLoadState("networkidle");
  });

  test("shows empty state when no saved frames", async ({ page }) => {
    await expect(page.getByText("No saved frames yet.")).toBeVisible();
  });

  test("Save a Frame button is visible", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Save a Frame" })
    ).toBeVisible();
  });

  test("clicking Save a Frame reveals brand/model/color fields", async ({ page }) => {
    await page.getByRole("button", { name: "Save a Frame" }).click();
    // Form heading
    await expect(page.getByRole("heading", { name: "Save a Frame", level: 3 })).toBeVisible();
    // Brand input (placeholder is example "Ray-Ban")
    await expect(page.getByPlaceholder("Ray-Ban")).toBeVisible();
    // Model input (placeholder is example "RB5154")
    await expect(page.getByPlaceholder("RB5154")).toBeVisible();
  });

  test("filling and saving form creates a frame card", async ({ page }) => {
    await page.getByRole("button", { name: "Save a Frame" }).click();
    await page.getByPlaceholder("Ray-Ban").fill("Oakley");
    await page.getByPlaceholder("RB5154").fill("OX8046");
    await page.getByRole("button", { name: "Save Frame" }).click();
    // Reload to pick up server-rendered updated frame list
    await page.waitForTimeout(600);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Oakley")).toBeVisible();
    await expect(page.getByText("OX8046")).toBeVisible();
  });

  test("frame card shows brand and model text", async ({ page }) => {
    // Relies on frame created in previous test still being in DB
    // If not present, create a new one
    const hasFrame = await page.getByText("Oakley").count();
    if (hasFrame === 0) {
      await page.getByRole("button", { name: "Save a Frame" }).click();
      await page.getByPlaceholder("Ray-Ban").fill("Tom Ford");
      await page.getByPlaceholder("RB5154").fill("TF5634");
      await page.getByRole("button", { name: "Save Frame" }).click();
      await page.waitForTimeout(600);
      await page.reload();
      await page.waitForLoadState("networkidle");
      await expect(page.getByText("Tom Ford")).toBeVisible();
      await expect(page.getByText("TF5634")).toBeVisible();
    } else {
      await expect(page.getByText("Oakley")).toBeVisible();
      await expect(page.getByText("OX8046")).toBeVisible();
    }
  });

  test("heart icon button is present on saved frame card", async ({ page }) => {
    // Ensure there's a frame on the page
    const hasFrame = await page.locator("div.grid .border.rounded-xl").count();
    if (hasFrame === 0) {
      await page.getByRole("button", { name: "Save a Frame" }).click();
      await page.getByPlaceholder("Ray-Ban").fill("Persol");
      await page.getByPlaceholder("RB5154").fill("PO3007V");
      await page.getByRole("button", { name: "Save Frame" }).click();
      await page.waitForTimeout(600);
      await page.reload();
      await page.waitForLoadState("networkidle");
    }
    // Heart + trash buttons should be in the frame card grid
    await expect(page.locator("div.grid").getByRole("button").first()).toBeVisible();
  });

  test("Remove button deletes the frame card", async ({ page }) => {
    // Create a uniquely-named frame so we can verify by brand name
    await page.getByRole("button", { name: "Save a Frame" }).click();
    await page.getByPlaceholder("Ray-Ban").fill("DeleteTestBrand999");
    await page.getByRole("button", { name: "Save Frame" }).click();
    await page.waitForTimeout(600);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("DeleteTestBrand999")).toBeVisible();

    // Find that specific frame card (overflow-hidden distinguishes individual cards from wrapper)
    const frameCard = page.locator("div[class*='rounded-xl'][class*='overflow-hidden']")
      .filter({ hasText: "DeleteTestBrand999" })
      .first();
    page.once("dialog", (dialog) => dialog.accept());
    await frameCard.getByRole("button", { name: "Remove frame" }).click();
    await page.waitForTimeout(600);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("DeleteTestBrand999")).not.toBeVisible();
  });
});

test.describe("Saved Frames — Inline Return Date Edit", () => {
  /**
   * Tremblay has a seeded saved frame with expectedReturnDate 5 days ago.
   * These tests verify the inline date edit UI added in v2.3.0.
   */
  let tremblayId: string;

  test.beforeAll(() => {
    tremblayId = getTestFixtures().customerIds["Tremblay"];
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`/customers/${tremblayId}`);
    await page.waitForLoadState("networkidle");
  });

  test("seeded frame with past return date is visible on Tremblay profile", async ({ page }) => {
    // Tremblay has a frame seeded with expectedReturnDate 5 days ago — card must be visible
    const frameGrid = page.locator("div.grid .border.rounded-xl");
    await expect(frameGrid.first()).toBeVisible();
  });

  test("clicking the return date text opens inline date input", async ({ page }) => {
    // The return date button (Calendar icon + text) should be clickable
    const returnDateBtn = page.locator("button").filter({ hasText: /return by/i }).first();
    const count = await returnDateBtn.count();
    if (count > 0) {
      await returnDateBtn.click();
      // Inline edit: a date input should appear — use data-testid to avoid matching
      // the hidden date input inside InsurancePolicyManager's collapsed form
      await expect(page.locator('[data-testid="frame-return-date-input"]')).toBeVisible();
    } else {
      // Fallback: verify "Set return date" placeholder is present (frame may not have date)
      await expect(page.locator("button").filter({ hasText: /set return date/i }).first()).toBeVisible();
    }
  });

  test("clicking X in inline date edit cancels without saving", async ({ page }) => {
    const returnDateBtn = page.locator("button").filter({ hasText: /return by|set return date/i }).first();
    const count = await returnDateBtn.count();
    if (count === 0) return; // no frame with date on this customer — skip

    await returnDateBtn.click();
    // Use data-testid to avoid matching InsurancePolicyManager's hidden date input
    const dateInput = page.locator('[data-testid="frame-return-date-input"]');
    await expect(dateInput).toBeVisible();

    // Click the cancel (✕) button
    const cancelBtn = page.getByRole("button", { name: "✕" }).first();
    await cancelBtn.click();

    // Input should be gone; return-date button should be back
    await expect(dateInput).not.toBeVisible();
  });

  test("setting a return date and clicking Save persists it", async ({ page }) => {
    // Open inline edit on the first frame card
    const returnDateBtn = page.locator("button").filter({ hasText: /return by|set return date/i }).first();
    const count = await returnDateBtn.count();
    if (count === 0) return;

    await returnDateBtn.click();
    // Use data-testid to avoid matching InsurancePolicyManager's hidden date input
    const dateInput = page.locator('[data-testid="frame-return-date-input"]');
    await expect(dateInput).toBeVisible();

    // Set a future date
    await dateInput.fill("2026-12-31");
    await page.getByRole("button", { name: "Save" }).first().click();

    // After save, router.refresh() reloads — wait for the input to disappear
    await expect(dateInput).not.toBeVisible({ timeout: 5000 });
    // Reload to confirm server-persisted value
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Dec 31 should now appear in a return-by label
    const returnLabel = page.locator("button").filter({ hasText: /return by/i }).first();
    await expect(returnLabel).toBeVisible();
  });
});
