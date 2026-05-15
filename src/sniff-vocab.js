// Sniff vocab lookup API calls from YouPass review page.
// Strategy: open review page → activate "Tra từ vựng" → click a word → log all network calls.
const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const { loadSession } = require('./login-portal');

const OUTPUT_DIR = path.join(__dirname, '../data/api/vocab');
const TARGET_URL = 'https://e-learning.youpass.vn/practice/listening/10462?type=review&answerId=13445686';
const TEST_WORDS = ['relatively', 'research', 'telescope', 'invention', 'discovered', 'concave', 'glass', 'lecture'];

async function main() {
  const loaded = await loadSession();
  if (!loaded) { console.error('No session — run `node src/login-portal.js` first'); process.exit(1); }

  await fs.ensureDir(OUTPUT_DIR);
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  });
  const context = await browser.newContext({
    storageState: loaded.storageStatePath,
    userAgent: loaded.session?.userAgent,
    viewport: { width: 1400, height: 900 },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();

  const calls = [];
  page.on('response', async (response) => {
    try {
      const url = response.url();
      if (/google|amplitude|sentry|facebook|datadog|hotjar|amazonaws/.test(url)) return;
      const ct = response.headers()['content-type'] || '';
      if (!ct.includes('json') && !ct.includes('text')) return;
      const text = await response.text().catch(() => '');
      calls.push({
        ts: Date.now(),
        method: response.request().method(),
        url,
        status: response.status(),
        contentType: ct,
        postData: response.request().postData() || null,
        bodyLen: text.length,
        body: text.slice(0, 8000),
      });
    } catch {}
  });

  console.log('[1/4] Opening review page...');
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.log('Goto warn:', e.message));
  await page.waitForTimeout(4000);

  console.log('[2/4] Looking for "Tra từ vựng" button...');
  const vocabBtnSelectors = [
    'button:has-text("Tra từ vựng")',
    'button:has-text("Tra từ")',
    '[title*="Tra từ"]',
    '[aria-label*="Tra từ"]',
    'div:has-text("Tra từ vựng")',
  ];
  let activated = false;
  for (const sel of vocabBtnSelectors) {
    try {
      const btn = await page.$(sel);
      if (btn) {
        console.log(' Found:', sel);
        await btn.click();
        activated = true;
        break;
      }
    } catch {}
  }
  if (!activated) {
    console.log(' Button not found by selector, trying keyboard shortcut "t"...');
    await page.keyboard.press('t');
  }
  await page.waitForTimeout(2000);

  console.log('[3/4] Clicking test words in transcript...');
  for (const word of TEST_WORDS) {
    try {
      calls.push({ MARKER: `--- START_${word} ---`, ts: Date.now() });
      const handle = await page.$(`text=/\\b${word}\\b/i`);
      if (!handle) {
        console.log(`  · "${word}" not in transcript — skip`);
        calls.push({ MARKER: `--- SKIP_${word} (not found) ---`, ts: Date.now() });
        continue;
      }
      console.log(`  · clicking "${word}"...`);
      await handle.click({ force: true }).catch(e => console.log('   click err:', e.message));
      await page.waitForTimeout(3500);
      calls.push({ MARKER: `--- END_${word} ---`, ts: Date.now() });
    } catch (e) {
      console.log(`  · error on "${word}":`, e.message);
    }
  }

  await page.waitForTimeout(2000);

  await fs.writeJson(path.join(OUTPUT_DIR, 'all-calls.json'), calls, { spaces: 2 });
  console.log(`\n[4/4] Saved ${calls.length} entries → ${OUTPUT_DIR}/all-calls.json`);

  const vocabCalls = calls.filter(c => c.url && /vocab|translate|lookup|dictionary|word|tra[-_]/i.test(c.url));
  await fs.writeJson(path.join(OUTPUT_DIR, 'vocab-only.json'), vocabCalls, { spaces: 2 });
  console.log(`     Filtered ${vocabCalls.length} vocab-ish calls → vocab-only.json`);

  // Print summary
  const uniqUrls = new Set();
  for (const c of calls) {
    if (c.url) uniqUrls.add(c.url.split('?')[0].replace(/\/\d+/g, '/{ID}'));
  }
  console.log('\nUnique endpoints touched:');
  [...uniqUrls].forEach(u => console.log(' -', u));

  await browser.close();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
