const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Find a quiz that has questions + audio
  const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/normalized-listening/_index.json'), 'utf8'));
  const goodOne = idx.find(q => q.questions > 5 && q.hasAudio) || idx[0];
  console.log(`Using quiz ${goodOne.id} (${goodOne.title}, ${goodOne.questions} questions)`);

  // Library page
  console.log('Library...');
  await page.goto('http://localhost:3000/luyen-thi/ielts/listening', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(__dirname, '../data/screenshots/local/listening-library.png'), fullPage: false });
  console.log('  saved listening-library.png');

  // Exam page
  console.log('Exam...');
  await page.goto(`http://localhost:3000/thi-thu/listening/${goodOne.id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(__dirname, '../data/screenshots/local/listening-exam.png'), fullPage: false });
  console.log('  saved listening-exam.png');

  // Result page
  console.log('Result...');
  await page.goto(`http://localhost:3000/practice/listening/${goodOne.id}/result`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, '../data/screenshots/local/listening-result.png'), fullPage: false });
  console.log('  saved listening-result.png');

  // Review page
  console.log('Review...');
  await page.goto(`http://localhost:3000/thi-thu/listening/${goodOne.id}?type=review`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(__dirname, '../data/screenshots/local/listening-review.png'), fullPage: false });
  console.log('  saved listening-review.png');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
