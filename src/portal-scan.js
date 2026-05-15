// Quét toàn bộ UI ở portal youpass đang đăng nhập (dùng session đã lưu).
// Capture screenshot full-page + HTML + outer DOM của các trang chính.
const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const STORAGE_STATE = path.join(__dirname, '../data/sessions/storage-state.json');
const OUT = path.join(__dirname, '../data/portal-scan');

const TARGETS = [
  { name: '1-library',          url: 'https://youpass.vn/luyen-thi/ielts/reading?quiz_type=quiz&status=unfinished' },
  { name: '1b-library-finished',url: 'https://youpass.vn/luyen-thi/ielts/reading?quiz_type=quiz&status=finished' },
  { name: '2-prep',             url: 'https://youpass.vn/thi-thu/reading/7926' },
  { name: '3-result',           url: 'https://e-learning.youpass.vn/practice/reading/7926/result?answerId=13245539' },
  { name: '4-review',           url: 'https://e-learning.youpass.vn/practice/reading/7926?type=review&answerId=13245539' },
  { name: '5-exam-clean',       url: 'https://e-learning.youpass.vn/practice/reading/7926' },
];

(async () => {
  if (!await fs.pathExists(STORAGE_STATE)) {
    console.error('No session at', STORAGE_STATE);
    process.exit(1);
  }
  await fs.ensureDir(OUT);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: STORAGE_STATE,
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  for (const t of TARGETS) {
    console.log(`\n[${t.name}] ${t.url}`);
    const dir = path.join(OUT, t.name);
    await fs.ensureDir(dir);

    try {
      await page.goto(t.url, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(2500); // let SPA settle

      // 1440x900 above-the-fold
      await page.screenshot({ path: path.join(dir, 'viewport.png'), fullPage: false });
      // full page
      await page.screenshot({ path: path.join(dir, 'fullpage.png'), fullPage: true });

      const html = await page.content();
      await fs.writeFile(path.join(dir, 'page.html'), html);

      // outerHTML of body only (more compact)
      const body = await page.evaluate(() => document.body.outerHTML);
      await fs.writeFile(path.join(dir, 'body.html'), body);

      // current url after redirects
      await fs.writeJson(path.join(dir, 'meta.json'), {
        finalUrl: page.url(),
        title: await page.title(),
      }, { spaces: 2 });

      console.log(`  OK final=${page.url()} title="${await page.title()}"`);
    } catch (err) {
      console.error(`  FAIL: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`\nDone -> ${OUT}`);
})();
