import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots');
const BASE = process.env.BASE_URL || 'http://localhost:3002';
const EMAIL = 'admin@mintvisionsoptique.com';
const PASS = process.env.MVO_PASS || 'changeme123';
const VIEWPORT = { width: 1440, height: 900 };

async function shot(page, name) {
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log(`✓ ${name}.png`);
}

async function go(page, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);
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

  // Navigate to orders list and find first order
  await go(page, '/orders');
  await page.waitForTimeout(800);

  // Try to find an order link in the list
  const links = page.locator('a[href*="/orders/"]');
  const count = await links.count();
  console.log(`Found ${count} order links on /orders`);
  
  let orderId = null;
  for (let i = 0; i < count; i++) {
    const href = await links.nth(i).getAttribute('href');
    const m = href?.match(/\/orders\/([^/?]+)$/);
    if (m && m[1] !== 'board' && m[1] !== 'new') {
      orderId = m[1];
      console.log(`  Found order ID: ${orderId} (from ${href})`);
      break;
    }
  }

  if (!orderId) {
    // Try tbody rows
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    console.log(`Found ${rowCount} rows in orders table`);
    if (rowCount > 0) {
      await rows.first().click();
      await page.waitForTimeout(1500);
      console.log(`  Clicked row, now at: ${page.url()}`);
      await shot(page, '09-order-detail');
    } else {
      console.log('No orders found');
    }
  } else {
    await go(page, `/orders/${orderId}`);
    await page.waitForTimeout(1200);
    await shot(page, '09-order-detail');
  }

  await browser.close();
  console.log('\n✅ Done');
})();
