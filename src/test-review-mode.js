const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Pre-seed answers for quiz 7361 - need real question IDs
  const quizData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/normalized/7361.json'), 'utf8'));
  const allQs = quizData.parts.flatMap(p => p.questionSets.flatMap(qs => qs.questions));

  // Build sample answers: half right, some wrong, some empty
  const answers = {};
  for (const q of allQs) {
    if (Math.random() < 0.4) continue; // skip 40%
    if (Math.random() < 0.5) {
      // correct
      const c = q.correctAnswer || (q.correctAnswers ? q.correctAnswers[0] : null);
      if (c) answers[q.id] = c;
    } else {
      // wrong
      answers[q.id] = q.type === 'GAP_FILLING' ? 'wrongword' : 'A';
    }
  }

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((ans) => {
    localStorage.setItem('yp_answers_7361', JSON.stringify(ans));
  }, answers);

  await page.goto('http://localhost:3000/thi-thu/reading/7361?type=review', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(__dirname, '../data/screenshots/local/review-mode-7361.png'), fullPage: false });
  console.log('Saved review-mode-7361.png');

  // Also full-page
  await page.screenshot({ path: path.join(__dirname, '../data/screenshots/local/review-mode-7361-full.png'), fullPage: true });
  console.log('Saved full');

  // Click expand on first explanation if any
  const expandBtn = await page.$('button:has-text("Xem giải thích")');
  if (expandBtn) {
    await expandBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(__dirname, '../data/screenshots/local/review-explained.png'), fullPage: false });
    console.log('Saved explained');
  }

  await browser.close();
})();
