const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  // Load index, find quizzes covering different question types
  const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/normalized-listening/_index.json'), 'utf8'));
  const NORM_DIR = path.join(__dirname, '../data/normalized-listening');

  // Find one quiz per major question type
  const wantTypes = ['MULTIPLE_CHOICE_ONE', 'FILL_BLANK', 'MATCHING_INFO', 'MAP_DIAGRAM_LABEL', 'MULTIPLE_CHOICE_MANY', 'MATCHING'];
  const samples = {};
  for (const summary of idx) {
    if (!summary.hasAudio) continue;
    const q = JSON.parse(fs.readFileSync(path.join(NORM_DIR, `${summary.id}.json`), 'utf8'));
    for (const p of q.parts) {
      for (const qs of p.questionSets) {
        if (wantTypes.includes(qs.type) && !samples[qs.type]) {
          samples[qs.type] = { id: q.id, title: q.title };
        }
      }
    }
    if (Object.keys(samples).length === wantTypes.length) break;
  }

  console.log('Picked samples:', samples);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  for (const [type, info] of Object.entries(samples)) {
    console.log(`Quiz ${info.id} (${type})...`);
    try {
      await page.goto(`http://localhost:3000/thi-thu/listening/${info.id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);
      const fname = `listening-${info.id}-${type.toLowerCase()}.png`;
      await page.screenshot({ path: path.join(__dirname, `../data/screenshots/local/${fname}`), fullPage: false });
      console.log(`  saved ${fname}`);
    } catch (e) {
      console.log(`  ERR: ${e.message}`);
    }
  }
  await browser.close();
})();
