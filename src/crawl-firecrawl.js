/**
 * crawl-firecrawl.js
 * Dùng Firecrawl API (bypass Cloudflare) + cookies auth để chụp từng đề Reading.
 *
 * Usage:
 *   node src/crawl-firecrawl.js --type=GAP_FILLING --sample=3
 *   node src/crawl-firecrawl.js --type=GAP_FILLING --all
 */

const { FirecrawlClient } = require('@mendable/firecrawl-js');
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

if (!TYPE)            { console.error('--type=GAP_FILLING cần thiết'); process.exit(1); }
if (!SAMPLE && !ALL)  { console.error('Cần --sample=N hoặc --all');   process.exit(1); }

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT     = path.join(__dirname, '..');
const IDX      = path.join(ROOT, 'data/reading-type-index.json');
const STORAGE  = path.join(ROOT, 'data/sessions/storage-state.json');
const OUT_BASE = path.join(ROOT, 'data/reading-shots');

const FC_KEY   = 'fc-799fb82d39be4d71bd62f3ab6104fc54';

// ── Build cookie header string từ storage-state ───────────────────────────────
async function buildCookieHeader() {
  const ss = await fs.readJson(STORAGE);
  const now = Date.now() / 1000;
  return ss.cookies
    .filter(c => c.domain.includes('youpass') && (c.expires < 0 || c.expires > now))
    .map(c => `${c.name}=${c.value}`)
    .join('; ');
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const idx = await fs.readJson(IDX);
  const entries = idx.byType[TYPE];
  if (!entries?.length) { console.error(`Type "${TYPE}" không tìm thấy`); process.exit(1); }

  // Deduplicate
  const seen = new Set();
  const quizList = entries.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
  const toProcess = SAMPLE ? quizList.slice(0, SAMPLE) : quizList;

  console.log(`\n[${TYPE}] ${toProcess.length} đề sẽ chụp`);
  toProcess.forEach((q, i) => console.log(`  ${i+1}. id=${q.id} | ${q.title}`));

  const cookieHeader = await buildCookieHeader();
  console.log(`\n[cookies] ${cookieHeader.split(';').length} cookies loaded`);

  const app = new FirecrawlClient({ apiKey: FC_KEY });
  await fs.ensureDir(OUT_BASE);
  const results = [];

  for (let qi = 0; qi < toProcess.length; qi++) {
    const { id, title } = toProcess[qi];
    const dir = path.join(OUT_BASE, String(id));
    await fs.ensureDir(dir);
    await fs.ensureDir(path.join(dir, 'qsets'));

    // Skip nếu đã xong
    const metaPath = path.join(dir, 'meta.json');
    if (await fs.pathExists(metaPath)) {
      const m = await fs.readJson(metaPath);
      if (m.status === 'ok' || m.status === 'ok-fc') {
        console.log(`\n[${qi+1}/${toProcess.length}] SKIP id=${id}`);
        results.push({ id, status: 'skipped' });
        continue;
      }
    }

    console.log(`\n[${qi+1}/${toProcess.length}] id=${id} | ${title}`);
    const t0 = Date.now();

    try {
      // ── Scrape exam page (/practice/reading/{id}) ─────────────────────────
      const examUrl = `https://youpass.vn/practice/reading/${id}`;
      console.log(`  → ${examUrl}`);

      const result = await app.scrape(examUrl, {
        formats: ['screenshot', 'screenshot@fullPage', 'html'],
        headers: { Cookie: cookieHeader },
        waitFor: 4000,
        onlyMainContent: false,
        timeout: 30000,
      });

      if (!result.success) throw new Error(result.error || 'Firecrawl failed');

      // Lưu screenshot viewport
      if (result.screenshot) {
        const imgBuf = Buffer.from(result.screenshot.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        await fs.writeFile(path.join(dir, '03-exam.png'), imgBuf);
        console.log(`  ✓ exam screenshot (${imgBuf.length} bytes)`);
      }

      // Lưu screenshot full page
      if (result['screenshot@fullPage']) {
        const imgBuf = Buffer.from(result['screenshot@fullPage'].replace(/^data:image\/\w+;base64,/, ''), 'base64');
        await fs.writeFile(path.join(dir, '04-exam-full.png'), imgBuf);
        console.log(`  ✓ exam fullpage`);
      }

      // Lưu HTML
      if (result.html) {
        await fs.writeFile(path.join(dir, 'page.html'), result.html);
      }

      // ── Scrape intro page (/thi-thu/reading/{id}) ─────────────────────────
      const introUrl = `https://youpass.vn/thi-thu/reading/${id}`;
      const intro = await app.scrape(introUrl, {
        formats: ['screenshot'],
        headers: { Cookie: cookieHeader },
        waitFor: 2000,
        onlyMainContent: false,
        timeout: 20000,
      });

      if (intro.success && intro.screenshot) {
        const buf = Buffer.from(intro.screenshot.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        await fs.writeFile(path.join(dir, '01-intro.png'), buf);
        console.log(`  ✓ intro screenshot`);
      }

      // ── Lưu meta ──────────────────────────────────────────────────────────
      await fs.writeJson(metaPath, {
        id, title, type: TYPE,
        status: 'ok-fc',
        capturedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
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

    // Rate limit — Firecrawl free tier: 10 req/min → 6s/req để an toàn
    if (qi < toProcess.length - 1) {
      process.stdout.write(`  [ratelimit] 6s...`);
      await new Promise(r => setTimeout(r, 6000));
      process.stdout.write(` go\n`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const ok   = results.filter(r => r.status === 'ok').length;
  const skip = results.filter(r => r.status === 'skipped').length;
  const fail = results.filter(r => r.status === 'fail').length;
  console.log(`\n═══════════════════════════`);
  console.log(`[${TYPE}] ✅ ${ok} ok | ⏭ ${skip} skip | ❌ ${fail} fail`);
  if (fail > 0) console.log('Fail ids:', results.filter(r=>r.status==='fail').map(r=>r.id).join(', '));
})();
