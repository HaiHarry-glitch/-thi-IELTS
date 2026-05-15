const { chromium } = require('playwright');
const path = require('path');

const IDS = [
  { id: 7298, tag: 'note_completion' },
  { id: 7361, tag: 'table_selection' },
  { id: 7875, tag: 'matching_headings' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const { id, tag } of IDS) {
    console.log(`Loading /thi-thu/reading/${id} (${tag})...`);
    try {
      await page.goto(`http://localhost:3000/thi-thu/reading/${id}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500);
      const file = path.join(__dirname, `../data/screenshots/local/${id}-${tag}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log(`  saved ${file}`);
    } catch (e) {
      console.error(`  FAIL: ${e.message}`);
    }
  }
  await browser.close();
})();
