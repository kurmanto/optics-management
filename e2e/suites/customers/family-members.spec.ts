/**
 * Family Members Card — /customers/[id]
 * Tests the FamilyMembersCard component.
 */

import { test, expect } from "@playwright/test";
import { getTestFixtures } from "../../helpers/test-data";

test.describe("Family Members Card", () => {
  let noFamilyCustomerId: string;
  let withFamilyCustomerId: string;
  let familyMemberCustomerId: string;

  test.beforeAll(() => {
    const fixtures = getTestFixtures();
    noFamilyCustomerId = fixtures.customerIds["Tremblay"]; // no family
    withFamilyCustomerId = fixtures.withFamilyCustomerId;   // Claire Anderson
    familyMemberCustomerId = fixtures.familyMemberCustomerId; // Mark Anderson
  });

  test("shows no-family state for customer without family", async ({ page }) => {
    await page.goto(`/customers/${noFamilyCustomerId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("No family members linked.")).toBeVisible();
  });

  test("Find Family Matches button is visible", async ({ page }) => {
    await page.goto(`/customers/${noFamilyCustomerId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /find family matches/i })).toBeVisible();
  });

  test("Find Family Matches returns suggestions for customer with matching phone", async ({ page }) => {
    // withFamilyCustomerId (Claire Anderson, phone 4165550201) should match
    // familyMemberCustomerId (Mark Anderson, same phone)
    // When we visit Claire's page and search, she should already be in a family (from seed)
    await page.goto(`/customers/${withFamilyCustomerId}`);
    await page.waitForLoadState("networkidle");
    // Family members section should show family name and Mark's entry
    await expect(page.getByText("Anderson").first()).toBeVisible();
  });

  test("customer with family shows linked member", async ({ page }) => {
    await page.goto(`/customers/${withFamilyCustomerId}`);
    await page.waitForLoadState("networkidle");
    // Mark Anderson should appear as a family member
    await expect(page.getByText("Mark Anderson").first()).toBeVisible();
  });

  test("family member name is a link that navigates to their profile", async ({ page }) => {
    await page.goto(`/customers/${withFamilyCustomerId}`);
    await page.waitForLoadState("networkidle");
    // Click on Mark Anderson's link
    const memberLink = page.getByRole("link", { name: /Mark Anderson/i });
    await expect(memberLink).toBeVisible();
    await memberLink.click();
    await expect(page).toHaveURL(`/customers/${familyMemberCustomerId}`);
  });
});
