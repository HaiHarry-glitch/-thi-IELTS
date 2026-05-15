// Pick a representative listening quiz for each question type and snap the
// original portal page. We need to BYPASS the audio gate to see the questions,
// so this script clicks Play first.
const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const NORM = path.join(__dirname, '../data/normalized-listening');
const STORAGE = path.join(__dirname, '../data/sessions/storage-state.json');
const OUT = path.join(__dirname, '../data/portal-by-type');

(async () => {
  // Find one good quiz per type — filter to IDs known to render (have portal-crawl screenshot)
  const idx = await fs.readJson(path.join(NORM, '_index.json'));
  const PORTAL_CRAWL = path.join(__dirname, '../data/portal-crawl-listening');
  const workingIds = new Set();
  for (const d of await fs.readdir(PORTAL_CRAWL)) {
    if (await fs.pathExists(path.join(PORTAL_CRAWL, d, 'screenshot.png'))) {
      workingIds.add(Number(d));
    }
  }
  console.log(`${workingIds.size} known-working portal IDs`);

  const wantTypes = [
    'SINGLE_CHOICE', 'MULTIPLE_CHOICE_MANY',
    'GAP_FILLING', 'NOTE_COMPLETION',
    'TABLE_SELECTION',
    'MATCHING_ENDINGS', 'MATCHING_FEATURES',
  ];
  const samples = {};
  const sorted = [...idx].filter(q => q.hasAudio && q.questions > 0 && workingIds.has(q.id)).sort((a, b) => b.id - a.id);
  for (const summary of sorted) {
    const q = await fs.readJson(path.join(NORM, `${summary.id}.json`));
    for (const p of q.parts) {
      for (const qs of p.questionSets) {
        if (wantTypes.includes(qs.type) && !samples[qs.type]) {
          samples[qs.type] = { id: q.id, title: q.title.slice(0, 40) };
        }
      }
    }
    if (Object.keys(samples).length === wantTypes.length) break;
  }

  console.log('Picked samples:');
  for (const [t, s] of Object.entries(samples)) console.log(`  ${t.padEnd(25)} -> ${s.id}: ${s.title}`);

  await fs.ensureDir(OUT);
  await fs.writeJson(path.join(OUT, '_samples.json'), samples, { spaces: 2 });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: STORAGE,
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();

  for (const [type, info] of Object.entries(samples)) {
    const dir = path.join(OUT, `${type}-${info.id}`);
    await fs.ensureDir(dir);
    const url = `https://youpass.vn/thi-thu/listening/${info.id}`;
    console.log(`\n[${type}] ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Snap before-Play
      await page.screenshot({ path: path.join(dir, 'before-play.png'), fullPage: false });

      // Click Play to dismiss the audio gate so questions are fully visible
      const playBtn = await page.$('button:has-text("Play")');
      if (playBtn) {
        await playBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(dir, 'after-play.png'), fullPage: false });
        await page.screenshot({ path: path.join(dir, 'after-play-full.png'), fullPage: true });
      }

      const html = await page.content();
      await fs.writeFile(path.join(dir, 'page.html'), html);
      console.log(`  saved ${dir}`);
    } catch (e) { console.error(`  FAIL: ${e.message}`); }
  }

  await browser.close();
  console.log('\nDone.');
})();
