// Snap original portal review page (we need an answerId; use the one user gave us)
const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: path.join(__dirname, '../data/sessions/storage-state.json'),
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  // user provided this review URL with valid answerId for 10501
  const url = 'https://e-learning.youpass.vn/practice/listening/10501?type=review&answerId=13266266';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(4000);

  const dir = path.join(__dirname, '../data/portal-listening-snapshots/5-review-10501');
  await fs.ensureDir(dir);
  await page.screenshot({ path: path.join(dir, 'viewport.png'), fullPage: false });
  await page.screenshot({ path: path.join(dir, 'fullpage.png'), fullPage: true });
  const html = await page.content();
  await fs.writeFile(path.join(dir, 'page.html'), html);
  console.log(`Saved ${dir}`);

  await browser.close();
})();
