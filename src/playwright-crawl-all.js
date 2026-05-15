// Playwright-based crawler for all quiz UI pages.
// Uses saved session (data/sessions/storage-state.json) — no Firecrawl needed.
// For each quiz id, navigates to https://youpass.vn/thi-thu/reading/{id},
// waits for the SPA to render, then saves full-page screenshot + body HTML.
//
// Resumable: skips quizzes whose screenshot already exists.
const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const STORAGE_STATE = path.join(__dirname, '../data/sessions/storage-state.json');
const NORMALIZED = path.join(__dirname, '../data/normalized');
const OUT = path.join(__dirname, '../data/portal-crawl');
const PROGRESS = path.join(OUT, '_progress.json');

const ARGS = process.argv.slice(2);
const LIMIT = ARGS.includes('--limit') ? Number(ARGS[ARGS.indexOf('--limit') + 1]) : Infinity;
const VIEWPORT = { width: 1440, height: 900 };
const PER_PAGE_TIMEOUT = 35000;
const SETTLE_MS = 2200;

(async () => {
  if (!await fs.pathExists(STORAGE_STATE)) {
    console.error('No session at', STORAGE_STATE);
    process.exit(1);
  }
  await fs.ensureDir(OUT);

  // Build list of quiz IDs from normalized data
  const files = (await fs.readdir(NORMALIZED)).filter(f => f.endsWith('.json'));
  const allIds = files.map(f => Number(f.replace('.json', ''))).filter(n => !Number.isNaN(n)).sort((a, b) => a - b);
  console.log(`Total quizzes: ${allIds.length}`);

  // Filter out already crawled
  const todo = [];
  let done = 0;
  for (const id of allIds) {
    const dir = path.join(OUT, String(id));
    if (await fs.pathExists(path.join(dir, 'screenshot.png'))) { done++; continue; }
    todo.push(id);
  }
  const slice = todo.slice(0, LIMIT === Infinity ? todo.length : LIMIT);
  console.log(`Already done: ${done}, to crawl: ${todo.length}, this run: ${slice.length}`);
  if (slice.length === 0) { console.log('Nothing to do.'); return; }

  // Launch browser with saved session
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: STORAGE_STATE,
    viewport: VIEWPORT,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  // Block heavy assets we don't need (videos, large images outside the SPA)
  await ctx.route('**/*', (route) => {
    const t = route.request().resourceType();
    if (t === 'media' || t === 'font') { route.abort(); return; }
    route.continue();
  });

  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(PER_PAGE_TIMEOUT);

  let ok = 0, fail = 0, redirected = 0;
  const startTs = Date.now();
  const failed = [];

  for (let i = 0; i < slice.length; i++) {
    const id = slice[i];
    const url = `https://youpass.vn/thi-thu/reading/${id}`;
    const dir = path.join(OUT, String(id));
    await fs.ensureDir(dir);

    const elapsed = ((Date.now() - startTs) / 1000).toFixed(0);
    const avg = (ok + fail) > 0 ? ((Date.now() - startTs) / (ok + fail) / 1000).toFixed(1) : '?';
    const eta = (ok + fail) > 0 ? `eta ~${((slice.length - (ok + fail)) * (Date.now() - startTs) / (ok + fail) / 60000).toFixed(1)}m` : '';
    console.log(`[${i+1}/${slice.length} t=${elapsed}s avg=${avg}s/q ${eta}] ${id}`);

    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PER_PAGE_TIMEOUT });
      // Wait for SPA-rendered passage to appear (any of these selectors)
      try {
        await page.waitForSelector('main, .passage-html, [class*="passage"], img[src*="Logo-power"]', { timeout: 8000 });
      } catch {}
      await page.waitForTimeout(SETTLE_MS);

      // Detect login redirect
      const finalUrl = page.url();
      if (!finalUrl.includes(`/thi-thu/reading/${id}`)) {
        redirected++;
        console.log(`  REDIRECT to ${finalUrl}`);
        await fs.writeJson(path.join(dir, 'error.json'), { id, redirectedTo: finalUrl, ts: new Date().toISOString() }, { spaces: 2 });
        fail++;
        continue;
      }

      const title = await page.title();
      // Detect application error / SPA crash
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
      if (/Application error|client-side exception/i.test(bodyText)) {
        console.log(`  SPA_ERROR (deleted/broken quiz)`);
        await fs.writeJson(path.join(dir, 'error.json'), { id, kind: 'spa_error', bodyText: bodyText.slice(0, 200), ts: new Date().toISOString() }, { spaces: 2 });
        fail++;
        continue;
      }

      // Capture full page screenshot
      await page.screenshot({ path: path.join(dir, 'screenshot.png'), fullPage: true });
      // Capture viewport-only too (cleaner for visual diffing)
      await page.screenshot({ path: path.join(dir, 'viewport.png'), fullPage: false });
      // Capture HTML
      const html = await page.content();
      await fs.writeFile(path.join(dir, 'page.html'), html);

      await fs.writeJson(path.join(dir, 'meta.json'), {
        id, url, finalUrl, title,
        capturedAt: new Date().toISOString(),
        htmlBytes: html.length,
      }, { spaces: 2 });

      ok++;
      console.log(`  OK title="${title.slice(0, 50)}" htmlBytes=${html.length}`);
    } catch (err) {
      fail++;
      failed.push({ id, error: err.message });
      console.error(`  FAIL: ${err.message}`);
      await fs.writeJson(path.join(dir, 'error.json'), { id, error: err.message, ts: new Date().toISOString() }, { spaces: 2 });
    }

    // Periodically write progress
    if (i % 10 === 0) {
      await fs.writeJson(PROGRESS, {
        startedAt: new Date(startTs).toISOString(),
        ok, fail, redirected,
        progress: i + 1,
        total: slice.length,
        lastId: id,
      }, { spaces: 2 });
    }
  }

  await fs.writeJson(PROGRESS, {
    startedAt: new Date(startTs).toISOString(),
    finishedAt: new Date().toISOString(),
    ok, fail, redirected,
    totalAttempted: slice.length,
  }, { spaces: 2 });

  if (failed.length) {
    await fs.writeJson(path.join(OUT, '_failed.json'), failed, { spaces: 2 });
  }

  const totalMin = ((Date.now() - startTs) / 60000).toFixed(1);
  console.log(`\nDone in ${totalMin}m: ${ok} OK, ${fail} fail, ${redirected} redirect (of ${slice.length})`);

  await browser.close();
})().catch(err => { console.error('Fatal:', err); process.exit(1); });
