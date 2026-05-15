const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const { validateSession, SESSION_PATH } = require('./login-portal');

const DATA_DIR = path.join(__dirname, '../data');

async function createAuthContext(browser, session) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: session.headers['User-Agent'],
    storageState: {
      cookies: session.cookies,
      origins: [],
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  return context;
}

async function discoverExamLinks(page, baseUrl, includePaths = []) {
  const links = new Set();

  async function crawlPage(url, depth = 0) {
    if (depth > 3) return;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500);

      const pageLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.href)
          .filter(href => href && !href.startsWith('javascript:') && !href.startsWith('mailto:'))
      );

      for (const link of pageLinks) {
        if (links.has(link)) continue;
        const isIncluded =
          includePaths.length === 0 ||
          includePaths.some(p => link.includes(p));
        if (isIncluded && link.startsWith(baseUrl)) {
          links.add(link);
        }
      }
    } catch (err) {
      console.log(`  Skip ${url}: ${err.message}`);
    }
  }

  await crawlPage(baseUrl);
  return Array.from(links);
}

async function scrapeExamPage(page, url, examId) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const html = await page.content();
  const title = await page.title();

  // Capture audio URLs
  const audioUrls = await page.evaluate(() =>
    Array.from(document.querySelectorAll('audio source, audio[src]'))
      .map(el => el.src || el.getAttribute('src'))
      .filter(Boolean)
  );

  // Capture image URLs (questions only, skip logos/icons)
  const imageUrls = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .map(el => el.src)
      .filter(src => src && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar'))
  );

  // Screenshot for reference
  const screenshotPath = path.join(DATA_DIR, 'images', examId, 'screenshot.png');
  await fs.ensureDir(path.dirname(screenshotPath));
  await page.screenshot({ path: screenshotPath, fullPage: true });

  return { url, title, html, audioUrls, imageUrls, scrapedAt: new Date().toISOString() };
}

async function downloadFile(url, destPath, headers) {
  const { default: fetch } = await import('node-fetch');
  await fs.ensureDir(path.dirname(destPath));

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

  const buffer = await res.buffer();
  await fs.writeFile(destPath, buffer);
  return destPath;
}

async function runScraper(options = {}) {
  const session = await validateSession();
  if (!session) {
    console.log('Chay "node src/login-portal.js <URL>" truoc.');
    return;
  }

  const { targetUrl, includePaths = [] } = options;
  const baseUrl = targetUrl || session.targetUrl;

  console.log(`\nBat dau scrape: ${baseUrl}`);

  const browser = await chromium.launch({ headless: false });
  const context = await createAuthContext(browser, session);
  const page = await context.newPage();

  console.log('Dang kham pha danh sach de...');
  const examLinks = await discoverExamLinks(page, baseUrl, includePaths);
  console.log(`Tim thay ${examLinks.length} trang`);

  // Save index
  await fs.writeJson(path.join(DATA_DIR, 'library_index.json'), {
    scrapedAt: new Date().toISOString(),
    baseUrl,
    totalExams: examLinks.length,
    links: examLinks,
  }, { spaces: 2 });

  // Scrape each page
  const results = [];
  for (let i = 0; i < examLinks.length; i++) {
    const link = examLinks[i];
    const examId = `exam_${String(i + 1).padStart(3, '0')}`;
    console.log(`[${i + 1}/${examLinks.length}] Scraping: ${link}`);

    try {
      const data = await scrapeExamPage(page, link, examId);

      // Download audio files
      for (let j = 0; j < data.audioUrls.length; j++) {
        const audioUrl = data.audioUrls[j];
        const ext = path.extname(new URL(audioUrl).pathname) || '.mp3';
        const dest = path.join(DATA_DIR, 'audio', examId, `audio_${j + 1}${ext}`);
        try {
          await downloadFile(audioUrl, dest, session.headers);
          console.log(`  Audio saved: ${path.basename(dest)}`);
        } catch (e) {
          console.log(`  Audio skip: ${e.message}`);
        }
      }

      // Save raw exam data (AI parsing happens next step)
      const examPath = path.join(DATA_DIR, 'exams', `${examId}_raw.json`);
      await fs.writeJson(examPath, {
        id: examId,
        ...data,
        html: undefined, // Save HTML separately to keep JSON small
      }, { spaces: 2 });

      await fs.writeFile(
        path.join(DATA_DIR, 'exams', `${examId}_raw.html`),
        data.html
      );

      results.push({ examId, url: link, status: 'ok' });
    } catch (err) {
      console.log(`  FAIL: ${err.message}`);
      results.push({ examId, url: link, status: 'error', error: err.message });
    }

    // Rate limiting: 2-3 second delay
    await page.waitForTimeout(2000 + Math.random() * 1000);
  }

  await browser.close();

  // Save summary
  await fs.writeJson(path.join(DATA_DIR, 'scrape_summary.json'), {
    completedAt: new Date().toISOString(),
    total: results.length,
    success: results.filter(r => r.status === 'ok').length,
    failed: results.filter(r => r.status === 'error').length,
    results,
  }, { spaces: 2 });

  console.log('\nScraping hoan thanh!');
  console.log(`Ket qua: ${results.filter(r => r.status === 'ok').length}/${results.length} thanh cong`);
}

module.exports = { runScraper, scrapeExamPage, downloadFile };

if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  if (args[0]) options.targetUrl = args[0];
  if (args[1]) options.includePaths = args[1].split(',');

  runScraper(options).catch(err => {
    console.error('Loi:', err.message);
    process.exit(1);
  });
}
