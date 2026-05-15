const fs = require('fs-extra');
const path = require('path');
const { getCookie } = require('./harvest-list');

const INDEX_PATH = path.join(__dirname, '../data/index/reading.json');
const EXAMS_DIR = path.join(__dirname, '../data/exams');
const IMAGES_DIR = path.join(__dirname, '../data/images');
const PROGRESS_PATH = path.join(__dirname, '../data/harvest-progress.json');

const CONCURRENCY = 3;       // 3 song song
const DELAY_MS = 600;        // delay giữa các batch
const RETRY = 3;

async function fetchJson(url, auth, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: {
        Cookie: auth.cookie,
        'User-Agent': auth.userAgent,
        Accept: 'application/json',
        Referer: 'https://youpass.vn/',
      },
    });
    if (res.status === 401) throw new Error('UNAUTHORIZED — session het han, can relogin');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (attempt < RETRY) {
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return fetchJson(url, auth, attempt + 1);
    }
    throw e;
  }
}

async function fetchBuffer(url, auth, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: {
        Cookie: auth.cookie,
        'User-Agent': auth.userAgent,
        Referer: 'https://youpass.vn/',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    if (attempt < RETRY) {
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return fetchBuffer(url, auth, attempt + 1);
    }
    throw e;
  }
}

async function harvestOne(item, auth) {
  const id = item.id;
  const examPath = path.join(EXAMS_DIR, `${id}.json`);
  const thumbPath = path.join(IMAGES_DIR, `${id}.jpg`);

  const tasks = [];

  if (!await fs.pathExists(examPath)) {
    const url = `https://api.youpass.vn/v1/quizzes/${id}?included_vocabs=true`;
    const data = await fetchJson(url, auth);
    if (data.code !== 0) throw new Error(`Quiz ${id}: code=${data.code} msg=${data.message}`);
    await fs.writeJson(examPath, data.data, { spaces: 0 });
  }

  if (item.thumbnail && !await fs.pathExists(thumbPath)) {
    try {
      const tUrl = `https://cms.youpass.vn/assets/${item.thumbnail}?width=500&fit=cover`;
      const buf = await fetchBuffer(tUrl, auth);
      await fs.writeFile(thumbPath, buf);
    } catch (e) {
      // Thumbnail không critical
    }
  }
}

async function loadProgress() {
  if (await fs.pathExists(PROGRESS_PATH)) return await fs.readJson(PROGRESS_PATH);
  return { done: [], failed: [] };
}

async function saveProgress(p) {
  await fs.writeJson(PROGRESS_PATH, p, { spaces: 2 });
}

async function main() {
  const idx = await fs.readJson(INDEX_PATH);
  await fs.ensureDir(EXAMS_DIR);
  await fs.ensureDir(IMAGES_DIR);

  const auth = await getCookie();
  console.log(`[harvest-quiz] ${idx.items.length} items | concurrency=${CONCURRENCY} delay=${DELAY_MS}ms`);

  const progress = await loadProgress();
  const doneSet = new Set(progress.done);

  let completed = doneSet.size;
  const total = idx.items.length;
  const failed = [];
  const startTime = Date.now();

  // Process in batches of CONCURRENCY
  for (let i = 0; i < idx.items.length; i += CONCURRENCY) {
    const batch = idx.items.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async item => {
      if (doneSet.has(item.id)) return;
      try {
        await harvestOne(item, auth);
        doneSet.add(item.id);
        completed++;
      } catch (e) {
        failed.push({ id: item.id, error: e.message });
        console.log(`\n  [FAIL] ${item.id}: ${e.message}`);
        if (e.message.includes('UNAUTHORIZED')) {
          console.error('Session expired — re-login va chay lai!');
          process.exit(2);
        }
      }
    }));

    // Progress + ETA
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = completed / elapsed;
    const remaining = total - completed;
    const eta = remaining / Math.max(rate, 0.1);
    process.stdout.write(`\r  [${completed}/${total}] ${(100 * completed / total).toFixed(1)}% | ${rate.toFixed(1)}/s | ETA ${Math.round(eta)}s | failed=${failed.length}    `);

    // Save progress every 20 items
    if (i % 20 === 0) {
      await saveProgress({ done: Array.from(doneSet), failed });
    }

    if (DELAY_MS) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  await saveProgress({ done: Array.from(doneSet), failed });
  console.log(`\n\nDone. Success: ${doneSet.size}/${total}, failed: ${failed.length}`);
  if (failed.length) {
    console.log('Failed IDs:', failed.slice(0, 10).map(f => f.id).join(', '), failed.length > 10 ? '...' : '');
  }
}

if (require.main === module) {
  main().catch(e => { console.error('\nFATAL:', e); process.exit(1); });
}
