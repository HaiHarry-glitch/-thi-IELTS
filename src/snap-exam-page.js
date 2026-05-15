/**
 * snap-exam-page.js — chụp trang làm đề (không phải review)
 */
const { chromium } = require('playwright');
const fs   = require('fs-extra');
const path = require('path');

const CHROME_EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE    = path.join(__dirname, '../data/sessions/chrome-profile');
const ID         = process.argv[2] || '7279';

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CHROME_EXE,
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-position=-2000,-2000',
      '--window-size=1440,900',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();

  // 1. Trang giới thiệu đề (thi-thu)
  console.log('\n--- thi-thu page ---');
  await page.goto(`https://youpass.vn/thi-thu/reading/${ID}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());
  console.log('Title:', await page.title());
  await page.screenshot({ path: `data/snap-${ID}-1-thi-thu.png` });
  await page.screenshot({ path: `data/snap-${ID}-1-thi-thu-full.png`, fullPage: true });

  // 2. Tìm nút "Bắt đầu" / "Làm bài" để vào đề thật
  const btns = await page.$$eval('button, a', els =>
    els.map(e => ({ text: e.innerText?.trim().slice(0, 30), tag: e.tagName, href: e.href }))
       .filter(e => e.text)
  );
  console.log('Buttons/links on page:');
  btns.slice(0, 20).forEach(b => console.log(' ', b.tag, JSON.stringify(b.text), b.href || ''));

  // 3. Trang practice trực tiếp
  console.log('\n--- practice page ---');
  await page.goto(`https://youpass.vn/practice/reading/${ID}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  console.log('URL:', page.url());
  console.log('Title:', await page.title());
  await page.screenshot({ path: `data/snap-${ID}-2-practice.png` });
  await page.screenshot({ path: `data/snap-${ID}-2-practice-full.png`, fullPage: true });

  // 4. Thử e-learning domain trực tiếp
  console.log('\n--- e-learning domain ---');
  await page.goto(`https://e-learning.youpass.vn/practice/reading/${ID}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  console.log('URL:', page.url());
  await page.screenshot({ path: `data/snap-${ID}-3-elearning.png` });
  await page.screenshot({ path: `data/snap-${ID}-3-elearning-full.png`, fullPage: true });

  await ctx.close();
  console.log('\nSaved: data/snap-*');
})();
