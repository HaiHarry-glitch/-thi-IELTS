const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Pick representative quizzes covering different types
  const quizzes = [
    { id: 10501, label: 'type10-mcq' },     // type=10 user gave us
    { id: 7450, label: 'type10-c15' },      // type=10 with listen_from/to
    { id: 8428, label: 'type10-forecast' }, // type=10 forecast
    { id: 1003, label: 'type2-trainer' },   // type=2 (older)
  ];

  for (const q of quizzes) {
    console.log(`Quiz ${q.id} (${q.label})...`);
    try {
      await page.goto(`http://localhost:3000/thi-thu/listening/${q.id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(__dirname, `../data/screenshots/local/listening-${q.id}-${q.label}.png`), fullPage: false });
      console.log(`  saved`);
    } catch (e) { console.log(`  ERR: ${e.message}`); }
  }
  await browser.close();
})();
