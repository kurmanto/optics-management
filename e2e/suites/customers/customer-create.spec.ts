/**
 * Customer Create — /customers/new
 * Tests form fields, validation, creation, and redirect.
 */

import { test, expect } from "@playwright/test";
import { uniqueSuffix } from "../../helpers/test-data";

test.describe("Customer Create", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/customers/new");
    await page.waitForLoadState("networkidle");
  });

  test("page renders New Customer heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "New Customer" })).toBeVisible();
  });

  test("Basic Information section visible", async ({ page }) => {
    await expect(page.getByText("Basic Information", { exact: true })).toBeVisible();
  });

  test("Address section visible", async ({ page }) => {
    await expect(page.getByText("Address", { exact: true })).toBeVisible();
  });

  test("How They Found Us section visible", async ({ page }) => {
    await expect(page.getByText("How They Found Us", { exact: true })).toBeVisible();
  });

  test("Additional Info section visible", async ({ page }) => {
    await expect(page.getByText("Additional Info", { exact: true })).toBeVisible();
  });

  test("First Name input is required", async ({ page }) => {
    await expect(page.locator('input[name="firstName"]')).toHaveAttribute("required", "");
  });

  test("Last Name input is required", async ({ page }) => {
    await expect(page.locator('input[name="lastName"]')).toHaveAttribute("required", "");
  });

  test("Phone field has type=tel and placeholder (416) 555-0123", async ({ page }) => {
    const phone = page.locator('input[name="phone"]');
    await expect(phone).toHaveAttribute("type", "tel");
    await expect(phone).toHaveAttribute("placeholder", "(416) 555-0123");
  });

  test("Email field has type=email", async ({ page }) => {
    await expect(page.locator('input[name="email"]')).toHaveAttribute("type", "email");
  });

  test("Date of Birth field has type=date", async ({ page }) => {
    await expect(page.locator('input[name="dateOfBirth"]')).toHaveAttribute("type", "date");
  });

  test("Gender select has expected options", async ({ page }) => {
    const gender = page.locator('select[name="gender"]');
    await expect(gender.locator('option[value=""]')).toHaveText("Not specified");
    await expect(gender.locator('option[value="MALE"]')).toHaveText("Male");
    await expect(gender.locator('option[value="FEMALE"]')).toHaveText("Female");
    await expect(gender.locator('option[value="OTHER"]')).toHaveText("Other");
    await expect(gender.locator('option[value="PREFER_NOT_TO_SAY"]')).toHaveText("Prefer not to say");
  });

  test("Province select has ON, QC, BC, AB options", async ({ page }) => {
    const province = page.locator('select[name="province"]');
    await expect(province.locator('option[value="ON"]')).toHaveText("Ontario");
    await expect(province.locator('option[value="QC"]')).toHaveText("Quebec");
    await expect(province.locator('option[value="BC"]')).toHaveText("British Columbia");
    await expect(province.locator('option[value="AB"]')).toHaveText("Alberta");
  });

  test("Source dropdown shows Google, Instagram, Referral options", async ({ page }) => {
    const source = page.locator('select[name="hearAboutUs"]');
    await expect(source.locator('option[value="GOOGLE"]')).toHaveText("Google");
    await expect(source.locator('option[value="INSTAGRAM"]')).toHaveText("Instagram");
    await expect(source.locator('option[value="REFERRAL"]')).toHaveText("Referral");
  });

  test("selecting Referral source reveals Referred by input", async ({ page }) => {
    await page.locator('select[name="hearAboutUs"]').selectOption("REFERRAL");
    await expect(page.getByPlaceholder("e.g. Jane Smith")).toBeVisible();
  });

  test("SMS opt-in checkbox is checked by default", async ({ page }) => {
    await expect(page.locator('input[name="smsOptIn"]')).toBeChecked();
  });

  test("Email opt-in checkbox is checked by default", async ({ page }) => {
    await expect(page.locator('input[name="emailOptIn"]')).toBeChecked();
  });

  test("Cancel link href is /customers", async ({ page }) => {
    const cancel = page.getByRole("link", { name: "Cancel" });
    await expect(cancel).toHaveAttribute("href", "/customers");
  });

  test("submitting with just first + last name creates customer and redirects", async ({ page }) => {
    const suffix = uniqueSuffix();
    await page.locator('input[name="firstName"]').fill("TestFirst");
    await page.locator('input[name="lastName"]').fill(`TestLast${suffix}`);
    await page.getByRole("button", { name: "Create Customer" }).click();
    await page.waitForURL(/\/customers\/[a-z0-9]+/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /TestFirst/i })).toBeVisible();
  });

  test("newly created customer appears in search", async ({ page }) => {
    const suffix = uniqueSuffix();
    const lastName = `SearchTest${suffix}`;
    await page.locator('input[name="firstName"]').fill("SearchFirst");
    await page.locator('input[name="lastName"]').fill(lastName);
    await page.getByRole("button", { name: "Create Customer" }).click();
    await page.waitForURL(/\/customers\/[a-z0-9]+/, { timeout: 20_000 });

    await page.goto("/customers");
    const input = page.getByPlaceholder("Search by name, email, or phone...");
    await input.fill(lastName);
    await page.keyboard.press("Enter");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: new RegExp(lastName) })).toBeVisible();
  });
});
