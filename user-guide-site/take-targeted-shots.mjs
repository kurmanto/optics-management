import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const EMAIL = 'admin@mintvisionsoptique.com';
const PASS = process.env.MVO_PASS || 'changeme123';
const VIEWPORT = { width: 1440, height: 900 };

async function shot(page, name, clipOpts) {
  await page.waitForTimeout(800);
  const opts = { path: path.join(OUT, `${name}.png`) };
  if (clipOpts) opts.clip = clipOpts;
  else opts.fullPage = false;
  await page.screenshot(opts);
  console.log(`✓ ${name}.png`);
}

async function go(page, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1000);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  ctx.setDefaultTimeout(30000);
  const page = await ctx.newPage();

  // LOGIN
  await go(page, '/login');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  if (page.url().includes('login')) {
    console.error('❌ Login failed'); await browser.close(); process.exit(1);
  }
  console.log('✓ Logged in');

  // ── 2.2 Dashboard Money on the Table (crop to content area, skip sidebar) ──
  await go(page, '/dashboard');
  await page.waitForTimeout(800);
  // Try to scroll to "Money on the Table"
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('h2,h3')].find(e => e.textContent.includes('Money on the Table'));
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(500);
  // clip: skip sidebar (264px wide), take content area
  await shot(page, '02b-dashboard-money', { x: 264, y: 0, width: 1440 - 264, height: 900 });

  // ── 2.5 Recent Orders Strip ──────────────────────────────────────────────
  await go(page, '/dashboard');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('h2,h3,h4')].find(e => e.textContent.includes('Recent Order'));
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(500);
  await shot(page, '02c-dashboard-recent-orders', { x: 264, y: 0, width: 1440 - 264, height: 900 });

  // ── 3.3 Customer Detail ──────────────────────────────────────────────────
  await go(page, '/customers');
  await page.waitForTimeout(800);
  // Click the first customer row link
  const custRow = page.locator('tbody tr').first();
  if (await custRow.isVisible().catch(() => false)) {
    await custRow.click();
    await page.waitForTimeout(1200);
  }
  if (!page.url().includes('/customers/')) {
    // Try clicking an anchor
    const custLink = page.locator('a[href*="/customers/"]').first();
    if (await custLink.isVisible().catch(() => false)) {
      const href = await custLink.getAttribute('href');
      await go(page, href);
    }
  }
  await page.waitForTimeout(800);
  await shot(page, '04-customer-detail');

  // ── 4.2 Fulfillment Board (Kanban) ───────────────────────────────────────
  await go(page, '/orders/board');
  await page.waitForTimeout(1200);
  await shot(page, '06-kanban-board');

  // ── 4.5 Order Detail ─────────────────────────────────────────────────────
  // Get first order link from the board or list
  const orderCard = page.locator('a[href*="/orders/"]').first();
  let orderId = null;
  if (await orderCard.isVisible().catch(() => false)) {
    const href = await orderCard.getAttribute('href');
    const m = href?.match(/\/orders\/([^/?]+)/);
    if (m) orderId = m[1];
  }
  if (!orderId) {
    await go(page, '/orders');
    const link = page.locator('a[href*="/orders/"]').first();
    if (await link.isVisible().catch(() => false)) {
      const href = await link.getAttribute('href');
      const m = href?.match(/\/orders\/([^/?]+)/);
      if (m) orderId = m[1];
    }
  }
  if (orderId) {
    await go(page, `/orders/${orderId}`);
    await page.waitForTimeout(1200);
    await shot(page, '09-order-detail');
  }

  // ── 5.2 Invoice View ─────────────────────────────────────────────────────
  // Find an order with an issued invoice
  await go(page, '/invoices');
  await page.waitForTimeout(800);
  const invoiceRow = page.locator('tbody tr').first();
  if (await invoiceRow.isVisible().catch(() => false)) {
    // Look for the order link in that row
    const invoiceLink = page.locator('tbody tr a[href*="/orders/"]').first();
    if (await invoiceLink.isVisible().catch(() => false)) {
      const href = await invoiceLink.getAttribute('href');
      const m = href?.match(/\/orders\/([^/?]+)/);
      if (m) {
        await go(page, `/orders/${m[1]}/invoice`);
        await page.waitForTimeout(1200);
        await shot(page, '11-invoice-view');
      }
    }
  }
  if (!await page.url().then(u => u.includes('/invoice'))) {
    // fallback: try clicking the row
    await go(page, '/invoices');
    await page.waitForTimeout(800);
    const row = page.locator('tbody tr').first();
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await page.waitForTimeout(1200);
      await shot(page, '11-invoice-view');
    }
  }

  // ── 6.2 Send a Form (form detail page, not hub) ──────────────────────────
  await go(page, '/forms');
  await page.waitForTimeout(800);
  // Click on the first form template link
  const formLink = page.locator('a[href*="/forms/"]').first();
  if (await formLink.isVisible().catch(() => false)) {
    const href = await formLink.getAttribute('href');
    if (href && href !== '/forms') {
      await go(page, href);
      await page.waitForTimeout(1000);
      await shot(page, '14b-form-detail');
    }
  }

  // ── Notification bell open ────────────────────────────────────────────────
  await go(page, '/dashboard');
  await page.waitForTimeout(800);
  // Click the notification bell
  const bell = page.locator('button[aria-label*="otif"], button:has([data-lucide="bell"]), button:has(svg)').last();
  // Try clicking the bell area (top-right)
  await page.mouse.click(1400, 32);
  await page.waitForTimeout(600);
  await shot(page, '22-notification-bell');

  // ── 8.3 Notification Preferences (Settings) ──────────────────────────────
  await go(page, '/settings');
  await page.waitForTimeout(800);
  // Scroll to notification prefs section
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('h2,h3,h4')].find(e =>
      e.textContent.includes('Notification') || e.textContent.includes('notification')
    );
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(500);
  await shot(page, '23-notification-prefs', { x: 264, y: 0, width: 1440 - 264, height: 900 });

  await browser.close();
  console.log('\n✅ Targeted screenshots done');
})();
