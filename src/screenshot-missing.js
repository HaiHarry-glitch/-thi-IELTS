const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const STORAGE_STATE_PATH = path.join(__dirname, '../data/sessions/storage-state.json');
const SCREENSHOTS_DIR = path.join(__dirname, '../data/screenshots');

const URLS = [
  {
    name: '1-library',
    url: 'https://youpass.vn/luyen-thi/ielts/reading',
    waitFor: 'networkidle',
  },
  {
    name: '4-review',
    // Use a real exam in review mode - answerId from result page
    url: 'https://e-learning.youpass.vn/practice/reading/10234?type=review&answerId=13239731',
    waitFor: 'networkidle',
  },
];

async function main() {
  await fs.ensureDir(SCREENSHOTS_DIR);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  for (const { name, url, waitFor } of URLS) {
    console.log(`[${name}] ${url}`);
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: waitFor, timeout: 30000 });
      await page.waitForTimeout(3000);

      const outPath = path.join(SCREENSHOTS_DIR, `${name}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`  Saved: ${outPath}`);

      // Also save HTML
      const html = await page.content();
      const htmlPath = path.join(SCREENSHOTS_DIR, `${name}.html`);
      await fs.writeFile(htmlPath, html);
      console.log(`  HTML saved: ${htmlPath.split('\\').pop()}`);
    } catch (e) {
      console.error(`  FAIL: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
