const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs-extra');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: path.join(__dirname, '../data/sessions/storage-state.json'),
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();

  for (const id of [10501, 1003, 1626]) {
    console.log(`Testing ${id}...`);
    try {
      await page.goto(`https://youpass.vn/thi-thu/listening/${id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      const title = await page.title();
      const text = await page.evaluate(() => document.body.innerText.slice(0, 300));
      console.log(`  title=${title}`);
      console.log(`  text=${text.replace(/\n/g, ' | ')}`);
    } catch (e) {
      console.log(`  ERR: ${e.message}`);
    }
  }
  await browser.close();
})();
