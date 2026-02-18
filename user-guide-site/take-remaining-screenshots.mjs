import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3002';
const EMAIL = 'admin@mintvisionsoptique.com';
const PASS = process.env.MVO_PASS || 'changeme123';
const VIEWPORT = { width: 1440, height: 900 };

async function shot(page, name) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log(`✓ ${name}.png`);
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1000);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  ctx.setDefaultTimeout(30000);
  const page = await ctx.newPage();

  // ── LOGIN ────────────────────────────────────────────────────────────────
  await goto(page, `${BASE}/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  if (page.url().includes('login')) {
    console.error('❌ Login failed'); await browser.close(); process.exit(1);
  }

  // ── FIND FIRST ORDER ID ──────────────────────────────────────────────────
  await goto(page, `${BASE}/orders/list`);
  let orderId = null;
  const links = page.locator('a[href*="/orders/"]');
  const count = await links.count();
  for (let i = 0; i < count; i++) {
    const href = await links.nth(i).getAttribute('href');
    if (href && /\/orders\/[^/]+$/.test(href)) {
      orderId = href.split('/orders/')[1];
      break;
    }
  }
  if (!orderId) {
    await goto(page, `${BASE}/orders`);
    const card = page.locator('a[href*="/orders/"]').first();
    if (await card.isVisible().catch(() => false)) {
      const href = await card.getAttribute('href');
      orderId = href?.split('/orders/')[1];
    }
  }
  console.log('Order ID:', orderId);

  // ── WORK ORDER (direct URL navigation) ──────────────────────────────────
  if (orderId) {
    await goto(page, `${BASE}/orders/${orderId}/work-order`);
    await shot(page, '13-work-order');
  } else {
    console.log('  (No order found for work order)');
  }

  // ── FORMS — PENDING SECTION ──────────────────────────────────────────────
  await goto(page, `${BASE}/forms`);
  // Scroll to the outstanding/pending section
  const pendingSection = page.locator('text=Outstanding Forms, text=pending, h2:has-text("Sent"), h3:has-text("Outstanding")').first();
  // Try to scroll to it
  const headings = page.locator('h2, h3, h4');
  const hCount = await headings.count();
  for (let i = 0; i < hCount; i++) {
    const text = await headings.nth(i).textContent().catch(() => '');
    if (text && (text.toLowerCase().includes('pending') || text.toLowerCase().includes('outstanding') || text.toLowerCase().includes('sent'))) {
      await headings.nth(i).scrollIntoViewIfNeeded().catch(() => {});
      break;
    }
  }
  await page.waitForTimeout(600);
  await shot(page, '14b-forms-pending');

  // ── FORM REVIEW PAGE ─────────────────────────────────────────────────────
  // Find a completed submission to review
  const reviewLinks = page.locator('a[href*="/forms/"]');
  const rCount = await reviewLinks.count();
  let reviewHref = null;
  for (let i = 0; i < rCount; i++) {
    const href = await reviewLinks.nth(i).getAttribute('href');
    if (href && href.includes('/forms/') && !href.endsWith('/forms')) {
      reviewHref = href;
      break;
    }
  }
  if (reviewHref) {
    await goto(page, `${BASE}${reviewHref}`);
    await shot(page, '15b-form-review');
  } else {
    console.log('  (No form submission links found)');
  }

  // ── PO DETAIL ────────────────────────────────────────────────────────────
  await goto(page, `${BASE}/inventory/purchase-orders`);
  // Try clicking a link inside a row (not the row itself)
  const poLink = page.locator('tbody tr a, tbody tr td a').first();
  if (await poLink.isVisible().catch(() => false)) {
    const href = await poLink.getAttribute('href');
    if (href) {
      await goto(page, `${BASE}${href}`);
      await shot(page, '19b-po-detail');
    }
  } else {
    // Try reading the PO # text and constructing URL
    const poCell = page.locator('tbody tr td').first();
    if (await poCell.isVisible().catch(() => false)) {
      await poCell.click().catch(() => {});
      await page.waitForTimeout(800);
      const url = page.url();
      if (url.includes('/purchase-orders/')) {
        await shot(page, '19b-po-detail');
      } else {
        console.log('  (Could not navigate to PO detail, url:', url, ')');
      }
    } else {
      console.log('  (No purchase order rows found)');
    }
  }

  await browser.close();
  console.log('\n✅ Remaining screenshots done.');
})();
