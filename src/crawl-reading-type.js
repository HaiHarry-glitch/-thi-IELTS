/**
 * crawl-reading-type.js
 * Crawl ảnh từng đề Reading theo dạng bài.
 * Dùng Chrome thật + headed off-screen → bypass Cloudflare.
 *
 * Usage:
 *   node src/crawl-reading-type.js --type=GAP_FILLING --sample=3
 *   node src/crawl-reading-type.js --type=GAP_FILLING --all
 */
const { chromium } = require('playwright');
const fs   = require('fs-extra');
const path = require('path');

// ── CLI ───────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const TYPE   = args.type;
const SAMPLE = args.sample ? Number(args.sample) : null;
const ALL    = !!args.all;
if (!TYPE) { console.error('Usage: --type=GAP_FILLING [--sample=3 | --all]'); process.exit(1); }
if (!SAMPLE && !ALL) { console.error('Need --sample=N or --all'); process.exit(1); }

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT       = path.join(__dirname, '..');
const IDX        = path.join(ROOT, 'data/reading-type-index.json');
const OUT_BASE   = path.join(ROOT, 'data/reading-shots');
const PROFILE    = path.join(ROOT, 'data/sessions/chrome-profile');
const CHROME_EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const idx = await fs.readJson(IDX);
  const entries = idx.byType[TYPE];
  if (!entries?.length) { console.error(`Type "${TYPE}" not found`); process.exit(1); }

  // Deduplicate
  const seen = new Set();
  const quizList = entries.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
  const toProcess = SAMPLE ? quizList.slice(0, SAMPLE) : quizList;

  console.log(`\n[${TYPE}] ${toProcess.length} đề sẽ crawl`);
  toProcess.forEach((q, i) => console.log(`  ${i+1}. id=${q.id} | ${q.title}`));
  console.log();

  // ── Launch Chrome thật, off-screen ─────────────────────────────────────────
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CHROME_EXE,
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-position=-2000,-2000',  // off-screen → invisible
      '--window-size=1440,900',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = ctx.pages()[0] || await ctx.newPage();

  // Verify session 1 lần
  console.log('[verify] Kiểm tra session...');
  const r = await page.goto('https://youpass.vn/luyen-thi/ielts/reading', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(3000);
  const title = await page.title();
  if (r?.status() !== 200 || title.toLowerCase().includes('just a moment')) {
    console.error(`❌ Session/Cloudflare fail (status=${r?.status()}, title="${title}")`);
    console.error('   Chạy lại login: node src/login-real-chrome.js');
    await ctx.close(); process.exit(1);
  }
  console.log(`✅ Session OK (${title.slice(0,60)})`);

  await fs.ensureDir(OUT_BASE);
  const results = [];

  // ── Process từng quiz ─────────────────────────────────────────────────────
  for (let qi = 0; qi < toProcess.length; qi++) {
    const { id, title } = toProcess[qi];
    const dir = path.join(OUT_BASE, String(id));
    await fs.ensureDir(dir);
    await fs.ensureDir(path.join(dir, 'qsets'));

    const metaPath = path.join(dir, 'meta.json');
    if (await fs.pathExists(metaPath)) {
      const m = await fs.readJson(metaPath);
      if (m.status === 'ok') {
        console.log(`\n[${qi+1}/${toProcess.length}] SKIP id=${id} (đã có)`);
        results.push({ id, status: 'skipped' });
        continue;
      }
    }

    console.log(`\n[${qi+1}/${toProcess.length}] id=${id} | ${title}`);
    const t0 = Date.now();
    const errors = [];
    const errListener = e => errors.push(e.message);
    page.on('pageerror', errListener);

    try {
      // ── ONLY thi-thu URL — đây là trang THI (exam mode) ──────────────────
      // /practice/reading/ → redirect sang e-learning = chế độ luyện (KHÔNG dùng)
      const examUrl = `https://youpass.vn/thi-thu/reading/${id}`;
      await page.goto(examUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

      // Đợi câu hỏi render (radio buttons, input text, select...)
      await Promise.race([
        page.waitForSelector('input[type="radio"]', { timeout: 15000 }),
        page.waitForSelector('input[type="text"]', { timeout: 15000 }),
        page.waitForSelector('select', { timeout: 15000 }),
        page.waitForTimeout(8000),
      ]).catch(() => {});
      await page.waitForTimeout(2000);

      // Viewport screenshot
      await page.screenshot({ path: path.join(dir, '01-exam.png') });
      // Full-page screenshot
      await page.screenshot({ path: path.join(dir, '02-exam-full.png'), fullPage: true });
      console.log(`  ✓ exam (${page.url()})`);

      // Lưu HTML
      const html = await page.content();
      await fs.writeFile(path.join(dir, 'page.html'), html);

      // ── Crop từng question set (panel bên phải) ───────────────────────────
      // Portal dùng split layout: passage trái | questions phải
      // questions panel: div.interactive-question hoặc div[class*="question"]
      const qsetEls = await page.$$('.interactive-question > div');
      if (qsetEls.length > 0) {
        for (let i = 0; i < qsetEls.length; i++) {
          try {
            const bbox = await qsetEls[i].boundingBox();
            if (!bbox || bbox.height < 20) continue;
            const fname = path.join(dir, 'qsets', `qset-${String(i+1).padStart(2,'0')}-${TYPE}.png`);
            await qsetEls[i].screenshot({ path: fname });
          } catch {}
        }
        console.log(`  ✓ ${qsetEls.length} qset crop`);
      } else {
        // fallback: crop toàn bộ questions area
        const iqEl = await page.$('.interactive-question');
        if (iqEl) {
          await iqEl.screenshot({ path: path.join(dir, 'qsets', `qset-01-${TYPE}.png`) });
          console.log(`  ✓ crop fallback`);
        } else {
          console.log(`  ⚠ không tìm thấy .interactive-question`);
        }
      }

      // ── 4. Meta ───────────────────────────────────────────────────────────
      await fs.writeJson(metaPath, {
        id, title, type: TYPE, status: 'ok',
        capturedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
        errors: errors.slice(0, 5),
      }, { spaces: 2 });
      results.push({ id, status: 'ok' });
      console.log(`  ✅ ${Date.now() - t0}ms`);

    } catch (e) {
      console.error(`  ❌ FAIL: ${e.message}`);
      await fs.writeJson(metaPath, {
        id, title, type: TYPE, status: 'fail',
        capturedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
        error: e.message,
      }, { spaces: 2 });
      results.push({ id, status: 'fail', error: e.message });
    } finally {
      page.off('pageerror', errListener);
    }

    await page.waitForTimeout(1200);
  }

  await ctx.close();

  // ── Summary ────────────────────────────────────────────────────────────────
  const ok   = results.filter(r => r.status === 'ok').length;
  const skip = results.filter(r => r.status === 'skipped').length;
  const fail = results.filter(r => r.status === 'fail').length;
  console.log(`\n═══════════════════════════`);
  console.log(`[${TYPE}] ✅ ${ok} ok | ⏭ ${skip} skip | ❌ ${fail} fail`);
  if (fail > 0) console.log('Fail ids:', results.filter(r=>r.status==='fail').map(r=>r.id).join(', '));
  console.log(`Output: data/reading-shots/<id>/`);
})();
