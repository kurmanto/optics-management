import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3002';
const EMAIL = 'admin@mintvisionsoptique.com';
const PASS = process.env.MVO_PASS || 'changeme123';

const VIEWPORT = { width: 1440, height: 900 };

async function shot(page, name, { clip } = {}) {
  await page.waitForTimeout(600);
  const opts = { path: path.join(OUT, `${name}.png`), ...(clip ? { clip } : { fullPage: false }) };
  await page.screenshot(opts);
  console.log(`✓ ${name}.png`);
}

async function waitReady(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  ctx.setDefaultTimeout(60000);
  ctx.setDefaultNavigationTimeout(60000);
  const page = await ctx.newPage();

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitReady(page);
  await shot(page, '01-login');

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
  await waitReady(page);

  if (page.url().includes('login')) {
    console.error('❌ Login failed — wrong password? Set MVO_PASS env var.');
    await browser.close();
    process.exit(1);
  }

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  await shot(page, '02-dashboard');

  // Scroll to Money on the Table section if present
  const moneySection = page.locator('text=Money on the Table').first();
  if (await moneySection.isVisible().catch(() => false)) {
    await moneySection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await shot(page, '02b-dashboard-money');
  }

  // ── CUSTOMERS LIST ─────────────────────────────────────────────────────────
  await page.goto(`${BASE}/customers`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitReady(page);
  await shot(page, '03-customers-list');

  // ── CUSTOMER DETAIL ────────────────────────────────────────────────────────
  const firstCustomer = page.locator('table tbody tr a, tbody tr td a').first();
  if (await firstCustomer.isVisible().catch(() => false)) {
    await firstCustomer.click();
    await waitReady(page);
    await shot(page, '04-customer-detail');
  } else {
    // Try navigating to /customers and clicking first row
    await page.goto(`${BASE}/customers`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await waitReady(page);
    const row = page.locator('tbody tr').first();
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await waitReady(page);
      await shot(page, '04-customer-detail');
    }
  }

  // ── NEW CUSTOMER FORM ──────────────────────────────────────────────────────
  await page.goto(`${BASE}/customers/new`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitReady(page);
  await shot(page, '05-customer-new');

  // ── FULFILLMENT BOARD ──────────────────────────────────────────────────────
  await page.goto(`${BASE}/orders`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitReady(page);
  await shot(page, '06-kanban-board');

  // ── ALL ORDERS ─────────────────────────────────────────────────────────────
  // Try clicking "List View" button
  const listViewBtn = page.locator('button:has-text("List View"), a:has-text("All Orders")').first();
  if (await listViewBtn.isVisible().catch(() => false)) {
    await listViewBtn.click();
    await waitReady(page);
    await shot(page, '07-all-orders');
  } else {
    await page.goto(`${BASE}/orders/list`).catch(() => {});
    await waitReady(page);
    await shot(page, '07-all-orders');
  }

  // ── NEW ORDER WIZARD ───────────────────────────────────────────────────────
  await page.goto(`${BASE}/orders`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitReady(page);
  const newOrderBtn = page.locator('button:has-text("New Order"), a:has-text("New Order")').first();
  if (await newOrderBtn.isVisible().catch(() => false)) {
    await newOrderBtn.click();
    await waitReady(page);
    await shot(page, '08-order-wizard-step1');
  }

  // ── ORDER DETAIL ───────────────────────────────────────────────────────────
  await page.goto(`${BASE}/orders`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitReady(page);
  // Try to find a card on the kanban and click it
  const orderCard = page.locator('[class*="card"], [class*="Card"]').first();
  if (await orderCard.isVisible().catch(() => false)) {
    const orderLink = page.locator('a[href*="/orders/"]').first();
    if (await orderLink.isVisible().catch(() => false)) {
      const href = await orderLink.getAttribute('href');
      await page.goto(`${BASE}${href}`);
      await waitReady(page);
      await shot(page, '09-order-detail');

      // Work order
      const workOrderBtn = page.locator('button:has-text("Work Order"), a:has-text("Work Order")').first();
      if (await workOrderBtn.isVisible().catch(() => false)) {
        const [woPage] = await Promise.all([
          ctx.waitForEvent('page'),
          workOrderBtn.click(),
        ]);
        await woPage.waitForLoadState('networkidle').catch(() => {});
        await woPage.waitForTimeout(800);
        await woPage.screenshot({ path: path.join(OUT, '13-work-order.png') });
        console.log('✓ 13-work-order.png');
        await woPage.close();
      }
    }
  }

  // ── INVOICES ───────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/invoices`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitReady(page);
  await shot(page, '10-invoices-list');

  // Click first invoice if any
  const invoiceLink = page.locator('a[href*="/invoice"], a[href*="/invoices/"]').first();
  if (await invoiceLink.isVisible().catch(() => false)) {
    const href = await invoiceLink.getAttribute('href');
    if (href) {
      await page.goto(`${BASE}${href}`);
      await waitReady(page);
      await shot(page, '11-invoice-view');
    }
  }

  // ── FORMS ──────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/forms`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitReady(page);
  await shot(page, '14-forms-hub');

  // Intake packages tab
  const intakeTab = page.locator('button:has-text("Intake"), [role="tab"]:has-text("Intake")').first();
  if (await intakeTab.isVisible().catch(() => false)) {
    await intakeTab.click();
    await waitReady(page);
    await shot(page, '15-intake-packages');
  }

  // Pending tab
  const pendingTab = page.locator('button:has-text("Pending"), [role="tab"]:has-text("Pending")').first();
  if (await pendingTab.isVisible().catch(() => false)) {
    await pendingTab.click();
    await waitReady(page);
    await shot(page, '14b-forms-pending');
  }

  // ── INVENTORY ──────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/inventory`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitReady(page);
  await shot(page, '16-inventory-frames');

  // Frame detail
  const frameLink = page.locator('tbody tr a, tbody tr td').first();
  if (await frameLink.isVisible().catch(() => false)) {
    const firstFrame = page.locator('tbody tr').first();
    await firstFrame.click().catch(() => {});
    await waitReady(page);
    const url = page.url();
    if (url.includes('/inventory/') && !url.endsWith('/inventory')) {
      await shot(page, '17-frame-detail');
    }
  }

  // ── VENDORS ────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/inventory/vendors`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitReady(page);
  await shot(page, '18-vendors');

  // ── PURCHASE ORDERS ────────────────────────────────────────────────────────
  await page.goto(`${BASE}/inventory/purchase-orders`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitReady(page);
  await shot(page, '19-purchase-orders');

  // PO detail / receive workflow
  const poLink = page.locator('tbody tr').first();
  if (await poLink.isVisible().catch(() => false)) {
    await poLink.click().catch(() => {});
    await waitReady(page);
    const url = page.url();
    if (url.includes('/purchase-orders/') && !url.endsWith('/purchase-orders')) {
      await shot(page, '19b-po-detail');
    }
  }

  // ── INVENTORY ANALYTICS ────────────────────────────────────────────────────
  await page.goto(`${BASE}/inventory/analytics`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitReady(page);
  await shot(page, '20-inventory-analytics');

  // ── SETTINGS ──────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitReady(page);
  await shot(page, '21-settings');

  await browser.close();
  console.log('\n✅ All screenshots saved to user-guide-site/screenshots/');
})();
