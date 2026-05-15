const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Pre-seed answers in localStorage
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => {
    // q19=sun (correct: sun/sunlight), q20=top (wrong, correct=upper), q21 empty, q22=north (correct)
    // Question IDs depend on data structure; let's set by scanning later
  });

  // Open exam in review mode
  await page.goto('http://localhost:3000/practice/reading/7361?type=review', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  // Set answers AFTER page reads quiz data — find question IDs from DOM
  await page.evaluate(() => {
    // Question IDs for q19, q20, q21, q22 of quiz 7361
    // We'll just set by guessing based on inspection: 44248 -> 44251 likely
    const answers = {};
    // Try setting all 13 questions worth of fill-in answers
    for (const q of document.querySelectorAll('[id^="question-"]')) {
      const qIdMatch = q.id.match(/^question-(\d+)$/);
      if (qIdMatch) {
        // skip for now - we'll populate via test
      }
    }
  });

  // Scroll to GAP_FILLING section using the question 19 anchor
  const target = await page.$('#question-set- ').catch(() => null);
  // Find element with text "Questions 19-22" or "light screen"
  const found = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    for (const el of all) {
      if (el.textContent && el.textContent.includes("'light screen' hypothesis") && el.children.length < 5) {
        const rect = el.getBoundingClientRect();
        return rect.top + window.scrollY;
      }
    }
    return null;
  });

  if (found) {
    await page.evaluate((y) => window.scrollTo(0, y - 200), found);
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: path.join(__dirname, '../data/screenshots/local/gapfill-zoom.png'), fullPage: false });
  console.log('Saved gapfill-zoom.png');

  await browser.close();
})();
