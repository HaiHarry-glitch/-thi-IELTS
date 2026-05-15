// Snap original portal pages for listening UI reference.
// Uses saved session.
const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const STORAGE = path.join(__dirname, '../data/sessions/storage-state.json');
const OUT = path.join(__dirname, '../data/portal-listening-snapshots');

(async () => {
  if (!await fs.pathExists(STORAGE)) {
    console.error('No session');
    process.exit(1);
  }
  await fs.ensureDir(OUT);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: STORAGE,
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  const ID = 10459;  // user's working sample

  console.log('Test session + take portal screenshots...');

  const pages = [
    { name: '1-library', url: 'https://youpass.vn/luyen-thi/ielts/listening?quiz_type=quiz&status=unfinished' },
    { name: '2-exam-fresh', url: `https://youpass.vn/thi-thu/listening/${ID}` },
    { name: '3-exam-10501', url: 'https://youpass.vn/thi-thu/listening/10501' },
  ];

  for (const p of pages) {
    console.log(`\n[${p.name}] ${p.url}`);
    try {
      const resp = await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(3500);

      const finalUrl = page.url();
      const title = await page.title();
      const isLoggedIn = !finalUrl.includes('/login') && !finalUrl.includes('signin');
      console.log(`  status=${resp.status()}, final=${finalUrl}, title="${title.slice(0, 60)}", loggedIn=${isLoggedIn}`);

      const dir = path.join(OUT, p.name);
      await fs.ensureDir(dir);
      await page.screenshot({ path: path.join(dir, 'viewport.png'), fullPage: false });
      await page.screenshot({ path: path.join(dir, 'fullpage.png'), fullPage: true });
      const html = await page.content();
      await fs.writeFile(path.join(dir, 'page.html'), html);
      await fs.writeJson(path.join(dir, 'meta.json'), { url: p.url, finalUrl, title, loggedIn: isLoggedIn, capturedAt: new Date().toISOString() }, { spaces: 2 });
      console.log(`  saved ${dir}`);
    } catch (e) { console.error(`  FAIL: ${e.message}`); }
  }

  // Also try to capture exam mid-play (after clicking Play)
  console.log(`\n[4-exam-after-play] click Play and snap`);
  try {
    await page.goto(`https://youpass.vn/thi-thu/listening/${ID}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);
    // Try clicking the Play button
    const playBtn = await page.$('button:has-text("Play")');
    if (playBtn) {
      await playBtn.click();
      await page.waitForTimeout(1500);
      const dir = path.join(OUT, '4-exam-after-play');
      await fs.ensureDir(dir);
      await page.screenshot({ path: path.join(dir, 'viewport.png'), fullPage: false });
      await page.screenshot({ path: path.join(dir, 'fullpage.png'), fullPage: true });
      console.log(`  saved`);
    } else {
      console.log(`  no Play button found`);
    }
  } catch (e) { console.error(`  FAIL: ${e.message}`); }

  await browser.close();
  console.log('\nDone.');
})();
