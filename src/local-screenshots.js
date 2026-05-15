const { chromium } = require("playwright");
const path = require("path");

const OUT = path.join(__dirname, "../data/screenshots/local");
require("fs").mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const pages = [
    { name: "library", url: "http://localhost:3000/luyen-thi/ielts/reading" },
    { name: "prep", url: "http://localhost:3000/thi-thu/reading/10011" },
    { name: "exam", url: "http://localhost:3000/practice/reading/10011" },
    { name: "result", url: "http://localhost:3000/practice/reading/10011/result" },
  ];

  for (const { name, url } of pages) {
    console.log(`Screenshotting ${name}: ${url}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.screenshot({
      path: path.join(OUT, `${name}.png`),
      fullPage: true,
    });
    console.log(`  saved ${name}.png`);
  }

  await browser.close();
  console.log("Done. Screenshots at:", OUT);
})();
