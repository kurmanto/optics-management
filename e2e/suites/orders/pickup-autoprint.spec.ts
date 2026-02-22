/**
 * Pickup Auto-print Invoice (V2.4.0)
 *
 * When staff marks an order as Picked Up, the PickupCompleteModal now includes
 * a "Print invoice" checkbox (checked by default).  On confirming pickup,
 * the invoice is opened in a new tab with ?autoprint=true.
 *
 * The invoice page honours the ?autoprint=true query param by calling
 * window.print() after 600ms.
 *
 * Uses the Okafor READY order fixture.  Tests that open the modal but don't
 * confirm close via Cancel to avoid mutating the order status.
 */

import { test, expect } from "@playwright/test";
import { getTestFixtures } from "../../helpers/test-data";

test.describe("Pickup Modal — Print Invoice Checkbox", () => {
  let okaforOrderId: string;

  test.beforeAll(() => {
    okaforOrderId = getTestFixtures().orderId.okafor;
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`/orders/${okaforOrderId}`);
    await page.waitForLoadState("networkidle");

    // Open the pickup modal (don't confirm)
    const pickupBtn = page.getByRole("button", { name: "Mark Picked Up" });
    await expect(pickupBtn).toBeVisible({ timeout: 10_000 });
    await pickupBtn.click();
    await expect(page.getByText("Choose post-pickup engagement options")).toBeVisible({ timeout: 8_000 });
  });

  test("modal contains a Print invoice checkbox", async ({ page }) => {
    await expect(page.getByText("Print invoice")).toBeVisible();
  });

  test("Print invoice checkbox is checked by default", async ({ page }) => {
    // The "Print invoice" label has an associated checkbox; find the checkbox input
    const checkbox = page.locator("label").filter({ hasText: "Print invoice" }).locator("input[type='checkbox']");
    await expect(checkbox).toBeChecked();
  });

  test("Print invoice checkbox shows Recommended badge", async ({ page }) => {
    await expect(page.getByText("Recommended").last()).toBeVisible();
  });

  test("Print invoice checkbox can be unchecked", async ({ page }) => {
    const checkbox = page.locator("label").filter({ hasText: "Print invoice" }).locator("input[type='checkbox']");
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test("cancelling modal does not advance order status", async ({ page }) => {
    // Click Cancel
    await page.getByRole("button", { name: "Cancel" }).click();
    // Modal should close
    await expect(page.getByText("Choose post-pickup engagement options")).not.toBeVisible({ timeout: 5_000 });
    // Order should still be READY
    await expect(page.getByText("Ready for Pickup")).toBeVisible();
  });

  test("unchecking Print invoice then cancelling opens no new tab", async ({ page }) => {
    const checkbox = page.locator("label").filter({ hasText: "Print invoice" }).locator("input[type='checkbox']");
    await checkbox.uncheck();

    let newTabOpened = false;
    page.context().on("page", () => { newTabOpened = true; });

    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(1_500);

    expect(newTabOpened).toBe(false);
  });
});

test.describe("Invoice Page — ?autoprint Query Param", () => {
  let okaforOrderId: string;

  test.beforeAll(() => {
    okaforOrderId = getTestFixtures().orderId.okafor;
  });

  test("invoice page with ?autoprint=true renders correctly (window.print suppressed)", async ({ page }) => {
    // Suppress window.print() so the test doesn't block
    await page.addInitScript(() => {
      window.print = () => {};
    });

    await page.goto(`/orders/${okaforOrderId}/invoice?autoprint=true`);
    await page.waitForLoadState("networkidle");

    // Invoice document should render
    await expect(page.getByText(/INVOICE|Invoice/i).first()).toBeVisible();
    // Customer name Okafor
    await expect(page.getByText(/Okafor/)).toBeVisible();
  });

  test("invoice page with ?autoprint=true calls window.print after 600ms", async ({ page }) => {
    // Track whether window.print was called
    let printCalled = false;
    await page.addInitScript(() => {
      window.print = () => {
        (window as any).__printCalled = true;
      };
    });

    await page.goto(`/orders/${okaforOrderId}/invoice?autoprint=true`);
    await page.waitForLoadState("networkidle");

    // Wait >600ms for the setTimeout to fire
    await page.waitForTimeout(900);

    printCalled = await page.evaluate(() => !!(window as any).__printCalled);
    expect(printCalled).toBe(true);
  });

  test("invoice page without ?autoprint=true does NOT call window.print", async ({ page }) => {
    let printCalled = false;
    await page.addInitScript(() => {
      window.print = () => {
        (window as any).__printCalled = true;
      };
    });

    await page.goto(`/orders/${okaforOrderId}/invoice`);
    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(900);

    printCalled = await page.evaluate(() => !!(window as any).__printCalled);
    expect(printCalled).toBe(false);
  });

  test("invoice page with ?autoprint=true and ?view=internal also renders correctly", async ({ page }) => {
    await page.addInitScript(() => {
      window.print = () => {};
    });

    await page.goto(`/orders/${okaforOrderId}/invoice?view=internal&autoprint=true`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/INTERNAL|Internal/i).first()).toBeVisible();
  });
});
