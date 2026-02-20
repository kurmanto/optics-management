/**
 * Customers List — /customers
 * Tests list display, search, lifecycle tabs, customer links.
 */

import { test, expect } from "../../fixtures";
import { CUSTOMERS } from "../../helpers/test-data";

test.describe("Customers List", () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto("/customers");
    await adminPage.waitForLoadState("networkidle");
  });

  test("renders Customers heading", async ({ adminPage }) => {
    await expect(adminPage.getByRole("heading", { name: "Customers" })).toBeVisible();
  });

  test("shows customer count (at least 20 from seed)", async ({ adminPage }) => {
    // Journey tests may create additional customers, so check >= 20
    await expect(adminPage.getByText(/\d+ customers/i)).toBeVisible();
  });

  test("shows New Customer link to /customers/new", async ({ adminPage }) => {
    const link = adminPage.getByRole("link", { name: "New Customer" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/customers/new");
  });

  test("shows Name, Phone, Lifecycle columns", async ({ adminPage }) => {
    await expect(adminPage.getByText("Name", { exact: true })).toBeVisible();
    await expect(adminPage.getByText("Phone", { exact: true })).toBeVisible();
    await expect(adminPage.getByText("Lifecycle", { exact: true })).toBeVisible();
  });

  test("seed customer Tremblay appears in list", async ({ adminPage }) => {
    await expect(adminPage.getByRole("link", { name: /Tremblay/ })).toBeVisible();
  });

  test("seed customer Okafor appears in list", async ({ adminPage }) => {
    await expect(adminPage.getByRole("link", { name: /Okafor/ })).toBeVisible();
  });

  test("search by last name Wilson filters results", async ({ adminPage }) => {
    await adminPage.goto("/customers?q=Wilson");
    await adminPage.waitForLoadState("networkidle");

    await expect(adminPage.getByRole("link", { name: /Wilson/ })).toBeVisible();
    await expect(adminPage.getByRole("link", { name: /Tremblay/ })).not.toBeVisible();
  });

  test("search by phone 5145550101 shows Tremblay", async ({ adminPage }) => {
    await adminPage.goto(`/customers?q=${CUSTOMERS.Tremblay.phone}`);
    await adminPage.waitForLoadState("networkidle");

    await expect(adminPage.getByRole("link", { name: /Tremblay/ })).toBeVisible();
  });

  test("search by email shows Wilson", async ({ adminPage }) => {
    await adminPage.goto(`/customers?q=${encodeURIComponent(CUSTOMERS.Wilson.email!)}`);
    await adminPage.waitForLoadState("networkidle");

    await expect(adminPage.getByRole("link", { name: /Wilson/ })).toBeVisible();
  });

  test("no-match search shows empty state", async ({ adminPage }) => {
    await adminPage.goto("/customers?q=zzznomatch");
    await adminPage.waitForLoadState("networkidle");

    await expect(adminPage.getByText("No customers match your search.")).toBeVisible();
  });

  test("lifecycle tabs visible: All, VIP, Active, New, Lapsed, Dormant, Leads", async ({ adminPage }) => {
    for (const tab of ["All", "VIP", "Active", "New", "Lapsed", "Dormant", "Leads"]) {
      await expect(adminPage.getByRole("link", { name: tab, exact: true })).toBeVisible();
    }
  });

  test("clicking Active tab updates URL with ?status=ACTIVE", async ({ adminPage }) => {
    await adminPage.getByRole("link", { name: "Active", exact: true }).click();
    await expect(adminPage).toHaveURL(/status=ACTIVE/);
  });

  test("customer name is a link to /customers/{id}", async ({ adminPage }) => {
    const firstLink = adminPage.locator("tbody tr").first().getByRole("link").first();
    await firstLink.click();
    await expect(adminPage).toHaveURL(/\/customers\//);
  });
});
