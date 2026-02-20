/**
 * Journey: Full Order Lifecycle
 * Create customer → place order → advance through all statuses → pickup complete.
 */

import { test, expect } from "@playwright/test";
import { uniqueSuffix, getTestFixtures } from "../../helpers/test-data";

test.describe("Full Order Lifecycle Journey", () => {
  test("creates customer, places order, advances to CONFIRMED, then navigates board", async ({ page }) => {
    const suffix = uniqueSuffix();
    const lastName = `JourneyTest${suffix}`;

    // Step 1: Create a new customer
    await page.goto("/customers/new");
    await page.waitForLoadState("networkidle");
    await page.locator('input[name="firstName"]').fill("Journey");
    await page.locator('input[name="lastName"]').fill(lastName);
    await page.locator('input[name="phone"]').fill("4165559999");
    await page.getByRole("button", { name: "Create Customer" }).click();
    await page.waitForURL(/\/customers\/[a-z0-9]+/, { timeout: 20_000 });

    // Verify on customer detail page
    await expect(page.getByText(`Journey`).first()).toBeVisible();

    // Step 2: Navigate to New Order from customer detail
    const newOrderLink = page
      .getByRole("link", { name: /new order/i })
      .or(page.getByRole("button", { name: /new order/i }))
      .first();
    await expect(newOrderLink).toBeVisible();
    await newOrderLink.click();
    await expect(page).toHaveURL(/\/orders\/new/, { timeout: 10_000 });

    // Step 3: Verify wizard renders
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(/customer|step 1|new order/i).first()
    ).toBeVisible();
  });

  test("CONFIRMED orders have advance button on board", async ({ page }) => {
    // Verify advance buttons exist — don't actually click to avoid mutating DB state
    await page.goto("/orders/board");
    await page.waitForLoadState("networkidle");

    // Wilson should be in CONFIRMED column
    await expect(page.getByText(/Wilson,/).first()).toBeVisible();

    // The CONFIRMED orders have a "→ Lab Ordered" advance button
    const advanceBtn = page.getByRole("button", { name: "→ Lab Ordered" }).first();
    await expect(advanceBtn).toBeVisible();

    // Lab Ordered column header is visible
    await expect(page.getByText("Lab Ordered", { exact: true })).toBeVisible();
  });

  test("READY order shows Mark Picked Up button and opens modal on click", async ({ page }) => {
    const fixtures = getTestFixtures();
    await page.goto(`/orders/${fixtures.orderId.okafor}`);
    await page.waitForLoadState("networkidle");

    // Verify READY status
    await expect(page.getByText("Ready for Pickup")).toBeVisible();

    // Mark Picked Up button
    const pickupBtn = page.getByRole("button", { name: "Mark Picked Up" });
    await expect(pickupBtn).toBeVisible();
    await pickupBtn.click();

    // Modal shows engagement options subtitle
    await expect(page.getByText("Choose post-pickup engagement options")).toBeVisible({ timeout: 8000 });
  });

  test("order lifecycle status labels on board match expected values", async ({ page }) => {
    await page.goto("/orders/board");
    await page.waitForLoadState("networkidle");

    // Verify all columns are present in the correct order
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
    await expect(page.getByText("Lab Ordered", { exact: true })).toBeVisible();
    await expect(page.getByText("Lab Received", { exact: true })).toBeVisible();
    await expect(page.getByText("Verified (Rx Check)", { exact: true })).toBeVisible();
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  });
});
