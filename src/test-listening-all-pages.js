const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const OUT = path.join(__dirname, '../data/screenshots/local');

  const id = 10501; // type=10 reference
  const idLegacy = 1002; // type=2 fill-blank

  // 1. Library
  console.log('Library...');
  await page.goto('http://localhost:3000/luyen-thi/ielts/listening', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, 'L-library.png'), fullPage: false });

  // 2. Exam (10501 type=10)
  console.log('Exam 10501 (type10)...');
  await page.goto(`http://localhost:3000/thi-thu/listening/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, 'L-exam-10501.png'), fullPage: false });

  // 3. Exam (1002 type=2 with gap fill expanded)
  console.log('Exam 1002 (fill blank)...');
  await page.goto(`http://localhost:3000/thi-thu/listening/${idLegacy}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, 'L-exam-1002.png'), fullPage: false });

  // 4. Result page
  console.log('Result 10501...');
  await page.goto(`http://localhost:3000/practice/listening/${id}/result`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, 'L-result-10501.png'), fullPage: false });

  // 5. Review (with seeded answers)
  console.log('Review 10501 (with answers)...');
  // Seed some answers
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, `../data/normalized-listening/${id}.json`), 'utf8'));
  const answers = {};
  for (const p of quiz.parts) {
    for (const qs of p.questionSets) {
      for (const q of qs.questions) {
        if (Math.random() < 0.5 && q.correctAnswer) answers[q.id] = q.correctAnswer;
        else if (Math.random() < 0.7) answers[q.id] = 'wrong';
      }
    }
  }
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((a) => localStorage.setItem(`yp_answers_${10501}`, JSON.stringify(a)), answers);
  await page.goto(`http://localhost:3000/thi-thu/listening/${id}?type=review`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, 'L-review-10501.png'), fullPage: false });

  console.log('All screenshots saved to', OUT);
  await browser.close();
})();
