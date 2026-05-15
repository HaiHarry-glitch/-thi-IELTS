/**
 * crawl-with-real-chrome.js
 * Dùng Chrome thật (đã login sẵn + cf_clearance) thay vì browser giả.
 * Playwright launchPersistentContext với user data dir của Chrome thật.
 *
 * Usage:
 *   node src/crawl-with-real-chrome.js --type=GAP_FILLING --sample=3
 *   node src/crawl-with-real-chrome.js --type=GAP_FILLING --all
 *
 * QUAN TRỌNG: Đóng Chrome thật trước khi chạy script này!
 *             (Chrome lock profile khi đang mở)
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

// ── CLI args ──────────────────────────────────────────────────────────────────
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
const ROOT      = path.join(__dirname, '..');
const IDX       = path.join(ROOT, 'data/reading-type-index.json');
const OUT_BASE  = path.join(ROOT, 'data/reading-shots');

// Chrome thật của user (Windows path → chuyển thành format node)
const CHROME_EXE      = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CHROME_USER_DATA = 'C:\\Users\\ACER\\AppData\\Local\\Google\\Chrome\\User Data';
const CHROME_PROFILE  = args.profile || 'Default'; // hoặc "Profile 1", "Profile 2"...

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  // Load type index
  const idx = await fs.readJson(IDX);
  const entries = idx.byType[TYPE];
  if (!entries?.length) { console.error(`Type "${TYPE}" not found`); process.exit(1); }

  // Deduplicate ids
  const seen = new Set();
  const quizList = entries.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
  const toProcess = SAMPLE ? quizList.slice(0, SAMPLE) : quizList;

  console.log(`\n[${TYPE}] ${toProcess.length} quiz(zes) to capture`);
  toProcess.forEach((q, i) => console.log(`  ${i+1}. id=${q.id} | ${q.title}`));
  console.log(`\n⚠  Đảm bảo Chrome đã ĐÓNG hoàn toàn trước khi tiếp tục!`);

  // Tạo thư mục output
  await fs.ensureDir(OUT_BASE);

  // Launch Chrome thật qua launchPersistentContext
  console.log('\n[browser] Đang mở Chrome thật...');
  const profilePath = path.join(CHROME_USER_DATA, CHROME_PROFILE);

  let ctx;
  try {
    ctx = await chromium.launchPersistentContext(profilePath, {
      executablePath: CHROME_EXE,
      headless: true,           // headless với profile thật — Cloudflare không detect được
      viewport: { width: 1440, height: 900 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',  // bỏ extension để không bị conflict
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });
  } catch (e) {
    // Nếu headless fail (Chrome lock profile), thử không headless
    console.log('  headless fail, thử headed mode...');
    ctx = await chromium.launchPersistentContext(profilePath, {
      executablePath: CHROME_EXE,
      headless: false,
      viewport: { width: 1440, height: 900 },
      args: ['--disable-blink-features=AutomationControlled', '--no-first-run', '--no-default-browser-check'],
    });
  }

  const page = await ctx.newPage();

  // ── Session / Cloudflare check ────────────────────────────────────────────
  console.log('\n[auth] Kiểm tra session...');
  await page.goto('https://youpass.vn/luyen-thi/ielts/reading', {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await page.waitForTimeout(3000);

  const finalUrl = page.url();
  const pageTitle = await page.title();
  console.log(`  URL: ${finalUrl}`);
  console.log(`  Title: ${pageTitle}`);

  if (finalUrl.includes('login') || finalUrl.includes('dang-nhap')) {
    console.error('❌ Chưa đăng nhập. Hãy đăng nhập vào Chrome thật trước.');
    await ctx.close(); process.exit(1);
  }
  if (pageTitle.toLowerCase().includes('security') || pageTitle.toLowerCase().includes('just a moment')) {
    console.error('❌ Cloudflare chặn. Chrome profile này chưa có cf_clearance.');
    await ctx.close(); process.exit(1);
  }
  console.log('✅ Session OK!');

  // ── Lưu cookies vào storage-state.json để tái sử dụng sau ────────────────
  const ssPath = path.join(ROOT, 'data/sessions/storage-state.json');
  await ctx.storageState({ path: ssPath });
  console.log(`✅ Cookies đã save vào ${ssPath}`);

  // ── Process từng quiz ─────────────────────────────────────────────────────
  const results = [];

  for (let qi = 0; qi < toProcess.length; qi++) {
    const { id, title } = toProcess[qi];
    const dir = path.join(OUT_BASE, String(id));
    await fs.ensureDir(dir);
    await fs.ensureDir(path.join(dir, 'qsets'));

    // Skip nếu đã có
    const metaPath = path.join(dir, 'meta.json');
    if (await fs.pathExists(metaPath)) {
      const m = await fs.readJson(metaPath);
      if (m.status === 'ok') {
        console.log(`\n[${qi+1}/${toProcess.length}] SKIP id=${id} (already done)`);
        results.push({ id, status: 'skipped' });
        continue;
      }
    }

    console.log(`\n[${qi+1}/${toProcess.length}] id=${id} | ${title}`);
    const t0 = Date.now();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    try {
      // ── 1. Trang chuẩn bị (/thi-thu/reading/{id}) ────────────────────────
      const introUrl = `https://youpass.vn/thi-thu/reading/${id}`;
      await page.goto(introUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(dir, '01-intro.png') });
      await page.screenshot({ path: path.join(dir, '02-intro-full.png'), fullPage: true });
      console.log(`  ✓ intro`);

      // ── 2. Trang làm đề (/practice/reading/{id}) ─────────────────────────
      const examUrl = `https://youpass.vn/practice/reading/${id}`;
      await page.goto(examUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

      // Đợi interactive content mount
      await Promise.race([
        page.waitForSelector('.interactive-question', { timeout: 15000 }),
        page.waitForSelector('input[type="text"]', { timeout: 15000 }),
        page.waitForSelector('select', { timeout: 15000 }),
        page.waitForTimeout(8000),
      ]).catch(() => {});
      await page.waitForTimeout(1500);

      await page.screenshot({ path: path.join(dir, '03-exam.png') });
      await page.screenshot({ path: path.join(dir, '04-exam-full.png'), fullPage: true });
      console.log(`  ✓ exam`);

      // Lưu HTML
      const html = await page.content();
      await fs.writeFile(path.join(dir, 'page.html'), html);

      // ── 3. Crop từng question-set ─────────────────────────────────────────
      // Tìm container của từng question set
      const qsetEls = await page.$$('.interactive-question > div');
      console.log(`  → ${qsetEls.length} qset block(s)`);

      if (qsetEls.length > 0) {
        for (let i = 0; i < qsetEls.length; i++) {
          try {
            const bbox = await qsetEls[i].boundingBox();
            if (!bbox || bbox.height < 10) continue;
            const fname = path.join(dir, 'qsets', `qset-${String(i+1).padStart(2,'0')}-${TYPE}.png`);
            await qsetEls[i].screenshot({ path: fname });
            console.log(`     crop ${i+1}: ${Math.round(bbox.width)}×${Math.round(bbox.height)}`);
          } catch (e) {
            console.log(`     crop ${i+1}: fail (${e.message.slice(0,50)})`);
          }
        }
      } else {
        // fallback: crop toàn bộ interactive area
        const iqEl = await page.$('.interactive-question');
        if (iqEl) {
          await iqEl.screenshot({ path: path.join(dir, 'qsets', `qset-01-${TYPE}.png`) });
          console.log(`     crop fallback: OK`);
        }
      }

      // ── 4. Lưu meta ───────────────────────────────────────────────────────
      await fs.writeJson(metaPath, {
        id, title, type: TYPE, status: 'ok',
        capturedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
        errors: errors.slice(0, 5),
      }, { spaces: 2 });

      results.push({ id, status: 'ok' });
      console.log(`  ✅ Done ${Date.now() - t0}ms`);

    } catch (e) {
      console.error(`  ❌ FAIL: ${e.message}`);
      await fs.writeJson(metaPath, {
        id, title, type: TYPE, status: 'fail',
        capturedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
        error: e.message,
      }, { spaces: 2 });
      results.push({ id, status: 'fail', error: e.message });
    }

    await page.waitForTimeout(1500); // rate limit
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
