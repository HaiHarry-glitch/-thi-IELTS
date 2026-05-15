const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

async function main() {
  const STORAGE_STATE_PATH = path.join(__dirname, '../data/sessions/storage-state.json');
  const SESSION_PATH = path.join(__dirname, '../data/sessions/session.json');
  const SCREENSHOTS_DIR = path.join(__dirname, '../data/screenshots');
  const session = await fs.readJson(SESSION_PATH);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1440, height: 1080 },
    userAgent: session.userAgent,
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  await page.goto('https://youpass.vn/luyen-thi/ielts/reading?quiz_type=quiz', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(6000);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '1-library-top.png'),
    clip: { x: 0, y: 0, width: 1440, height: 1080 },
  });
  console.log('Library top saved');
  await page.close();

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
