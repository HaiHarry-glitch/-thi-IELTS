/**
 * login-fresh.js
 * Mở Chrome headed để user đăng nhập thủ công → lưu cookies + cf_clearance
 * Chạy: node src/login-fresh.js
 */
const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const STORAGE_PATH = path.join(__dirname, '../data/sessions/storage-state.json');

(async () => {
  console.log('═══════════════════════════════════════════');
  console.log('  YOUPASS LOGIN — Mở Chrome để đăng nhập');
  console.log('═══════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const ctx = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await ctx.newPage();
  await page.goto('https://youpass.vn/luyen-thi/ielts/reading', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  console.log('✅ Chrome đã mở tại: https://youpass.vn/luyen-thi/ielts/reading\n');
  console.log('HƯỚNG DẪN:');
  console.log('  1. Đăng nhập vào tài khoản youpass.vn');
  console.log('  2. Browse thử vài trang đề reading (để Cloudflare nhận diện)');
  console.log('  3. Khi thấy danh sách đề hiện ra → nhấn ENTER ở đây để lưu session\n');

  // Wait for user to press Enter
  process.stdout.write('Nhấn ENTER khi đã đăng nhập xong...');
  await new Promise(resolve => {
    process.stdin.resume();
    process.stdin.once('data', resolve);
  });

  // Save session
  await fs.ensureDir(path.dirname(STORAGE_PATH));
  await ctx.storageState({ path: STORAGE_PATH });

  // Verify
  const ss = await fs.readJson(STORAGE_PATH);
  const cfCookie = ss.cookies.find(c => c.name === 'cf_clearance');
  const authCookie = ss.cookies.find(c => c.name === 'auth_token');

  console.log('\n═══════════════ KẾT QUẢ ═══════════════');
  console.log(`auth_token:    ${authCookie ? '✅ OK (expires ' + new Date(authCookie.expires * 1000).toLocaleDateString() + ')' : '❌ MISSING'}`);
  console.log(`cf_clearance:  ${cfCookie   ? '✅ OK (Cloudflare bypass saved)' : '⚠  Không có (thử browse thêm rồi chạy lại)'}`);
  console.log(`Total cookies: ${ss.cookies.length}`);
  console.log(`Saved to:      ${STORAGE_PATH}`);
  console.log('═══════════════════════════════════════');

  await browser.close();
  console.log('\nXong! Chạy crawl tiếp theo ngay bây giờ.');
  process.exit(0);
})();
