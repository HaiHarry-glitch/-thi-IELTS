const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Pre-seed answers to test review mode
  await page.goto('http://localhost:3000/practice/reading/7361?type=review', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    // Simulate some answered questions for quiz 7361
    const answers = {
      // Question 19 (gap filling) — wrong answer
      "44248": "wind",
      // Question 20 — correct answer
      "44249": "upper",
      // Question 21 — empty (skipped)
    };
    localStorage.setItem('yp_answers_7361', JSON.stringify(answers));
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  // Scroll to GAP_FILLING area (Questions 19-22)
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(__dirname, '../data/screenshots/local/gapfill-review.png'), fullPage: false });
  console.log('Saved gapfill-review.png');

  // Also full page
  await page.screenshot({ path: path.join(__dirname, '../data/screenshots/local/gapfill-review-full.png'), fullPage: true });

  await browser.close();
})();
