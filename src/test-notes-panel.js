const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:3000/thi-thu/reading/10011', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);

  // Pre-seed two notes via localStorage
  await page.evaluate(() => {
    const notes = [
      { id: 'a', quizId: 10011, partIdx: 0, selectedText: 'Caral', content: 'Ancient city in Peru', createdAt: Date.now() },
      { id: 'b', quizId: 10011, partIdx: 0, selectedText: 'pyramids', content: '', createdAt: Date.now() },
    ];
    localStorage.setItem('yp_notes_10011', JSON.stringify(notes));
  });

  // Reload to pick up notes
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);

  // Click the hamburger menu to open notes panel
  await page.click('button[title="Notes"]');
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(__dirname, '../data/screenshots/local/notes-panel.png'), fullPage: false });
  console.log('Saved notes-panel.png');

  await browser.close();
})();
