/**
 * Order Create Spec
 * Tests the /orders/new wizard: step 1 renders, customer selection, navigation.
 */

import { test, expect } from "@playwright/test";
import { getTestFixtures } from "../../helpers/test-data";

test.describe("New Order Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/orders/new");
    await expect(page).toHaveURL("/orders/new");
  });

  test("renders the New Order page heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "New Order" })).toBeVisible();
  });

  test("wizard step 1 shows Select Customer heading", async ({ page }) => {
    // Step 1 always shows customer selection
    await expect(page.getByRole("heading", { name: "Select Customer" })).toBeVisible();
  });

  test("wizard step 1 has a customer search input", async ({ page }) => {
    // Customer search field is on step 1
    await expect(page.getByPlaceholder(/search|customer/i).first()).toBeVisible();
  });

  test("cancel or back navigates away from wizard", async ({ page }) => {
    const cancelBtn = page
      .getByRole("button", { name: /cancel/i })
      .or(page.getByRole("link", { name: /cancel/i }))
      .or(page.locator("[href='/orders']"))
      .first();

    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
      await expect(page).toHaveURL(/\/orders/);
    }
  });

  test("new order wizard is reachable from the orders list", async ({ page }) => {
    await page.goto("/orders");
    await page.getByRole("link", { name: "New Order" }).click();
    await expect(page).toHaveURL("/orders/new");
  });

  test("new order wizard is reachable from the board", async ({ page }) => {
    await page.goto("/orders/board");
    await page.getByRole("link", { name: "New Order" }).click();
    await expect(page).toHaveURL("/orders/new");
  });

  test("new order can be started from a customer's detail page", async ({ page }) => {
    const fixtures = getTestFixtures();
    const customerId = fixtures.customerIds["Tremblay"];

    await page.goto(`/customers/${customerId}`);
    const newOrderLink = page
      .getByRole("link", { name: /new order/i })
      .or(page.getByRole("button", { name: /new order/i }))
      .first();
    await expect(newOrderLink).toBeVisible();
    await newOrderLink.click();
    // Should navigate to orders/new (possibly with ?customerId= pre-filled)
    await expect(page).toHaveURL(/\/orders\/new/);
  });
});
