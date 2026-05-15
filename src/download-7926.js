const fs = require('fs-extra');
const path = require('path');

const SRC = path.join(__dirname, '../data/firecrawl-7926');
const OUT = path.join(__dirname, '../data/screenshots/7926');

(async () => {
  await fs.ensureDir(OUT);
  const pages = ['1-library', '2-prep', '3-result', '4-review'];
  for (const p of pages) {
    const urlFile = path.join(SRC, p, 'screenshot-url.json');
    if (!await fs.pathExists(urlFile)) { console.log(`[${p}] no url`); continue; }
    const { url } = await fs.readJson(urlFile);
    console.log(`[${p}] downloading...`);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const outPath = path.join(OUT, `${p}.png`);
      await fs.writeFile(outPath, buf);
      console.log(`  saved ${outPath} (${(buf.length/1024).toFixed(0)} KB)`);
    } catch (e) { console.error(`  FAIL: ${e.message}`); }
  }
})();
