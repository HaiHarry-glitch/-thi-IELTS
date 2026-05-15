const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const { loadSession } = require('./login-portal');

const EXPLORE_DIR = path.join(__dirname, '../data/explore');

const SAMPLE_URLS = [
  {
    name: 'library',
    url: 'https://youpass.vn/luyen-thi/ielts/reading?quiz_type=quiz&status=unfinished',
    description: 'Trang thu vien danh sach de',
  },
  {
    name: 'exam',
    url: 'https://youpass.vn/thi-thu/reading/10234',
    description: 'Trang lam de thi',
  },
  {
    name: 'result',
    url: 'http://e-learning.youpass.vn/practice/reading/10234/result?answerId=13239731',
    description: 'Trang ket qua + diem',
  },
  {
    name: 'review',
    url: 'https://e-learning.youpass.vn/practice/reading/10234?type=review&answerId=13239731',
    description: 'Trang giai thich dap an',
  },
];

async function explore() {
  const loaded = await loadSession();
  if (!loaded) {
    console.log('Chua co session. Chay "node src/login-portal.js" truoc.');
    process.exit(1);
  }

  await fs.ensureDir(EXPLORE_DIR);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: loaded.storageStatePath,
    viewport: { width: 1366, height: 900 },
    userAgent: loaded.session.userAgent,
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();

  // Capture network requests
  const networkLog = [];
  page.on('response', async res => {
    try {
      const url = res.url();
      const ct = res.headers()['content-type'] || '';
      const status = res.status();
      networkLog.push({ url, status, contentType: ct, method: res.request().method() });
    } catch {}
  });

  const summary = [];

  for (const sample of SAMPLE_URLS) {
    console.log(`\n[${sample.name}] ${sample.url}`);
    const dir = path.join(EXPLORE_DIR, sample.name);
    await fs.ensureDir(dir);

    const beforeNetwork = networkLog.length;

    try {
      await page.goto(sample.url, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(3000);

      // Save HTML
      const html = await page.content();
      await fs.writeFile(path.join(dir, 'page.html'), html);

      // Save title + URL
      const title = await page.title();
      const finalUrl = page.url();

      // Screenshot
      await page.screenshot({ path: path.join(dir, 'screenshot.png'), fullPage: true });

      // Extract structured info
      const info = await page.evaluate(() => {
        const audios = Array.from(document.querySelectorAll('audio, audio source')).map(a => ({
          tag: a.tagName,
          src: a.src || a.getAttribute('src'),
        }));
        const images = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt,
          width: img.naturalWidth,
        })).filter(i => i.width > 100);
        const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
          .map(h => ({ tag: h.tagName, text: h.textContent.trim().slice(0, 200) }));
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          method: f.method,
          inputCount: f.querySelectorAll('input,select,textarea').length,
        }));
        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ href: a.href, text: a.textContent.trim().slice(0, 80) }))
          .filter(l => l.href && !l.href.startsWith('javascript:'))
          .slice(0, 50);
        const inputs = Array.from(document.querySelectorAll('input[type="radio"],input[type="checkbox"],input[type="text"],textarea,select')).map(i => ({
          type: i.type || i.tagName,
          name: i.name,
          id: i.id,
          className: typeof i.className === 'string' ? i.className.slice(0, 100) : '',
        }));
        return {
          title: document.title,
          url: location.href,
          audios,
          imageCount: images.length,
          imageSamples: images.slice(0, 5),
          headings: headings.slice(0, 10),
          forms,
          inputCount: inputs.length,
          inputSamples: inputs.slice(0, 20),
          linkSamples: links.slice(0, 30),
          bodyTextPreview: document.body.innerText.slice(0, 1500),
        };
      });

      const pageNetwork = networkLog.slice(beforeNetwork);
      const apiCalls = pageNetwork.filter(r =>
        r.contentType.includes('json') ||
        r.url.includes('/api/') ||
        r.url.includes('/graphql')
      );

      const result = {
        ...sample,
        finalUrl,
        title,
        info,
        apiCalls: apiCalls.slice(0, 30),
        totalRequests: pageNetwork.length,
      };

      await fs.writeJson(path.join(dir, 'analysis.json'), result, { spaces: 2 });
      summary.push({ name: sample.name, status: 'ok', title, apiCalls: apiCalls.length });
      console.log(`  OK - ${apiCalls.length} API calls captured`);
    } catch (err) {
      console.log(`  FAIL: ${err.message}`);
      summary.push({ name: sample.name, status: 'error', error: err.message });
    }
  }

  await fs.writeJson(path.join(EXPLORE_DIR, 'summary.json'), summary, { spaces: 2 });
  await fs.writeJson(path.join(EXPLORE_DIR, 'all-network.json'),
    networkLog.filter(r => r.contentType.includes('json') || r.url.includes('/api/')),
    { spaces: 2 });

  console.log('\n========================================');
  console.log('  EXPLORE DONE');
  console.log(`  Output: ${EXPLORE_DIR}`);
  console.log('========================================');

  await browser.close();
}

if (require.main === module) {
  explore().catch(err => {
    console.error('Loi:', err.message);
    process.exit(1);
  });
}

module.exports = { explore };
