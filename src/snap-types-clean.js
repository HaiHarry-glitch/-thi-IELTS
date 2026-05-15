// Re-snap original portal pages with the audio gate overlay HIDDEN via CSS injection,
// so we can see the question rendering clearly.
const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const STORAGE = path.join(__dirname, '../data/sessions/storage-state.json');
const OUT = path.join(__dirname, '../data/portal-by-type');

(async () => {
  const samples = await fs.readJson(path.join(OUT, '_samples.json'));

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: STORAGE,
    viewport: { width: 1440, height: 900 },
  });

  // Inject CSS into every page that hides the dark audio gate overlay
  // (the gate is a fullscreen flex container with text "click Play")
  await ctx.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Hide audio gate overlay so questions are visible */
      .fixed[class*="bg-black"], .absolute[class*="bg-black"] {
        opacity: 0.05 !important;
        pointer-events: none !important;
      }
      div:has(> button:not([class*="border"]):where([class*="rounded"][class*="bg-"])) {
        /* try not to break legitimate buttons */
      }
    `;
    document.head.appendChild(style);
  });

  const page = await ctx.newPage();

  for (const [type, info] of Object.entries(samples)) {
    const dir = path.join(OUT, `${type}-${info.id}`);
    await fs.ensureDir(dir);
    const url = `https://youpass.vn/thi-thu/listening/${info.id}`;
    console.log(`\n[${type}] ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3500);

      // Try to dismiss the gate by removing it from DOM (works for many SPA layouts)
      await page.evaluate(() => {
        // Find and remove any element that contains the headphones SVG + Play button text combo
        for (const el of Array.from(document.querySelectorAll('*'))) {
          const t = el.textContent || '';
          if (/click\s+Play|To\s+continue/i.test(t) && el.querySelector('svg') && el.children.length < 30 && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
            // Try to find the topmost overlay ancestor
            let target = el;
            for (let i = 0; i < 6; i++) {
              const p = target.parentElement;
              if (!p) break;
              const cls = p.className || '';
              if (typeof cls === 'string' && (cls.includes('fixed') || cls.includes('absolute'))) {
                target = p;
              }
            }
            target.style.display = 'none';
            break;
          }
        }
      });
      await page.waitForTimeout(500);

      await page.screenshot({ path: path.join(dir, 'no-gate.png'), fullPage: false });
      await page.screenshot({ path: path.join(dir, 'no-gate-full.png'), fullPage: true });
      console.log(`  saved ${dir}`);
    } catch (e) { console.error(`  FAIL: ${e.message}`); }
  }

  await browser.close();
  console.log('\nDone.');
})();
