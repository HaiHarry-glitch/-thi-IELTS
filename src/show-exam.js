const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Wait for server
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      await page.goto('http://localhost:3000/thi-thu/reading/7298', { timeout: 5000, waitUntil: 'networkidle' });
      ready = true;
      break;
    } catch (e) {
      console.log(`Waiting for server... (${i+1}/30)`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!ready) {
    console.error('Server did not start');
    process.exit(1);
  }

  console.log('Server OK, page loaded');
  await page.waitForTimeout(2000);

  const file = path.join(__dirname, '../data/screenshots/local/exam-current.png');
  await page.screenshot({ path: file, fullPage: true });
  console.log('Screenshot saved:', file);

  await browser.close();
})();
