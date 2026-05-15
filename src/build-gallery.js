/**
 * build-gallery.js — Tạo HTML gallery xem nhanh các đề đã crawl
 */
const fs   = require('fs-extra');
const path = require('path');

const ROOT     = path.join(__dirname, '..');
const SHOTS    = path.join(ROOT, 'data/reading-shots');
const OUT      = path.join(ROOT, 'data/gallery.html');

(async () => {
  const dirs = (await fs.readdir(SHOTS)).filter(d => !d.startsWith('_') && !d.endsWith('.html'));
  const quizzes = [];

  for (const d of dirs) {
    const metaPath = path.join(SHOTS, d, 'meta.json');
    if (!await fs.pathExists(metaPath)) continue;
    const meta = await fs.readJson(metaPath);
    if (meta.status !== 'ok') continue;

    // Tìm tất cả parts + screenshots
    const partsDir = path.join(SHOTS, d, 'parts');
    const parts = [];
    if (await fs.pathExists(partsDir)) {
      const partDirs = (await fs.readdir(partsDir)).sort();
      for (const pd of partDirs) {
        const pdPath = path.join(partsDir, pd);
        const viewport = path.join(pdPath, 'viewport.png');
        const full     = path.join(pdPath, 'full.png');
        const qsetsDir = path.join(pdPath, 'qsets');
        const qsets = [];
        if (await fs.pathExists(qsetsDir)) {
          const qfiles = (await fs.readdir(qsetsDir)).filter(f => f.endsWith('.png')).sort();
          for (const qf of qfiles) {
            qsets.push({ file: qf, abs: path.join(qsetsDir, qf) });
          }
        }
        parts.push({
          name: pd,
          viewport: await fs.pathExists(viewport) ? viewport : null,
          full:     await fs.pathExists(full)     ? full     : null,
          qsets,
        });
      }
    }
    quizzes.push({ ...meta, parts, id: d });
  }

  // Relative path helper (use file:// absolute)
  const img = (p) => p ? `file:///${p.replace(/\\/g, '/')}` : '';

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Reading Shots Gallery</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #f0f2f5; color: #222; }

  .header {
    background: #fff;
    border-bottom: 2px solid #418ec8;
    padding: 16px 24px;
    display: flex; align-items: center; gap: 12px;
    position: sticky; top: 0; z-index: 100;
  }
  .header h1 { font-size: 18px; color: #418ec8; }
  .header .count { background: #418ec8; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 13px; }

  .quiz-card {
    background: #fff;
    border-radius: 8px;
    margin: 16px 24px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    overflow: hidden;
  }
  .quiz-header {
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
    padding: 12px 16px;
    display: flex; align-items: center; gap: 12px;
    cursor: pointer;
  }
  .quiz-id { background: #418ec8; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .quiz-title { font-weight: bold; font-size: 14px; flex: 1; }
  .quiz-types { display: flex; gap: 4px; flex-wrap: wrap; }
  .type-badge {
    font-size: 11px; padding: 2px 6px; border-radius: 3px; font-weight: 500;
    background: #e3f2fd; color: #1565c0;
  }
  .toggle { font-size: 18px; color: #999; }

  .quiz-body { padding: 16px; display: none; }
  .quiz-body.open { display: block; }

  .part-section { margin-bottom: 20px; }
  .part-title { font-size: 13px; font-weight: bold; color: #555; margin-bottom: 10px; border-left: 3px solid #418ec8; padding-left: 8px; }

  .screenshots-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
  .screenshot-block { flex: 1; min-width: 200px; max-width: 500px; }
  .screenshot-block label { display: block; font-size: 11px; color: #888; margin-bottom: 4px; }
  .screenshot-block img { width: 100%; border: 1px solid #ddd; border-radius: 4px; cursor: zoom-in; }

  .qsets-grid { display: flex; gap: 8px; flex-wrap: wrap; }
  .qset-block { width: 300px; }
  .qset-block label { display: block; font-size: 10px; color: #999; margin-bottom: 3px; }
  .qset-block img { width: 100%; border: 1px solid #e0e0e0; border-radius: 3px; cursor: zoom-in; }

  /* Lightbox */
  #lb { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; align-items: center; justify-content: center; }
  #lb.on { display: flex; }
  #lb img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 4px; }
  #lb-close { position: fixed; top: 16px; right: 24px; color: #fff; font-size: 32px; cursor: pointer; }
</style>
</head>
<body>

<div class="header">
  <h1>📸 Reading Shots Gallery</h1>
  <span class="count">${quizzes.length} đề</span>
</div>

${quizzes.map(q => {
  const types = [...new Set(q.types || [])];
  return `
<div class="quiz-card">
  <div class="quiz-header" onclick="toggle(this)">
    <span class="quiz-id">#${q.id}</span>
    <span class="quiz-title">${q.title || '?'}</span>
    <span class="quiz-types">${types.map(t => `<span class="type-badge">${t}</span>`).join('')}</span>
    <span class="toggle">▼</span>
  </div>
  <div class="quiz-body">
    ${(q.parts || []).map(p => `
    <div class="part-section">
      <div class="part-title">${p.name.replace('-', ' ').toUpperCase()}</div>
      <div class="screenshots-row">
        ${p.viewport ? `<div class="screenshot-block"><label>Viewport (1440×900)</label><img src="${img(p.viewport)}" onclick="lb(this.src)"></div>` : ''}
        ${p.full     ? `<div class="screenshot-block"><label>Full page</label><img src="${img(p.full)}" onclick="lb(this.src)"></div>` : ''}
      </div>
      ${p.qsets.length ? `
      <div class="part-title" style="color:#888;border-color:#ccc">Question Sets</div>
      <div class="qsets-grid">
        ${p.qsets.map(qs => `<div class="qset-block"><label>${qs.file.replace('.png','')}</label><img src="${img(qs.abs)}" onclick="lb(this.src)"></div>`).join('')}
      </div>` : ''}
    </div>`).join('')}
  </div>
</div>`;
}).join('')}

<div id="lb" onclick="this.classList.remove('on')">
  <span id="lb-close" onclick="document.getElementById('lb').classList.remove('on')">✕</span>
  <img id="lb-img" src="">
</div>

<script>
function toggle(header) {
  const body = header.nextElementSibling;
  body.classList.toggle('open');
  header.querySelector('.toggle').textContent = body.classList.contains('open') ? '▲' : '▼';
}
function lb(src) {
  document.getElementById('lb-img').src = src;
  document.getElementById('lb').classList.add('on');
  event.stopPropagation();
}
// Mở đề đầu tiên mặc định
document.querySelector('.quiz-header')?.click();
</script>
</body>
</html>`;

  await fs.writeFile(OUT, html);
  console.log(`✅ Gallery: ${OUT}`);
  console.log(`   Mở trong Chrome: file:///${OUT.replace(/\\/g,'/')}`);
})();
