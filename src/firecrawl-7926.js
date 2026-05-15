require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const FirecrawlApp = require('@mendable/firecrawl-js').default;
const fs = require('fs-extra');
const path = require('path');

const STORAGE_STATE_PATH = path.join(__dirname, '../data/sessions/storage-state.json');
const OUTPUT_DIR = path.join(__dirname, '../data/firecrawl-7926');

const URLS = [
  { name: '1-library',  url: 'https://youpass.vn/luyen-thi/ielts/reading?quiz_type=quiz&status=unfinished' },
  { name: '2-prep',     url: 'https://youpass.vn/thi-thu/reading/7926' },
  { name: '3-result',   url: 'https://e-learning.youpass.vn/practice/reading/7926/result?answerId=13245539' },
  { name: '4-review',   url: 'https://e-learning.youpass.vn/practice/reading/7926?type=review&answerId=13245539' },
];

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
  const storageState = await fs.readJson(STORAGE_STATE_PATH);
  console.log(`Loaded ${storageState.cookies.length} cookies`);

  const firecrawl = new FirecrawlApp({ apiKey });
  await fs.ensureDir(OUTPUT_DIR);

  for (const s of URLS) {
    console.log(`\n[${s.name}] ${s.url}`);
    const domain = new URL(s.url).hostname;
    const cookieHeader = buildCookieHeader(storageState, domain);
    console.log(`  cookies: ${cookieHeader.length} chars (${domain})`);

    try {
      const result = await firecrawl.scrape(s.url, {
        formats: ['markdown', 'html', { type: 'screenshot', fullPage: true }],
        waitFor: 4000,
        timeout: 90000,
        onlyMainContent: false,
        headers: {
          Cookie: cookieHeader,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });

      const dir = path.join(OUTPUT_DIR, s.name);
      await fs.ensureDir(dir);
      const data = result.data || result;
      if (data.html)       await fs.writeFile(path.join(dir, 'page.html'), data.html);
      if (data.markdown)   await fs.writeFile(path.join(dir, 'page.md'), data.markdown);
      if (data.screenshot) await fs.writeJson(path.join(dir, 'screenshot-url.json'), { url: data.screenshot }, { spaces: 2 });
      if (data.metadata)   await fs.writeJson(path.join(dir, 'metadata.json'), data.metadata, { spaces: 2 });
      console.log(`  OK md=${(data.markdown||'').length} html=${(data.html||'').length} shot=${data.screenshot ? 'yes' : 'no'}`);
    } catch (err) {
      console.error(`  FAIL: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`\nDone -> ${OUTPUT_DIR}`);
})();
