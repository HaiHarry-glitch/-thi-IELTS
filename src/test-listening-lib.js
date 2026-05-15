const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/luyen-thi/ielts/listening', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(__dirname, '../data/screenshots/local/listening-library.png'), fullPage: false });
  console.log('Saved listening-library.png');
  await browser.close();
})();
