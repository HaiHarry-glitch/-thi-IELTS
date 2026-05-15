// All-in-one: launch REAL Chrome (channel:'chrome') with persistent profile,
// let user login & navigate manually, sniff all network calls in background,
// save session + vocab calls when user closes browser.
const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const PROFILE_DIR = path.join(__dirname, '../data/sessions/chrome-profile-real');
const SESSION_PATH = path.join(__dirname, '../data/sessions/session.json');
const STORAGE_STATE_PATH = path.join(__dirname, '../data/sessions/storage-state.json');
const VOCAB_DIR = path.join(__dirname, '../data/api/vocab');
const ALL_CALLS = path.join(VOCAB_DIR, 'all-calls.json');
const VOCAB_ONLY = path.join(VOCAB_DIR, 'vocab-only.json');

const START_URL = 'https://e-learning.youpass.vn/practice/listening/10462?type=review&answerId=13445686';

async function main() {
  await fs.ensureDir(PROFILE_DIR);
  await fs.ensureDir(VOCAB_DIR);

  console.log('\n========================================');
  console.log('  Login + Sniff Vocab API (Real Chrome)');
  console.log('========================================\n');
  console.log('HUONG DAN:');
  console.log('  1. Browser Chrome that se mo (KHONG phai Chromium)');
  console.log('  2. Dang nhap YouPass neu chua login');
  console.log('  3. Vao trang review (URL da set san)');
  console.log('  4. Click vao "Tra tu vung" tool (phim T)');
  console.log('  5. Click vao 3-5 tu khac nhau trong transcript');
  console.log('  6. DONG BROWSER => script tu luu network + session\n');
  console.log(`Profile: ${PROFILE_DIR}`);
  console.log(`Start URL: ${START_URL}\n`);

  // Use persistent context with REAL Chrome (channel: 'chrome')
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome', // REAL Google Chrome (must be installed on system)
    headless: false,
    viewport: null,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const calls = [];
  let callIdx = 0;

  // Listen on all pages (current + future tabs)
  const attachListener = (page) => {
    page.on('response', async (response) => {
      try {
        const url = response.url();
        // Skip noise
        if (/google-analytics|googletagmanager|doubleclick|amplitude|sentry|hotjar|datadog|facebook\.com|amazonaws\.com\/events/.test(url)) return;
        if (/\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|css|js|mp3|mp4|m4a)(\?|$)/i.test(url)) return;
        const ct = response.headers()['content-type'] || '';
        if (!ct.includes('json') && !ct.includes('text')) return;
        const text = await response.text().catch(() => '');
        calls.push({
          idx: ++callIdx,
          ts: Date.now(),
          method: response.request().method(),
          url,
          status: response.status(),
          contentType: ct,
          postData: response.request().postData() || null,
          bodyLen: text.length,
          body: text.slice(0, 10000),
        });
        // Live print interesting URLs
        if (/vocab|translate|lookup|dictionary|word/i.test(url)) {
          console.log(`  [VOCAB?] ${response.status()} ${response.request().method()} ${url.slice(0, 100)}`);
        }
      } catch {}
    });
  };

  context.on('page', attachListener);
  const initialPages = context.pages();
  for (const p of initialPages) attachListener(p);

  // Open the target URL
  const page = initialPages[0] || await context.newPage();
  console.log('[*] Opening review page...');
  await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => console.log(' goto warn:', e.message));

  console.log('\n[*] Browser dang mo. Lam theo huong dan ben tren.');
  console.log('[*] Dang theo doi network call (vocab calls se in real-time)...\n');

  // Wait for browser close
  await new Promise(resolve => {
    context.on('close', resolve);
  });

  console.log('\n[*] Browser closed. Saving captures...\n');

  // Save all network calls
  await fs.writeJson(ALL_CALLS, calls, { spaces: 2 });
  console.log(`[OK] All calls: ${calls.length} -> ${ALL_CALLS}`);

  // Filter vocab-related
  const vocabCalls = calls.filter(c =>
    /vocab|translate|lookup|dictionary|\/word|tra[-_]tu/i.test(c.url) ||
    (c.body && /phonetic|ipa|translation_vi|part_of_speech|pronunciation/i.test(c.body))
  );
  await fs.writeJson(VOCAB_ONLY, vocabCalls, { spaces: 2 });
  console.log(`[OK] Vocab calls: ${vocabCalls.length} -> ${VOCAB_ONLY}`);

  // Unique endpoints
  const uniq = new Set();
  for (const c of calls) {
    if (c.url) {
      const u = c.url.split('?')[0].replace(/\/\d+/g, '/{ID}');
      uniq.add(`${c.method} ${u}`);
    }
  }
  console.log('\nUnique endpoints touched:');
  [...uniq].slice(0, 30).forEach(u => console.log(' -', u));
  if (uniq.size > 30) console.log(` ... and ${uniq.size - 30} more`);

  // Save storage state for future sniff runs (cookies from real Chrome profile)
  try {
    await context.storageState({ path: STORAGE_STATE_PATH });
    console.log(`\n[OK] Storage state -> ${STORAGE_STATE_PATH}`);
  } catch (e) {
    console.log('[!] storageState save error:', e.message);
  }

  console.log('\n[DONE]');
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
