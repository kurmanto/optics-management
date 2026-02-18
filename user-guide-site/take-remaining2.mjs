import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots');
const BASE = process.env.BASE_URL || 'http://localhost:3002';
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

  // ── 6.2 Form detail page (not hub) ───────────────────────────────────────
  await go(page, '/forms');
  await page.waitForTimeout(800);
  const formLinks = page.locator('a[href*="/forms/"]');
  const count = await formLinks.count();
  let formHref = null;
  for (let i = 0; i < count; i++) {
    const href = await formLinks.nth(i).getAttribute('href');
    if (href && href !== '/forms' && href.match(/\/forms\/[^/]+$/)) {
      formHref = href;
      break;
    }
  }
  if (formHref) {
    await go(page, formHref);
    await page.waitForTimeout(1000);
    await shot(page, '14b-form-detail');
    console.log('  (form detail:', formHref, ')');
  } else {
    console.log('⚠ No form detail link found');
  }

  // ── 8.1 Notification bell open ────────────────────────────────────────────
  await go(page, '/dashboard');
  await page.waitForTimeout(800);
  // Try clicking a bell button
  const bellBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
  // Find the bell by looking at top-right area
  await page.evaluate(() => {
    // click the notifications bell — find button near top right
    const btns = [...document.querySelectorAll('button')];
    const bell = btns.find(b => b.querySelector('[data-lucide="bell"], svg') && b.getBoundingClientRect().top < 60);
    if (bell) bell.click();
  });
  await page.waitForTimeout(800);
  await shot(page, '22-notification-bell');

  // ── 8.3 Notification Preferences (Settings) ──────────────────────────────
  await go(page, '/settings');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('h2,h3,h4,p')].find(e =>
      e.textContent.includes('Notification Preference') || e.textContent.includes('notification preference')
    );
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(600);
  await shot(page, '23-notification-prefs', { x: 264, y: 0, width: 1440 - 264, height: 900 });

  await browser.close();
  console.log('\n✅ Remaining screenshots done');
})();
