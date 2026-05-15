/**
 * crawl-reading-quiz.js
 * Crawl Reading theo TỪNG ĐỀ (không phải theo dạng).
 * Mỗi đề: vào /thi-thu/reading/{id}, lặp từng Part, screenshot + crop qsets.
 *
 * Usage:
 *   node src/crawl-reading-quiz.js --ids=7279,10011,10058
 *   node src/crawl-reading-quiz.js --sample=3        # 3 đề chuẩn diverse
 *   node src/crawl-reading-quiz.js --all              # toàn bộ 510 đề
 *   node src/crawl-reading-quiz.js --from=100 --to=200  # range
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

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT       = path.join(__dirname, '..');
const NORM       = path.join(ROOT, 'data/normalized');
const OUT_BASE   = path.join(ROOT, 'data/reading-shots');
const PROFILE    = path.join(ROOT, 'data/sessions/chrome-profile');
const CHROME_EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// ── Resolve ID list ───────────────────────────────────────────────────────────
async function resolveIds() {
  if (args.ids) {
    return args.ids.split(',').map(s => Number(s.trim())).filter(Boolean);
  }

  const files = (await fs.readdir(NORM))
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(f => Number(f.replace('.json', '')))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);

  if (args.sample) {
    // 3 đề mẫu diverse — chọn 7279 (multi-type), 10011 (TFNG+GAP), 10058 (table+match+choice)
    const wanted = [7279, 10011, 10058];
    const exist  = wanted.filter(id => files.includes(id));
    return exist.slice(0, Number(args.sample) || 3);
  }

  if (args.from || args.to) {
    const from = Number(args.from) || files[0];
    const to   = Number(args.to)   || files[files.length - 1];
    return files.filter(id => id >= from && id <= to);
  }

  if (args.all) return files;

  console.error('Need --ids=... | --sample=N | --from=X --to=Y | --all');
  process.exit(1);
}

// ── Detect question type của 1 question set element ───────────────────────────
async function detectQsetType(qsEl, quizData) {
  // Strategy 1: data attribute
  const attr = await qsEl.evaluate(el => el.getAttribute('data-qset-id') || el.getAttribute('data-qset-type'));
  if (attr) return attr;

  // Strategy 2: dùng quizData (từ normalized JSON) match theo thứ tự
  return null;
}

// ── Click vào Part N ở bottom nav ─────────────────────────────────────────────
async function clickPart(page, partIdx) {
  // partIdx: 0-based (Part 1 = idx 0)
  // Bottom nav: <div> chứa các tab "Part 1", "Part 2"...
  // Tìm bằng innerText match "Part {partIdx+1}"
  const partLabel = `Part ${partIdx + 1}`;
  const clicked = await page.evaluate((label) => {
    const all = Array.from(document.querySelectorAll('div, button, span'));
    for (const el of all) {
      const t = (el.innerText || '').trim();
      if (t === label && el.offsetParent !== null) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom > window.innerHeight - 200) {
          el.click();
          return true;
        }
      }
    }
    return false;
  }, partLabel);
  return clicked;
}

// ── Capture 1 part: screenshot + crop qsets ───────────────────────────────────
async function capturePart(page, partDir, quizData, partIdx) {
  await fs.ensureDir(partDir);
  await fs.ensureDir(path.join(partDir, 'qsets'));

  // Đợi content mount (radio/input/select)
  await Promise.race([
    page.waitForSelector('input[type="radio"], input[type="text"], select', { timeout: 12000 }),
    page.waitForTimeout(6000),
  ]).catch(() => {});
  await page.waitForTimeout(1500);

  // Scroll passage panel + questions panel về top
  await page.evaluate(() => {
    document.querySelectorAll('.interactive-question, [class*="passage"]').forEach(el => {
      const scrollable = el.closest('[class*="overflow"]') || el;
      scrollable.scrollTop = 0;
    });
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);

  // Screenshot viewport + full
  await page.screenshot({ path: path.join(partDir, 'viewport.png') });
  await page.screenshot({ path: path.join(partDir, 'full.png'), fullPage: true });

  // Crop từng question set (panel bên phải)
  const qsetEls = await page.$$('.interactive-question > div');
  let cropped = 0;
  if (qsetEls.length > 0) {
    // Map index → type từ quizData
    const types = (quizData?.parts?.[partIdx]?.questionSets || []).map(qs => qs.type);
    for (let i = 0; i < qsetEls.length; i++) {
      try {
        const bbox = await qsetEls[i].boundingBox();
        if (!bbox || bbox.height < 30) continue;
        const type = types[i] || 'UNKNOWN';
        const fname = `qset-${String(i + 1).padStart(2, '0')}-${type}.png`;
        await qsetEls[i].screenshot({ path: path.join(partDir, 'qsets', fname) });
        cropped++;
      } catch {}
    }
  }
  return { qsetCount: qsetEls.length, cropped };
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const ids = await resolveIds();
  console.log(`\n${ids.length} đề Reading sẽ crawl`);
  if (ids.length <= 10) console.log('IDs:', ids.join(', '));
  else console.log('IDs:', ids.slice(0, 5).join(', '), '...', ids.slice(-3).join(', '));
  console.log();

  // Launch Chrome thật, off-screen
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CHROME_EXE,
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-position=-2000,-2000',
      '--window-size=1440,900',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();

  // Verify session
  console.log('[verify] Kiểm tra session...');
  const r = await page.goto('https://youpass.vn/luyen-thi/ielts/reading', {
    waitUntil: 'domcontentloaded', timeout: 25000
  });
  await page.waitForTimeout(2500);
  const t = await page.title();
  if (r?.status() !== 200 || t.toLowerCase().includes('just a moment')) {
    console.error(`❌ Session/Cloudflare fail (status=${r?.status()}, title="${t}")`);
    console.error('   Login lại: node src/login-real-chrome.js');
    await ctx.close(); process.exit(1);
  }
  console.log(`✅ Session OK\n`);

  await fs.ensureDir(OUT_BASE);
  const results = [];

  for (let qi = 0; qi < ids.length; qi++) {
    const id = ids[qi];
    const dir = path.join(OUT_BASE, String(id));
    await fs.ensureDir(dir);
    const metaPath = path.join(dir, 'meta.json');

    // Skip nếu đã xong
    if (await fs.pathExists(metaPath)) {
      const m = await fs.readJson(metaPath);
      if (m.status === 'ok') {
        console.log(`[${qi+1}/${ids.length}] SKIP id=${id} (đã có)`);
        results.push({ id, status: 'skipped' });
        continue;
      }
    }

    // Load quiz data từ normalized JSON
    let quizData = null;
    try { quizData = await fs.readJson(path.join(NORM, `${id}.json`)); } catch {}
    const title = quizData?.title || '?';
    const partsCount = quizData?.parts?.length || 1;

    console.log(`\n[${qi+1}/${ids.length}] id=${id} | ${title.slice(0,55)}`);
    console.log(`  parts=${partsCount}`);
    const t0 = Date.now();
    const errors = [];
    const errListener = e => errors.push(e.message);
    page.on('pageerror', errListener);

    const partsCaptured = [];

    try {
      // Vào trang đề
      const examUrl = `https://youpass.vn/thi-thu/reading/${id}`;
      await page.goto(examUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3000);

      // Lưu HTML 1 lần
      const html = await page.content();
      await fs.writeFile(path.join(dir, 'page.html'), html);

      // Capture Part 1 (đã ở trang)
      const part0Dir = path.join(dir, 'parts', 'part-01');
      const r0 = await capturePart(page, part0Dir, quizData, 0);
      console.log(`  ✓ Part 1: ${r0.cropped}/${r0.qsetCount} qsets cropped`);
      partsCaptured.push({ idx: 1, ...r0 });

      // Loop các part còn lại
      for (let p = 1; p < partsCount; p++) {
        const ok = await clickPart(page, p);
        if (!ok) {
          console.log(`  ⚠ Part ${p+1}: không click được tab`);
          continue;
        }
        await page.waitForTimeout(2500);
        const partDir = path.join(dir, 'parts', `part-${String(p+1).padStart(2,'0')}`);
        const rp = await capturePart(page, partDir, quizData, p);
        console.log(`  ✓ Part ${p+1}: ${rp.cropped}/${rp.qsetCount} qsets cropped`);
        partsCaptured.push({ idx: p+1, ...rp });
      }

      // Meta
      await fs.writeJson(metaPath, {
        id, title, status: 'ok',
        partsCount,
        partsCaptured,
        types: quizData?.parts?.flatMap(p => p.questionSets.map(qs => qs.type)) || [],
        capturedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
        errors: errors.slice(0, 5),
      }, { spaces: 2 });
      results.push({ id, status: 'ok' });
      console.log(`  ✅ ${Date.now() - t0}ms`);

    } catch (e) {
      console.error(`  ❌ FAIL: ${e.message}`);
      await fs.writeJson(metaPath, {
        id, title, status: 'fail',
        partsCount, partsCaptured,
        capturedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
        error: e.message,
      }, { spaces: 2 });
      results.push({ id, status: 'fail', error: e.message });
    } finally {
      page.off('pageerror', errListener);
    }

    await page.waitForTimeout(1000);
  }

  await ctx.close();

  // Summary
  const ok   = results.filter(r => r.status === 'ok').length;
  const skip = results.filter(r => r.status === 'skipped').length;
  const fail = results.filter(r => r.status === 'fail').length;
  console.log(`\n═══════════════════════════`);
  console.log(`✅ ${ok} ok | ⏭ ${skip} skip | ❌ ${fail} fail`);
  if (fail > 0) console.log('Fail ids:', results.filter(r=>r.status==='fail').map(r=>r.id).join(', '));
  console.log(`Output: data/reading-shots/<id>/parts/part-NN/{viewport.png, full.png, qsets/*.png}`);
})();
