// Phase 2: crawl the minimal set of sample quizzes from youpass.vn
// using existing session cookies. Output: HTML, markdown, screenshot URL.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const FirecrawlApp = require('@mendable/firecrawl-js').default;
const fs = require('fs-extra');
const path = require('path');

const STORAGE_STATE_PATH = path.join(__dirname, '../data/sessions/storage-state.json');
const SAMPLES_FILE = path.join(__dirname, '../data/sample-quizzes.json');
const OUT = path.join(__dirname, '../data/firecrawl-samples');

function buildCookieHeader(storageState, targetDomain) {
  return storageState.cookies
    .filter(c => {
      const cd = c.domain.replace(/^\./, '');
      return targetDomain === cd || targetDomain.endsWith('.' + cd) || cd.endsWith('.' + targetDomain);
    })
    .map(c => `${c.name}=${c.value}`)
    .join('; ');
}

(async () => {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) { console.error('Missing FIRECRAWL_API_KEY'); process.exit(1); }

  const samples = (await fs.readJson(SAMPLES_FILE)).picked;
  const storageState = await fs.readJson(STORAGE_STATE_PATH);
  console.log(`Loaded ${storageState.cookies.length} cookies, ${samples.length} sample quizzes`);

  const firecrawl = new FirecrawlApp({ apiKey });
  await fs.ensureDir(OUT);

  for (const s of samples) {
    const tag = `${s.id}-${s.types[0].toLowerCase()}`;
    console.log(`\n[${tag}] ${s.title.slice(0, 50)}`);
    console.log(`  ${s.url}`);
    console.log(`  types: ${s.types.join(', ')}`);

    const domain = new URL(s.url).hostname;
    const cookieHeader = buildCookieHeader(storageState, domain);

    try {
      const result = await firecrawl.scrape(s.url, {
        formats: ['markdown', 'html', { type: 'screenshot', fullPage: true }],
        waitFor: 5000,
        timeout: 90000,
        onlyMainContent: false,
        headers: {
          Cookie: cookieHeader,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });

      const dir = path.join(OUT, tag);
      await fs.ensureDir(dir);
      const data = result.data || result;
      if (data.html)       await fs.writeFile(path.join(dir, 'page.html'), data.html);
      if (data.markdown)   await fs.writeFile(path.join(dir, 'page.md'), data.markdown);
      if (data.screenshot) await fs.writeJson(path.join(dir, 'screenshot-url.json'), { url: data.screenshot }, { spaces: 2 });
      if (data.metadata)   await fs.writeJson(path.join(dir, 'metadata.json'), data.metadata, { spaces: 2 });
      await fs.writeJson(path.join(dir, 'sample-info.json'), s, { spaces: 2 });

      console.log(`  OK md=${(data.markdown||'').length} html=${(data.html||'').length} shot=${data.screenshot ? 'yes' : 'no'}`);
    } catch (err) {
      console.error(`  FAIL: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\nDone -> ${OUT}`);

  // download screenshots
  console.log('\nDownloading screenshots...');
  const dirs = (await fs.readdir(OUT)).filter(d => fs.statSync(path.join(OUT, d)).isDirectory());
  for (const d of dirs) {
    const urlFile = path.join(OUT, d, 'screenshot-url.json');
    if (!await fs.pathExists(urlFile)) continue;
    const { url } = await fs.readJson(urlFile);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(path.join(OUT, d, 'screenshot.png'), buf);
      console.log(`  ${d}/screenshot.png (${(buf.length/1024).toFixed(0)} KB)`);
    } catch (e) { console.error(`  ${d} FAIL: ${e.message}`); }
  }
})();
