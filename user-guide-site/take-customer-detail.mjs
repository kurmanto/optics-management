import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots');
const BASE = 'http://localhost:3002';
const EMAIL = 'admin@mintvisionsoptique.com';
const PASS = 'changeme123';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  ctx.setDefaultTimeout(30000);
  const page = await ctx.newPage();

  // LOGIN
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log('✓ Logged in, at:', page.url());

  // Go to customers list
  await page.goto(`${BASE}/customers`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  console.log('At customers page:', page.url());

  // Find anchor links to individual customer pages
  const links = page.locator('a[href*="/customers/"]');
  const count = await links.count();
  console.log(`Found ${count} customer links`);

  let custId = null;
  for (let i = 0; i < count; i++) {
    const href = await links.nth(i).getAttribute('href');
    const m = href?.match(/\/customers\/([^/?]+)$/);
    if (m && m[1] !== 'new') {
      custId = m[1];
      console.log(`  Customer ID: ${custId} (${href})`);
      break;
    }
  }

  if (!custId) {
    // Try clicking first row
    const row = page.locator('tbody tr').first();
    if (await row.isVisible()) {
      await row.click();
      await page.waitForTimeout(1500);
      console.log('Clicked row, now at:', page.url());
    }
  } else {
    await page.goto(`${BASE}/customers/${custId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
  }

  console.log('Final URL:', page.url());
  await page.screenshot({ path: path.join(OUT, '04-customer-detail.png'), fullPage: false });
  console.log('✓ 04-customer-detail.png');

  await browser.close();
})();
