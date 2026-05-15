// Test crawl with quiz IDs we know work (from earlier samples)
const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const STORAGE_STATE = path.join(__dirname, '../data/sessions/storage-state.json');
const OUT = path.join(__dirname, '../data/portal-crawl');

const TEST_IDS = [7298, 7361, 7875, 7926, 10011];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: STORAGE_STATE,
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  for (const id of TEST_IDS) {
    const url = `https://youpass.vn/thi-thu/reading/${id}`;
    const dir = path.join(OUT, String(id));
    await fs.ensureDir(dir);
    console.log(`\n[${id}] ${url}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      try { await page.waitForSelector('main, .passage-html, img[src*="Logo-power"]', { timeout: 8000 }); } catch {}
      await page.waitForTimeout(2500);

      // Check for the application error text
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200));
      const hasError = bodyText.includes('Application error') || bodyText.includes('client-side exception');

      await page.screenshot({ path: path.join(dir, 'viewport.png'), fullPage: false });
      const html = await page.content();
      await fs.writeFile(path.join(dir, 'page.html'), html);

      console.log(`  ${hasError ? 'ERROR' : 'OK'} html=${html.length} bytes`);
      console.log(`  body: ${bodyText.replace(/\n/g, ' ').slice(0, 100)}`);
    } catch (e) {
      console.log(`  FAIL: ${e.message}`);
    }
  }

  await browser.close();
})();
