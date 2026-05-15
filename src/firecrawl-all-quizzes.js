// Crawl UI of EVERY quiz from youpass.vn/thi-thu/reading/{id}
// Output per quiz: page.html, page.md, screenshot.png
// Resumable: skips quizzes already crawled.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const FirecrawlApp = require('@mendable/firecrawl-js').default;
const fs = require('fs-extra');
const path = require('path');

const STORAGE_STATE_PATH = path.join(__dirname, '../data/sessions/storage-state.json');
const NORMALIZED_DIR = path.join(__dirname, '../data/normalized');
const OUT = path.join(__dirname, '../data/firecrawl-all');

// Concurrency: keep low to avoid rate limits & be polite
const CONCURRENCY = 2;
// Delay between scrape attempts (ms)
const REQUEST_DELAY_MS = 1500;

function buildCookieHeader(storageState, targetDomain) {
  return storageState.cookies
    .filter(c => {
      const cd = c.domain.replace(/^\./, '');
      return targetDomain === cd || targetDomain.endsWith('.' + cd) || cd.endsWith('.' + targetDomain);
    })
    .map(c => `${c.name}=${c.value}`)
    .join('; ');
}

async function scrapeOne(firecrawl, id, cookieHeader, dir) {
  const url = `https://youpass.vn/thi-thu/reading/${id}`;
  const result = await firecrawl.scrape(url, {
    formats: ['markdown', 'html', { type: 'screenshot', fullPage: true }],
    waitFor: 5000,
    timeout: 90000,
    onlyMainContent: false,
    headers: {
      Cookie: cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  });

  await fs.ensureDir(dir);
  const data = result.data || result;
  if (data.html)     await fs.writeFile(path.join(dir, 'page.html'), data.html);
  if (data.markdown) await fs.writeFile(path.join(dir, 'page.md'), data.markdown);
  if (data.metadata) await fs.writeJson(path.join(dir, 'metadata.json'), data.metadata, { spaces: 2 });

  // Download screenshot directly (so we don't lose access if Firecrawl GCS expires)
  if (data.screenshot) {
    try {
      const res = await fetch(data.screenshot);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        await fs.writeFile(path.join(dir, 'screenshot.png'), buf);
      }
    } catch (e) {
      // ignore screenshot download error
    }
  }

  return {
    md: (data.markdown || '').length,
    html: (data.html || '').length,
    shot: !!data.screenshot,
  };
}

async function main() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) { console.error('Missing FIRECRAWL_API_KEY'); process.exit(1); }
  if (!await fs.pathExists(STORAGE_STATE_PATH)) {
    console.error('No session at', STORAGE_STATE_PATH, '— run login-portal.js first');
    process.exit(1);
  }

  const storageState = await fs.readJson(STORAGE_STATE_PATH);
  const cookieHeader = buildCookieHeader(storageState, 'youpass.vn');
  console.log(`Session: ${storageState.cookies.length} cookies, ${cookieHeader.length} char header`);

  // Build quiz ID list from normalized JSONs
  const files = (await fs.readdir(NORMALIZED_DIR)).filter(f => f.endsWith('.json'));
  const allIds = files.map(f => Number(f.replace('.json', ''))).filter(n => !Number.isNaN(n)).sort((a, b) => a - b);
  console.log(`Total quizzes: ${allIds.length}`);

  await fs.ensureDir(OUT);

  // Determine which IDs still need crawling (resumable)
  const todo = [];
  let alreadyDone = 0;
  for (const id of allIds) {
    const dir = path.join(OUT, String(id));
    const htmlPath = path.join(dir, 'page.html');
    if (await fs.pathExists(htmlPath)) { alreadyDone++; continue; }
    todo.push(id);
  }
  console.log(`Already crawled: ${alreadyDone}, to crawl: ${todo.length}`);

  if (todo.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const firecrawl = new FirecrawlApp({ apiKey });

  // Stats
  let ok = 0, fail = 0;
  const startTs = Date.now();
  const failed = [];

  // Worker pool
  let cursor = 0;
  const total = todo.length;
  async function worker(workerId) {
    while (cursor < total) {
      const myIdx = cursor++;
      const id = todo[myIdx];
      const dir = path.join(OUT, String(id));
      const tNow = ((Date.now() - startTs) / 1000).toFixed(0);
      const eta = ok + fail > 0 ? `eta ~${(((Date.now() - startTs) / (ok + fail)) * (total - ok - fail) / 60000).toFixed(1)}m` : '';
      console.log(`[${ok+fail}/${total} t=${tNow}s ${eta}] [w${workerId}] ${id}`);
      try {
        const r = await scrapeOne(firecrawl, id, cookieHeader, dir);
        ok++;
        console.log(`  OK ${id} md=${r.md} html=${r.html} shot=${r.shot ? 'y' : 'n'}`);
      } catch (err) {
        fail++;
        failed.push({ id, error: err.message });
        console.error(`  FAIL ${id}: ${err.message}`);
        // Save failure log so we can retry later
        await fs.ensureDir(dir);
        await fs.writeJson(path.join(dir, 'error.json'), { id, error: err.message, ts: new Date().toISOString() }, { spaces: 2 });
      }
      await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));

  const elapsed = ((Date.now() - startTs) / 60000).toFixed(1);
  console.log(`\nDone in ${elapsed}m: ${ok} OK, ${fail} fail (of ${total})`);
  if (failed.length) {
    await fs.writeJson(path.join(OUT, '_failed.json'), failed, { spaces: 2 });
    console.log(`Failures logged to ${path.join(OUT, '_failed.json')}`);
  }
}

if (require.main === module) {
  main().catch(err => { console.error('Fatal:', err); process.exit(1); });
}
