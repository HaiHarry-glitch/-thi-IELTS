/**
 * login-real-chrome.js
 * Mở Chrome THẬT (không phải Chromium-T của Playwright) để đăng nhập.
 * Chạy: node src/login-real-chrome.js
 */
const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const STORAGE_PATH = path.join(__dirname, '../data/sessions/storage-state.json');
const TRIGGER     = path.join(__dirname, '../data/sessions/SAVE_NOW');

// Chrome thật (KHÔNG phải Chromium-T)
const CHROME_EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Profile tạm riêng để không đụng vào profile chính (tránh Chrome khóa profile)
const PROFILE_DIR = path.join(__dirname, '../data/sessions/chrome-profile');

(async () => {
  console.log('═══════════════════════════════════════════');
  console.log('  LOGIN — Chrome THẬT (không phải Chromium-T)');
  console.log('═══════════════════════════════════════════\n');
  console.log('Chrome exe:', CHROME_EXE);
  console.log('Profile:   ', PROFILE_DIR, '\n');

  await fs.ensureDir(PROFILE_DIR);
  await fs.remove(TRIGGER).catch(() => {});
  await fs.ensureDir(path.dirname(STORAGE_PATH));

  // launchPersistentContext với executablePath trỏ vào Chrome thật
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: CHROME_EXE,
    headless: false,
    viewport: null,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('https://youpass.vn/luyen-thi/ielts/reading?quiz_type=quiz&status=unfinished', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  console.log('✅ Chrome đã mở. HƯỚNG DẪN:');
  console.log('   1. Đăng nhập vào youpass.vn');
  console.log('   2. Browse thử vài trang đề (mở 1-2 đề reading bất kỳ)');
  console.log('   3. Để lưu session: TẠO FILE trống ở:');
  console.log(`        ${TRIGGER}`);
  console.log('      hoặc ĐÓNG CHROME hoàn toàn\n');
  console.log('   Đang chờ trigger save...\n');

  // Save khi user tạo file trigger
  const saveAndExit = async (reason) => {
    console.log(`\n[${reason}] Lưu session...`);
    try {
      await ctx.storageState({ path: STORAGE_PATH });
      const ss = await fs.readJson(STORAGE_PATH);
      const cf  = ss.cookies.find(c => c.name === 'cf_clearance');
      const auth = ss.cookies.find(c => c.name === 'auth_token');
      console.log(`✅ Đã lưu ${ss.cookies.length} cookies`);
      console.log(`   auth_token:   ${auth ? '✅' : '❌ MISSING'}`);
      console.log(`   cf_clearance: ${cf ? '✅' : '⚠ MISSING — Cloudflare có thể chặn'}`);
      console.log(`   File: ${STORAGE_PATH}`);
    } catch (e) {
      console.error('❌ Save fail:', e.message);
    }
    await ctx.close().catch(() => {});
    await fs.remove(TRIGGER).catch(() => {});
    process.exit(0);
  };

  // Poll trigger file
  const poll = setInterval(async () => {
    if (await fs.pathExists(TRIGGER)) {
      clearInterval(poll);
      await saveAndExit('trigger');
    }
  }, 500);

  // Hoặc đóng browser
  ctx.on('close', async () => {
    clearInterval(poll);
    await saveAndExit('browser-closed');
  });
})();
