const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../data/sessions/session.json');
const STORAGE_STATE_PATH = path.join(__dirname, '../data/sessions/storage-state.json');

const TARGET_DOMAINS = ['youpass.vn', 'e-learning.youpass.vn'];

async function captureSession(targetUrl = 'https://youpass.vn/luyen-thi/ielts/reading?quiz_type=quiz&status=unfinished') {
  console.log('\n========================================');
  console.log('  YouPass Clone - Login Portal');
  console.log('========================================\n');
  console.log(`Mo browser tai: ${targetUrl}\n`);
  console.log('HUONG DAN:');
  console.log('  1. Dang nhap vao tai khoan youpass.vn');
  console.log('  2. (Tuy chon) Mo thu vai trang de de browser luu cookie 2 domain');
  console.log('  3. DONG BROWSER khi xong -> session se duoc luu tu dong\n');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const context = await browser.newContext({
    viewport: null,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();

  // Track origins user visits to capture localStorage from each
  const visitedOrigins = new Set();
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      try {
        const origin = new URL(frame.url()).origin;
        visitedOrigins.add(origin);
      } catch {}
    }
  });

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  await fs.ensureDir(path.dirname(STORAGE_STATE_PATH));

  const TRIGGER = path.join(__dirname, '../data/sessions/SAVE_NOW');
  await fs.remove(TRIGGER).catch(() => {});

  console.log('[*] Cua so Chrome da mo. Dang nhap thoai mai, browser KHONG bi flicker.');
  console.log(`[*] Khi login xong, tao file de luu session:`);
  console.log(`    ${TRIGGER}`);
  console.log('    (hoac dong browser, hoac Ctrl+C)\n');

  const saveStorage = async () => {
    try {
      await context.storageState({ path: STORAGE_STATE_PATH });
      const ss = await fs.readJson(STORAGE_STATE_PATH);
      console.log(`[OK] Saved - ${ss.cookies.length} cookies, ${ss.origins?.length || 0} origins`);
    } catch (err) {
      console.log(`[!] Save error: ${err.message}`);
    }
  };

  let resolveClose;
  const closePromise = new Promise(r => { resolveClose = r; });
  let done = false;
  const shutdown = async (reason) => {
    if (done) return;
    done = true;
    console.log(`\n[*] Trigger: ${reason}`);
    await saveStorage();
    resolveClose();
  };

  // Watch for trigger file
  const watcher = setInterval(async () => {
    if (await fs.pathExists(TRIGGER)) {
      await fs.remove(TRIGGER).catch(() => {});
      clearInterval(watcher);
      shutdown('trigger file');
    }
  }, 1000);

  process.on('SIGINT', () => { clearInterval(watcher); shutdown('SIGINT'); });
  context.on('close', () => { clearInterval(watcher); shutdown('context close'); });
  browser.on('disconnected', () => { clearInterval(watcher); shutdown('browser close'); });

  await closePromise;

  // Build readable session.json from storage-state.json
  if (await fs.pathExists(STORAGE_STATE_PATH)) {
    const storageState = await fs.readJson(STORAGE_STATE_PATH);

    const cookiesByDomain = {};
    for (const cookie of storageState.cookies) {
      const domain = cookie.domain.replace(/^\./, '');
      if (!cookiesByDomain[domain]) cookiesByDomain[domain] = [];
      cookiesByDomain[domain].push(cookie);
    }

    // Build cookie headers for each target domain
    const cookieHeaders = {};
    for (const domain of TARGET_DOMAINS) {
      const matching = storageState.cookies.filter(c => {
        const cd = c.domain.replace(/^\./, '');
        return domain === cd || domain.endsWith('.' + cd) || cd.endsWith('.' + domain);
      });
      cookieHeaders[domain] = matching.map(c => `${c.name}=${c.value}`).join('; ');
    }

    // Find auth token across all origins' localStorage
    let authToken = null;
    for (const origin of storageState.origins || []) {
      for (const item of origin.localStorage || []) {
        if (/token|jwt|auth|access/i.test(item.name) && item.value && item.value.length > 20) {
          authToken = { origin: origin.origin, key: item.name, value: item.value };
          break;
        }
      }
      if (authToken) break;
    }

    const session = {
      capturedAt: new Date().toISOString(),
      targetUrl,
      targetDomains: TARGET_DOMAINS,
      visitedOrigins: Array.from(visitedOrigins),
      totalCookies: storageState.cookies.length,
      cookiesByDomain: Object.fromEntries(
        Object.entries(cookiesByDomain).map(([d, c]) => [d, c.length])
      ),
      cookieHeaders,
      authToken,
      storageStatePath: STORAGE_STATE_PATH,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    };

    await fs.writeJson(SESSION_PATH, session, { spaces: 2 });

    console.log('\n========================================');
    console.log('  SESSION DA LUU!');
    console.log(`  - Tong cookies: ${session.totalCookies}`);
    Object.entries(session.cookiesByDomain).forEach(([d, n]) =>
      console.log(`    ${d}: ${n} cookies`)
    );
    console.log(`  - Origins ghi tham: ${visitedOrigins.size}`);
    console.log(`  - Auth token: ${authToken ? `TIM THAY (${authToken.key} @ ${authToken.origin})` : 'Khong (dung Cookie)'}`);
    console.log(`  - File: ${SESSION_PATH}`);
    console.log(`  - Storage state: ${STORAGE_STATE_PATH}`);
    console.log('========================================\n');

    return session;
  }

  console.log('[!] Khong luu duoc session');
  return null;
}

async function loadSession() {
  if (!await fs.pathExists(SESSION_PATH) || !await fs.pathExists(STORAGE_STATE_PATH)) {
    return null;
  }
  return {
    session: await fs.readJson(SESSION_PATH),
    storageStatePath: STORAGE_STATE_PATH,
  };
}

module.exports = { captureSession, loadSession, SESSION_PATH, STORAGE_STATE_PATH };

if (require.main === module) {
  const targetUrl = process.argv[2];
  captureSession(targetUrl).catch(err => {
    console.error('Loi:', err.message);
    process.exit(1);
  });
}
