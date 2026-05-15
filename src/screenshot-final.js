const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const STORAGE_STATE_PATH = path.join(__dirname, '../data/sessions/storage-state.json');
const SESSION_PATH = path.join(__dirname, '../data/sessions/session.json');
const SCREENSHOTS_DIR = path.join(__dirname, '../data/screenshots');

async function fetchAnswerId(auth, quizId) {
  // Lấy danh sách bài đã nộp của user
  const url = `https://api.youpass.vn/v1/answers?quiz_id=${quizId}&page=1&page_size=5`;
  try {
    const res = await fetch(url, {
      headers: {
        Cookie: auth.cookie,
        'User-Agent': auth.userAgent,
        Accept: 'application/json',
        Referer: 'https://youpass.vn/',
      },
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (j.code !== 0 || !j.data?.items?.length) return null;
    return j.data.items[0].id;
  } catch {
    return null;
  }
}

async function main() {
  await fs.ensureDir(SCREENSHOTS_DIR);

  const session = await fs.readJson(SESSION_PATH);
  const ss = await fs.readJson(STORAGE_STATE_PATH);
  const cookie = ss.cookies
    .filter(c => c.domain.replace(/^\./, '').endsWith('youpass.vn'))
    .map(c => `${c.name}=${c.value}`).join('; ');
  const auth = { cookie, userAgent: session.userAgent };

  // Tìm answerId thật
  const quizId = 10234;
  console.log(`Fetching answerId for quiz ${quizId}...`);
  let answerId = await fetchAnswerId(auth, quizId);
  if (!answerId) {
    // Thử quiz khác
    answerId = await fetchAnswerId(auth, 10011);
    console.log(`  Trying quiz 10011: ${answerId}`);
  }
  console.log(`  answerId: ${answerId}`);

  const URLS = [
    {
      name: '1-library',
      url: 'https://youpass.vn/luyen-thi/ielts/reading?quiz_type=quiz',
      waitMs: 5000,
    },
    answerId && {
      name: '4-review',
      url: `https://e-learning.youpass.vn/practice/reading/${quizId}?type=review&answerId=${answerId}`,
      waitMs: 5000,
    },
  ].filter(Boolean);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1440, height: 900 },
    userAgent: session.userAgent,
  });

  for (const { name, url, waitMs } of URLS) {
    console.log(`\n[${name}] ${url}`);
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(waitMs);

      const outPath = path.join(SCREENSHOTS_DIR, `${name}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      const stat = await fs.stat(outPath);
      console.log(`  Saved (${(stat.size/1024).toFixed(0)} KB): ${outPath}`);

      const title = await page.title();
      console.log(`  Page title: ${title}`);
    } catch (e) {
      console.error(`  FAIL: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
