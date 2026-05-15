require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const FirecrawlApp = require('@mendable/firecrawl-js').default;
const fs = require('fs-extra');
const path = require('path');

const STORAGE_STATE_PATH = path.join(__dirname, '../data/sessions/storage-state.json');
const OUTPUT_DIR = path.join(__dirname, '../data/firecrawl');

const SAMPLE_URLS = [
  { name: '1-library',  url: 'https://youpass.vn/luyen-thi/ielts/reading?quiz_type=quiz&status=unfinished' },
  { name: '2-exam',     url: 'https://youpass.vn/thi-thu/reading/10234' },
  { name: '3-result',   url: 'http://e-learning.youpass.vn/practice/reading/10234/result?answerId=13239731' },
  { name: '4-review',   url: 'https://e-learning.youpass.vn/practice/reading/10234?type=review&answerId=13239731' },
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

async function explore() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey || apiKey.includes('your-api-key')) {
    console.error('Thieu FIRECRAWL_API_KEY trong file .env');
    console.error('Tao file .env theo mau .env.example va dien API key tu https://firecrawl.dev');
    process.exit(1);
  }

  if (!await fs.pathExists(STORAGE_STATE_PATH)) {
    console.error('Khong tim thay session. Login truoc qua login-portal.');
    process.exit(1);
  }

  const storageState = await fs.readJson(STORAGE_STATE_PATH);
  console.log(`Loaded session: ${storageState.cookies.length} cookies`);

  const firecrawl = new FirecrawlApp({ apiKey });
  await fs.ensureDir(OUTPUT_DIR);

  for (const sample of SAMPLE_URLS) {
    console.log(`\n[${sample.name}] ${sample.url}`);
    const domain = new URL(sample.url).hostname;
    const cookieHeader = buildCookieHeader(storageState, domain);
    console.log(`  Cookie header length: ${cookieHeader.length} chars (domain: ${domain})`);

    try {
      const result = await firecrawl.scrape(sample.url, {
        formats: ['markdown', 'html', 'links', { type: 'screenshot', fullPage: true }],
        waitFor: 3500,
        timeout: 60000,
        onlyMainContent: false,
        headers: {
          Cookie: cookieHeader,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });

      const dir = path.join(OUTPUT_DIR, sample.name);
      await fs.ensureDir(dir);

      // Firecrawl SDK v4 returns data in result.data
      const data = result.data || result;

      if (data.html)       await fs.writeFile(path.join(dir, 'page.html'), data.html);
      if (data.markdown)   await fs.writeFile(path.join(dir, 'page.md'), data.markdown);
      if (data.links)      await fs.writeJson(path.join(dir, 'links.json'), data.links, { spaces: 2 });
      if (data.screenshot) await fs.writeJson(path.join(dir, 'screenshot-url.json'), { url: data.screenshot }, { spaces: 2 });
      if (data.metadata)   await fs.writeJson(path.join(dir, 'metadata.json'), data.metadata, { spaces: 2 });

      // Detect if we got a login redirect
      const md = (data.markdown || '').toLowerCase();
      const isLoginPage = md.includes('đăng nhập') || md.includes('dang nhap') || md.includes('login') && md.length < 1500;

      console.log(`  OK - md: ${(data.markdown || '').length} chars, html: ${(data.html || '').length} chars, links: ${(data.links || []).length}`);
      if (isLoginPage) console.log('  [!] CANH BAO: Co the bi redirect ve trang login (session khong work)');
    } catch (err) {
      console.error(`  FAIL: ${err.message}`);
      if (err.response) {
        console.error('  Response status:', err.response.status);
        console.error('  Response data:', JSON.stringify(err.response.data || err.response, null, 2).slice(0, 1000));
      }
      if (err.details) console.error('  Details:', JSON.stringify(err.details).slice(0, 800));
      if (err.statusCode) console.error('  Status code:', err.statusCode);
      if (err.body) console.error('  Body:', JSON.stringify(err.body).slice(0, 800));
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\nDone. Output: ${OUTPUT_DIR}`);
}

if (require.main === module) {
  explore().catch(err => {
    console.error('Loi:', err);
    process.exit(1);
  });
}

module.exports = { explore };
