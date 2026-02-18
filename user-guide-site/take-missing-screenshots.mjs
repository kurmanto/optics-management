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
  await page.waitForTimeout(800);
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

  // ── 1. RECENT ORDERS STRIP (scroll to bottom of dashboard) ───────────────
  await goto(page, `${BASE}/dashboard`);
  // Scroll to bottom to reveal recent orders
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await shot(page, '02c-dashboard-recent-orders');

  // ── 2. NOTIFICATION BELL (click it) ──────────────────────────────────────
  await goto(page, `${BASE}/dashboard`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  // Click the bell button
  const bell = page.locator('button[aria-label*="otification"], button:has(svg[class*="bell"i]), [data-testid="notification-bell"], button:has-text("")').first();
  // Try various selectors
  const bellSelectors = [
    'button[aria-label*="otification"]',
    '[class*="notification"] button',
    'button svg[class*="Bell"]',
    'header button',
  ];
  let bellClicked = false;
  for (const sel of bellSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click().catch(() => {});
      bellClicked = true;
      break;
    }
  }
  await page.waitForTimeout(600);
  await shot(page, '22-notification-bell');
  if (!bellClicked) console.log('  (bell not found, captured page anyway)');

  // ── 3. FIND FIRST ORDER ──────────────────────────────────────────────────
  await goto(page, `${BASE}/orders/list`);
  await page.waitForTimeout(800);

  let orderHref = null;
  const links = page.locator('a[href*="/orders/"]');
  const count = await links.count();
  for (let i = 0; i < count; i++) {
    const href = await links.nth(i).getAttribute('href');
    if (href && /\/orders\/[^/]+$/.test(href) && !href.includes('list')) {
      orderHref = href;
      break;
    }
  }

  if (!orderHref) {
    // Try kanban board
    await goto(page, `${BASE}/orders`);
    await page.waitForTimeout(800);
    const card = page.locator('a[href*="/orders/"]').first();
    if (await card.isVisible().catch(() => false)) {
      orderHref = await card.getAttribute('href');
    }
  }

  if (orderHref) {
    // ── ORDER DETAIL ────────────────────────────────────────────────────
    await goto(page, `${BASE}${orderHref}`);
    await shot(page, '09-order-detail');

    // ── WORK ORDER (opens new tab) ──────────────────────────────────────
    const woBtn = page.locator('button:has-text("Work Order"), a:has-text("Work Order")').first();
    if (await woBtn.isVisible().catch(() => false)) {
      const [woPage] = await Promise.all([
        ctx.waitForEvent('page'),
        woBtn.click(),
      ]);
      await woPage.waitForLoadState('domcontentloaded').catch(() => {});
      await woPage.waitForTimeout(1200);
      await woPage.screenshot({ path: path.join(OUT, '13-work-order.png'), fullPage: false });
      console.log('✓ 13-work-order.png');
      await woPage.close();
    } else {
      console.log('  (Work Order button not found on order detail)');
    }

    // ── PICKUP COMPLETE MODAL ───────────────────────────────────────────
    // Look for "Mark Ready" or "Mark Picked Up" button depending on status
    await goto(page, `${BASE}${orderHref}`);
    const pickupBtn = page.locator('button:has-text("Pickup Complete"), button:has-text("Complete Pickup"), button:has-text("Mark Picked Up")').first();
    if (await pickupBtn.isVisible().catch(() => false)) {
      await pickupBtn.click();
      await page.waitForTimeout(800);
      await shot(page, '12-pickup-modal');
    } else {
      console.log('  (Pickup button not visible — order may not be in READY status)');
    }
  } else {
    console.log('  (No orders found for detail/work-order/pickup shots)');
  }

  // ── 4. FRAME DETAIL ──────────────────────────────────────────────────────
  await goto(page, `${BASE}/inventory`);
  await page.waitForTimeout(800);
  const frameRow = page.locator('tbody tr').first();
  if (await frameRow.isVisible().catch(() => false)) {
    // Find the link inside the row
    const frameLink = page.locator('tbody tr a, tbody tr td[class*="cursor"]').first();
    if (await frameLink.isVisible().catch(() => false)) {
      await frameLink.click().catch(() => {});
    } else {
      await frameRow.click().catch(() => {});
    }
    await page.waitForTimeout(1000);
    const url = page.url();
    if (url.includes('/inventory/') && !url.endsWith('/inventory')) {
      await shot(page, '17-frame-detail');
    } else {
      console.log('  (Frame detail navigation failed, url:', url, ')');
    }
  } else {
    console.log('  (No frames in inventory)');
  }

  // ── 5. PURCHASE ORDER DETAIL / RECEIVE WORKFLOW ──────────────────────────
  await goto(page, `${BASE}/inventory/purchase-orders`);
  await page.waitForTimeout(800);
  // Find an open PO row
  const poRow = page.locator('tbody tr').first();
  if (await poRow.isVisible().catch(() => false)) {
    await poRow.click().catch(() => {});
    await page.waitForTimeout(1000);
    const url = page.url();
    if (url.includes('/purchase-orders/') && !url.endsWith('/purchase-orders')) {
      await shot(page, '19b-po-detail');
      // Look for receive button
      const receiveBtn = page.locator('button:has-text("Receive"), button:has-text("receive")').first();
      if (await receiveBtn.isVisible().catch(() => false)) {
        await receiveBtn.click();
        await page.waitForTimeout(800);
        await shot(page, '19c-po-receive');
      }
    }
  } else {
    console.log('  (No purchase orders found)');
  }

  // ── 6. FORMS PENDING TAB ─────────────────────────────────────────────────
  await goto(page, `${BASE}/forms`);
  await page.waitForTimeout(800);
  const pendingTab = page.locator('[role="tab"]:has-text("Pending"), button:has-text("Pending")').first();
  if (await pendingTab.isVisible().catch(() => false)) {
    await pendingTab.click();
    await page.waitForTimeout(800);
    await shot(page, '14b-forms-pending');

    // Click first pending form row to get review page
    const formRow = page.locator('tbody tr, [class*="form-row"]').first();
    if (await formRow.isVisible().catch(() => false)) {
      const reviewLink = page.locator('a[href*="/forms/"]').first();
      if (await reviewLink.isVisible().catch(() => false)) {
        const href = await reviewLink.getAttribute('href');
        await goto(page, `${BASE}${href}`);
        await shot(page, '15b-form-review');
      }
    }
  } else {
    console.log('  (Pending tab not found)');
  }

  await browser.close();
  console.log('\n✅ Missing screenshots done.');
})();
