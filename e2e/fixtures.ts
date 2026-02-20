/**
 * Custom Playwright fixtures for role-based testing.
 *
 * Usage:
 *   import { test, expect } from '../fixtures';
 *   test('admin sees ...', async ({ adminPage }) => { ... });
 *   test('staff sees ...', async ({ staffPage }) => { ... });
 */

import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

type Fixtures = {
  adminPage: Page;
  staffPage: Page;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: ".auth/admin.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  staffPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: ".auth/staff.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
