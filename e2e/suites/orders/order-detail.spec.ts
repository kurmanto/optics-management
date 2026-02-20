/**
 * Order Detail — /orders/[id]
 * Tests order info display, status badge, action buttons, invoice/work order links.
 */

import { test, expect } from "@playwright/test";
import { getTestFixtures } from "../../helpers/test-data";

test.describe("Order Detail", () => {
  let okaforOrderId: string;
  let tremblayOrderId: string;

  test.beforeAll(() => {
    const fixtures = getTestFixtures();
    okaforOrderId = fixtures.orderId.okafor;
    tremblayOrderId = fixtures.orderId.tremblay;
  });

  test.describe("Okafor READY order", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/orders/${okaforOrderId}`);
      await page.waitForLoadState("networkidle");
    });

    test("shows order number with ORD- prefix", async ({ page }) => {
      await expect(page.getByText(/ORD-/).first()).toBeVisible();
    });

    test("shows Ready for Pickup status badge", async ({ page }) => {
      await expect(page.getByText("Ready for Pickup")).toBeVisible();
    });

    test("shows customer name Okafor", async ({ page }) => {
      await expect(page.getByText(/Okafor/).first()).toBeVisible();
    });

    test("shows frame brand Ray-Ban RB3025", async ({ page }) => {
      await expect(page.getByText(/Ray-Ban/).first()).toBeVisible();
      await expect(page.getByText(/RB3025/).first()).toBeVisible();
    });

    test("shows total amount (640 real)", async ({ page }) => {
      // totalCustomer = round(640 * 1.15) = 736
      await expect(page.getByText(/\$640|\$736/)).toBeVisible();
    });

    test("Invoice link is visible", async ({ page }) => {
      // Use .first() because sidebar also has an "Invoices" link
      await expect(page.getByRole("link", { name: /invoice/i }).first()).toBeVisible();
    });

    test("Work Order link is visible", async ({ page }) => {
      await expect(page.getByRole("link", { name: /work order/i })).toBeVisible();
    });

    test("Mark Picked Up advance button is visible", async ({ page }) => {
      await expect(page.getByRole("button", { name: "Mark Picked Up" }).or(
        page.getByText("Mark Picked Up")
      )).toBeVisible();
    });

    test("navigating to /orders/[id]/invoice loads invoice page", async ({ page }) => {
      await page.goto(`/orders/${okaforOrderId}/invoice`);
      await page.waitForLoadState("networkidle");
      // Invoice page should not be a 404
      await expect(page.getByText(/invoice|INVOICE/i).first()).toBeVisible();
    });

    test("navigating to /orders/[id]/work-order loads work order page", async ({ page }) => {
      await page.goto(`/orders/${okaforOrderId}/work-order`);
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/work order|WORK ORDER|MINTVISION/i).first()).toBeVisible();
    });
  });

  test.describe("Tremblay LAB_RECEIVED order", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/orders/${tremblayOrderId}`);
      await page.waitForLoadState("networkidle");
    });

    test("shows Lab Received status", async ({ page }) => {
      await expect(page.getByText("Lab Received")).toBeVisible();
    });

    test("shows customer name Tremblay", async ({ page }) => {
      await expect(page.getByText(/Tremblay/).first()).toBeVisible();
    });

    test("shows outstanding balance (520 real)", async ({ page }) => {
      // balanceReal=520, balanceCustomer=round(520*1.15)=598
      await expect(page.getByText(/\$520|\$598/)).toBeVisible();
    });

    test("Verify Rx advance button is visible", async ({ page }) => {
      await expect(page.getByRole("button", { name: "Verify Rx" }).or(
        page.getByText("Verify Rx")
      )).toBeVisible();
    });
  });

  test("invalid order ID shows not found or redirects", async ({ page }) => {
    await page.goto("/orders/invalid-order-id-xyz999");
    const url = page.url();
    const notFoundVisible = await page.getByText(/not found|404/i).isVisible().catch(() => false);
    const redirected = url.endsWith("/orders") || !url.includes("invalid-order-id-xyz999");
    expect(notFoundVisible || redirected).toBe(true);
  });
});
