const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const { loadSession } = require('./login-portal');

const OUTPUT_DIR = path.join(__dirname, '../data/api');

const TARGETS = [
  { name: 'library', url: 'https://youpass.vn/luyen-thi/ielts/reading?quiz_type=quiz&status=unfinished', wait: 5000 },
  { name: 'exam',    url: 'https://youpass.vn/thi-thu/reading/10234', wait: 6000 },
  { name: 'result',  url: 'http://e-learning.youpass.vn/practice/reading/10234/result?answerId=13239731', wait: 5000 },
  { name: 'review',  url: 'https://e-learning.youpass.vn/practice/reading/10234?type=review&answerId=13239731', wait: 6000 },
];

async function sniff() {
  const loaded = await loadSession();
  if (!loaded) { console.error('No session'); process.exit(1); }

  await fs.ensureDir(OUTPUT_DIR);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: loaded.storageStatePath,
    userAgent: loaded.session.userAgent,
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();

  for (const target of TARGETS) {
    console.log(`\n[${target.name}] ${target.url}`);
    const calls = [];

    const handler = async (response) => {
      try {
        const url = response.url();
        const ct = response.headers()['content-type'] || '';
        if (!ct.includes('json')) return;
        if (url.includes('google') || url.includes('analytics') || url.includes('facebook')) return;

        let body = '';
        try {
          body = await response.text();
        } catch {}

        calls.push({
          method: response.request().method(),
          url,
          status: response.status(),
          contentType: ct,
          bodyLen: body.length,
          bodyPreview: body.slice(0, 5000),
        });
      } catch {}
    };

    page.on('response', handler);

    try {
      await page.goto(target.url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(target.wait);
    } catch (e) {
      console.log(`  Nav warn: ${e.message}`);
    }

    page.off('response', handler);

    // Save full bodies for top API calls
    const dir = path.join(OUTPUT_DIR, target.name);
    await fs.ensureDir(dir);
    await fs.writeJson(path.join(dir, 'all-calls.json'), calls, { spaces: 2 });

    // Save full bodies separately for likely-data calls
    const dataCalls = calls.filter(c =>
      c.bodyLen > 200 &&
      !c.url.includes('translate') &&
      !c.url.includes('font') &&
      c.status === 200
    );

    for (let i = 0; i < dataCalls.length; i++) {
      const fullCall = dataCalls[i];
      const safeName = String(i + 1).padStart(2, '0') + '_' +
        new URL(fullCall.url).pathname.replace(/[^a-z0-9]/gi, '_').slice(0, 80);
      try {
        const parsed = JSON.parse(fullCall.bodyPreview);
        await fs.writeJson(path.join(dir, `${safeName}.json`),
          { url: fullCall.url, status: fullCall.status, body: parsed },
          { spaces: 2 });
      } catch {
        await fs.writeFile(path.join(dir, `${safeName}.txt`),
          `URL: ${fullCall.url}\nStatus: ${fullCall.status}\n\n${fullCall.bodyPreview}`);
      }
    }

    console.log(`  Captured ${calls.length} JSON calls (${dataCalls.length} data)`);
  }

  await browser.close();
  console.log(`\nDone. Output: ${OUTPUT_DIR}`);
}

sniff().catch(e => { console.error(e); process.exit(1); });
