const { chromium } = require('playwright');
const path = require('path');

const CHROME_EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE    = path.join(__dirname, '../data/sessions/chrome-profile');

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CHROME_EXE,
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--disable-blink-features=AutomationControlled', '--no-first-run', '--no-default-browser-check', '--window-position=-2000,-2000'],
    ignoreDefaultArgs: ['--enable-automation'],
  });
  const page = await ctx.newPage();

  console.log('[1] Vào trang library...');
  const r = await page.goto('https://youpass.vn/luyen-thi/ielts/reading', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(4000);
  console.log('   status:', r?.status());
  console.log('   url:   ', page.url());
  console.log('   title: ', await page.title());
  await page.screenshot({ path: 'data/test-session-library.png' });

  console.log('\n[2] Test API /users/me...');
  const api = await page.request.get('https://api.youpass.vn/v1/users/me');
  console.log('   status:', api.status());
  if (api.ok()) console.log('   body:', (await api.text()).slice(0, 200));

  console.log('\n[3] Vào trang practice 1 đề thử...');
  const r2 = await page.goto('https://youpass.vn/practice/reading/7279', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(4000);
  console.log('   status:', r2?.status());
  console.log('   url:   ', page.url());
  console.log('   title: ', await page.title());
  await page.screenshot({ path: 'data/test-session-practice.png' });

  await ctx.close();
  console.log('\nScreenshots: data/test-session-library.png + data/test-session-practice.png');
})();
