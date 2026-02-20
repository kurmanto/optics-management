/**
 * Customer Detail — /customers/[id]
 * Tests profile card, contact info, orders, prescriptions, forms sections.
 */

import { test, expect } from "@playwright/test";
import { getTestFixtures, CUSTOMERS } from "../../helpers/test-data";

test.describe("Customer Detail Page", () => {
  let tremblayId: string;
  let wilsonId: string;

  test.beforeAll(() => {
    const fixtures = getTestFixtures();
    tremblayId = fixtures.customerIds["Tremblay"];
    wilsonId = fixtures.customerIds["Wilson"];
  });

  test.describe("Tremblay detail", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/customers/${tremblayId}`);
      await page.waitForLoadState("networkidle");
    });

    test("shows customer full name", async ({ page }) => {
      await expect(page.getByRole("heading", {
        name: `${CUSTOMERS.Tremblay.firstName} ${CUSTOMERS.Tremblay.lastName}`,
      })).toBeVisible();
    });

    test("shows formatted phone containing 514", async ({ page }) => {
      await expect(page.getByText(/514/).first()).toBeVisible();
    });

    test("shows lifecycle badge", async ({ page }) => {
      // Badge is a span with rounded-full class — just check it's present
      await expect(page.locator(".rounded-full").first()).toBeVisible();
    });

    test("Edit link navigates to /customers/[id]/edit", async ({ page }) => {
      const editLink = page.getByRole("link", { name: /edit/i }).first();
      await expect(editLink).toHaveAttribute("href", `/customers/${tremblayId}/edit`);
    });

    test("New Order link is visible", async ({ page }) => {
      await expect(page.getByRole("link", { name: /new order/i })).toBeVisible();
    });

    test("Orders section shows order count", async ({ page }) => {
      await expect(page.getByText(/Orders \(/)).toBeVisible();
    });

    test("Tremblay's seeded order with ORD- prefix appears", async ({ page }) => {
      await expect(page.getByText(/ORD-/).first()).toBeVisible();
    });

    test("Contact section shows phone", async ({ page }) => {
      await expect(page.getByText("Contact", { exact: true })).toBeVisible();
      await expect(page.getByText("Phone")).toBeVisible();
    });

    test("Lifecycle & Journey section shows LTV", async ({ page }) => {
      await expect(page.getByText("Lifetime Value")).toBeVisible();
    });

    test("Prescriptions section visible", async ({ page }) => {
      await expect(page.getByText("Prescriptions", { exact: true })).toBeVisible();
    });

    test("Forms & Documents section visible", async ({ page }) => {
      await expect(page.getByText(/Forms & Documents/)).toBeVisible();
    });
  });

  test("Wilson detail shows email address", async ({ page }) => {
    await page.goto(`/customers/${wilsonId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("emma.wilson@example.com")).toBeVisible();
  });
});
