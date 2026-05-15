const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const quizData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/normalized/7361.json'), 'utf8'));
  const allQs = quizData.parts.flatMap(p => p.questionSets.flatMap(qs => qs.questions));

  const answers = {};
  for (const q of allQs) {
    const c = q.correctAnswer || (q.correctAnswers ? q.correctAnswers[0] : null);
    if (!c) continue;
    if (q.order === 19) answers[q.id] = "wrong";  // wrong
    else if (q.order === 20) answers[q.id] = "upper"; // correct
    else if (q.order === 22) answers[q.id] = c; // correct
    // 21 left empty
  }

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((ans) => {
    localStorage.setItem('yp_answers_7361', JSON.stringify(ans));
  }, answers);

  await page.goto('http://localhost:3000/thi-thu/reading/7361?type=review', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  // Click question number 19 in bottom bar to scroll there
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const b of buttons) {
      if (b.textContent.trim() === '19') { b.click(); return; }
    }
  });
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(__dirname, '../data/screenshots/local/gap-review-zoom.png'), fullPage: false });
  console.log('Saved');

  await browser.close();
})();
