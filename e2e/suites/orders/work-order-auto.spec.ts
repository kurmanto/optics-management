/**
 * Work Order Auto-Generation
 *
 * When staff clicks "Send to Lab" on a non-exam order, the work order should
 * automatically open in a new tab with ?autoprint=true.
 * Eye exam orders (EXAM_ONLY) must NOT trigger the new tab.
 *
 * Uses the dedicated confirmedGlassesOrderId / confirmedExamOrderId fixtures
 * seeded by prisma/seed-e2e.ts.  These orders are CONFIRMED at seed time and
 * are not touched by any other spec.
 */

import { test, expect } from "@playwright/test";
import { getTestFixtures } from "../../helpers/test-data";

test.describe("Work Order Auto-Generation", () => {
  test("Send to Lab on a GLASSES order opens work order in a new tab with autoprint", async ({
    page,
  }) => {
    const fixtures = getTestFixtures();
    await page.goto(`/orders/${fixtures.confirmedGlassesOrderId}`);
    await page.waitForLoadState("networkidle");

    // Sanity-check: button label matches CONFIRMED → LAB_ORDERED transition
    const sendToLabBtn = page.getByRole("button", { name: "Send to Lab" });
    await expect(sendToLabBtn).toBeVisible();

    // Listen for the new tab that window.open() will create
    const [newPage] = await Promise.all([
      page.context().waitForEvent("page", { timeout: 15_000 }),
      sendToLabBtn.click(),
    ]);

    await newPage.waitForLoadState("domcontentloaded");

    // Verify new tab URL targets the work-order page with autoprint flag
    expect(newPage.url()).toContain("/work-order");
    expect(newPage.url()).toContain("autoprint=true");

    // Verify the work order document renders (MINTVISION header)
    await expect(
      newPage.getByText(/MINTVISION|WORK ORDER/i).first()
    ).toBeVisible({ timeout: 15_000 });

    await newPage.close();

    // Verify the original page advanced to LAB_ORDERED
    await expect(page.getByText("Lab Ordered")).toBeVisible({ timeout: 15_000 });
  });

  test("Send to Lab on an EXAM_ONLY order does NOT open a new tab", async ({
    page,
  }) => {
    const fixtures = getTestFixtures();
    await page.goto(`/orders/${fixtures.confirmedExamOrderId}`);
    await page.waitForLoadState("networkidle");

    const sendToLabBtn = page.getByRole("button", { name: "Send to Lab" });
    await expect(sendToLabBtn).toBeVisible();

    // Track whether any new tab is opened
    let newTabOpened = false;
    page.context().on("page", () => {
      newTabOpened = true;
    });

    await sendToLabBtn.click();

    // Wait long enough for a tab to appear if it were going to
    await page.waitForTimeout(3_000);

    expect(newTabOpened).toBe(false);

    // Order should still advance to LAB_ORDERED normally
    await expect(page.getByText("Lab Ordered")).toBeVisible({ timeout: 15_000 });
  });

  test("work order page renders correctly for a seeded order", async ({ page }) => {
    const fixtures = getTestFixtures();
    // Use the okafor READY order — it has frame data and an invoice
    await page.goto(`/orders/${fixtures.orderId.okafor}/work-order`);
    await page.waitForLoadState("networkidle");

    // Header
    await expect(page.getByText(/MINTVISION WORK ORDER/i)).toBeVisible();

    // Customer name (Okafor)
    await expect(page.getByText(/Okafor/)).toBeVisible();

    // Frame brand seeded for Okafor (frameIdx=1 → RB3025)
    await expect(page.getByText(/Ray-Ban/)).toBeVisible();

    // Print button is visible in UI mode
    await expect(page.getByRole("button", { name: /print work order/i })).toBeVisible();
  });

  test("work order page with ?autoprint=true does not crash", async ({ page }) => {
    const fixtures = getTestFixtures();
    // Suppress the actual window.print() to avoid blocking the test
    await page.addInitScript(() => {
      window.print = () => {};
    });

    await page.goto(
      `/orders/${fixtures.orderId.okafor}/work-order?autoprint=true`
    );
    await page.waitForLoadState("networkidle");

    // Page still renders correctly
    await expect(page.getByText(/MINTVISION WORK ORDER/i)).toBeVisible();
  });
});
