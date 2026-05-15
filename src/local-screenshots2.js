const { chromium } = require("playwright");
const path = require("path");

const OUT = path.join(__dirname, "../data/screenshots/local");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Inject some saved answers so result page shows non-zero score
  await page.goto("http://localhost:3000/practice/reading/10011", { waitUntil: "networkidle" });
  // The quiz has id 10011 — let's set a few answers in localStorage
  await page.evaluate(() => {
    const answers = {
      // We'll just put something in — exact question IDs don't matter for this screenshot
    };
    localStorage.setItem("yp_answers_10011", JSON.stringify(answers));
  });

  // Review mode (exam page with type=review)
  console.log("Screenshotting review mode...");
  await page.goto("http://localhost:3000/practice/reading/10011?type=review", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT, "review.png"), fullPage: true });
  console.log("  saved review.png");

  // Exam page scrolled to questions area
  console.log("Screenshotting exam (questions area)...");
  await page.goto("http://localhost:3000/practice/reading/10011", { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollBy(0, 1200));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "exam-questions.png") });
  console.log("  saved exam-questions.png");

  await browser.close();
  console.log("Done.");
})();
