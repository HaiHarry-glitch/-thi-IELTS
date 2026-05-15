const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const CHROME_EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE    = path.join(__dirname, '../data/sessions/chrome-profile');

const ID   = process.argv[2] || '10011';
const PORT = process.argv[3] || '3001';

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CHROME_EXE,
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--disable-blink-features=AutomationControlled','--no-first-run','--no-default-browser-check','--window-position=-2000,-2000','--window-size=1440,900'],
    ignoreDefaultArgs: ['--enable-automation'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/thi-thu/reading/${ID}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `data/clone-${ID}.png` });
  await page.screenshot({ path: `data/clone-${ID}-full.png`, fullPage: true });
  console.log(`Saved: data/clone-${ID}.png`);
  await ctx.close();
})();
