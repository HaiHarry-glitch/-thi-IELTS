const fs = require('fs-extra');
const path = require('path');

(async () => {
  const NORM = path.join(__dirname, '../data/normalized-listening');
  const PORTAL = path.join(__dirname, '../data/portal-crawl-listening');

  const workingIds = new Set();
  for (const d of await fs.readdir(PORTAL)) {
    if (await fs.pathExists(path.join(PORTAL, d, 'screenshot.png'))) workingIds.add(Number(d));
  }

  const idx = await fs.readJson(path.join(NORM, '_index.json'));
  const typeToWorkingIds = {};

  for (const summary of idx) {
    if (!workingIds.has(summary.id)) continue;
    if (!summary.hasAudio || summary.questions === 0) continue;
    const q = await fs.readJson(path.join(NORM, `${summary.id}.json`));
    for (const p of q.parts) {
      for (const qs of p.questionSets) {
        if (!typeToWorkingIds[qs.type]) typeToWorkingIds[qs.type] = [];
        typeToWorkingIds[qs.type].push(q.id);
      }
    }
  }

  for (const [t, ids] of Object.entries(typeToWorkingIds)) {
    console.log(`${t.padEnd(28)} -> ${ids.length} quizzes; first 3: ${ids.slice(0,3).join(', ')}`);
  }
})();
