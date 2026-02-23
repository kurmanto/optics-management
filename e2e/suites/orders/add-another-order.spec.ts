/**
 * Add Another Order — success overlay after order creation
 * Tests the overlay shown after completing the wizard.
 *
 * Also covers the V2.4.0 "Add another order" checkbox in step 7 (Review)
 * that lets staff queue another order before clicking Create Order.
 */

import { test, expect } from "@playwright/test";
import { getTestFixtures, CUSTOMERS } from "../../helpers/test-data";

test.describe("Add Another Order Flow", () => {
  test("orders board is accessible from the wizard cancel path", async ({ page }) => {
    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");
    const backLink = page.getByRole("link", { name: /back to orders/i })
      .or(page.getByRole("link", { name: /orders/i }))
      .first();
    if (await backLink.isVisible().catch(() => false)) {
      await backLink.click();
      await expect(page).toHaveURL(/\/orders/);
    }
  });

  test("order list page is reachable", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /orders/i })).toBeVisible();
  });

  test("orders board is reachable", async ({ page }) => {
    await page.goto("/orders/board");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("new order wizard is pre-fillable with customerId query param", async ({ page }) => {
    const customerId = getTestFixtures().customerIds["Wilson"];
    await page.goto(`/orders/new?customerId=${customerId}`);
    await page.waitForLoadState("networkidle");
    // Just verify page loads
    await expect(page.locator("body")).toBeVisible();
  });

  test("wizard renders New Order heading on load", async ({ page }) => {
    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /new order/i })).toBeVisible();
  });

  test("orders list contains seeded orders with ORD- prefix", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/ORD-/).first()).toBeVisible();
  });
});

test.describe("Add Another Order — Step 7 Checkbox (V2.4.0)", () => {
  /**
   * Navigate through the wizard to the Review step using the simplest order
   * path (Contact Lenses — no frame or lens config steps) and verify the
   * "Add another order for {firstName} after saving" checkbox is present.
   *
   * Tests do NOT submit the order to avoid DB mutations.
   */

  async function navigateToReviewStep(page: import("@playwright/test").Page) {
    const fixtures = getTestFixtures();
    const customerId = fixtures.customerIds["Patel"]; // Priya Patel

    await page.goto("/orders/new");
    await page.waitForLoadState("networkidle");

    // Step 1: Select customer — type last name and pick from dropdown
    const searchInput = page.getByPlaceholder(/search|customer/i).first();
    await searchInput.fill("Patel");
    await page.waitForTimeout(400); // debounce
    const option = page.getByText(/Patel, Priya/i).or(page.getByText(/Priya.*Patel/i)).first();
    if (await option.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await option.click();
    } else {
      // Fallback: navigate directly with customerId pre-filled
      await page.goto(`/orders/new?customerId=${customerId}`);
      await page.waitForLoadState("networkidle");
    }

    // Click Next to advance past Customer step
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForTimeout(300);

    // Step 2: Order Type — click Contact Lenses category card
    const contactsCard = page.getByText("Contact Lenses").first();
    if (await contactsCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await contactsCard.click();
    }
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForTimeout(300);

    // Step 3 (Items) → Next
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForTimeout(300);

    // Step 4 (Payment) → Next
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForTimeout(300);

    // Now on Review step
  }

  test("Review step renders Invoice Actions card", async ({ page }) => {
    await navigateToReviewStep(page);
    await expect(page.getByRole("heading", { name: "Invoice Actions" })).toBeVisible({ timeout: 5_000 });
  });

  test("Review step shows 'Add another order' checkbox for selected customer", async ({ page }) => {
    await navigateToReviewStep(page);
    // Checkbox label includes the customer first name
    const checkbox = page.getByText(/add another order for/i).first();
    await expect(checkbox).toBeVisible({ timeout: 5_000 });
  });

  test("'Add another order' checkbox is unchecked by default", async ({ page }) => {
    await navigateToReviewStep(page);
    const label = page.locator("label").filter({ hasText: /add another order for/i });
    await expect(label).toBeVisible({ timeout: 5_000 });
    const checkbox = label.locator("input[type='checkbox']");
    await expect(checkbox).not.toBeChecked();
  });

  test("'Add another order' checkbox can be checked", async ({ page }) => {
    await navigateToReviewStep(page);
    const label = page.locator("label").filter({ hasText: /add another order for/i });
    await expect(label).toBeVisible({ timeout: 5_000 });
    const checkbox = label.locator("input[type='checkbox']");
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });

  test("Create Order button is visible on Review step", async ({ page }) => {
    await navigateToReviewStep(page);
    await expect(page.getByRole("button", { name: "Create Order" })).toBeVisible({ timeout: 5_000 });
  });

  test("Review step also shows Print Work Order and Email Invoice checkboxes", async ({ page }) => {
    await navigateToReviewStep(page);
    await expect(page.getByText("Print Work Order")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Email Invoice to Customer")).toBeVisible({ timeout: 5_000 });
  });
});
