const fs = require('fs-extra');
const path = require('path');

const FIRECRAWL_DIR = path.join(__dirname, '../data/firecrawl');
const SCREENSHOTS_DIR = path.join(__dirname, '../data/screenshots');

async function main() {
  await fs.ensureDir(SCREENSHOTS_DIR);

  const pages = ['1-library', '2-exam', '3-result', '4-review'];

  for (const page of pages) {
    const urlFile = path.join(FIRECRAWL_DIR, page, 'screenshot-url.json');
    if (!await fs.pathExists(urlFile)) {
      console.log(`[${page}] No screenshot URL found`);
      continue;
    }

    const { url } = await fs.readJson(urlFile);
    console.log(`[${page}] Downloading...`);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const outPath = path.join(SCREENSHOTS_DIR, `${page}.png`);
      await fs.writeFile(outPath, buf);
      console.log(`  Saved: ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.error(`  FAIL: ${e.message}`);
    }
  }

  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
