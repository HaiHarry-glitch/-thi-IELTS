// Fetch full quiz JSON + audio files for every Listening quiz.
// Usage:
//   node src/harvest-listening-quiz.js
//   node src/harvest-listening-quiz.js --ids=1579 --force
//
// Differences vs harvest-quiz.js (reading):
//  - Reads from data/index/listening.json
//  - Saves quiz JSON to data/listening-exams/{id}.json
//  - Downloads audio files referenced by part.file_id to data/listening-audio/{id}-{partIdx}.mp3
const fs = require('fs-extra');
const path = require('path');
const { getCookie } = require('./harvest-list');

const INDEX_PATH = path.join(__dirname, '../data/index/listening.json');
const EXAMS_DIR = path.join(__dirname, '../data/listening-exams');
const AUDIO_DIR = path.join(__dirname, '../data/listening-audio');
const IMAGES_DIR = path.join(__dirname, '../data/images-listening');
const PROGRESS_PATH = path.join(__dirname, '../data/listening-harvest-progress.json');

const CONCURRENCY = 2;       // lower because of audio downloads
const DELAY_MS = 800;
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

// Resolve the audio download URL. The CMS exposes assets at /assets/<id>
// (no extension required — the response Content-Type drives the format).
function audioUrl(fileId) {
  return `https://cms.youpass.vn/assets/${fileId}`;
}

function parseArgs(argv = process.argv.slice(2)) {
  const opts = { ids: null, force: false };
  for (const arg of argv) {
    if (arg === '--force') opts.force = true;
    else if (arg.startsWith('--ids=')) {
      opts.ids = arg
        .slice('--ids='.length)
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter(Boolean);
    }
  }
  return opts;
}

async function harvestOne(item, auth, options = {}) {
  const id = item.id;
  const examPath = path.join(EXAMS_DIR, `${id}.json`);
  const thumbPath = path.join(IMAGES_DIR, `${id}.jpg`);

  // 1) Quiz JSON
  if (options.force || !await fs.pathExists(examPath)) {
    const url = `https://api.youpass.vn/v1/quizzes/${id}?included_vocabs=true`;
    const data = await fetchJson(url, auth);
    if (data.code !== 0) throw new Error(`Quiz ${id}: code=${data.code} msg=${data.message}`);
    await fs.writeJson(examPath, data.data, { spaces: 0 });
  }

  // 2) Audio file(s)
  //    - type=2 (older): single audio at quiz.listening
  //    - type=10 (newer): audio per part at part.file_id
  const exam = await fs.readJson(examPath);
  const quizAudio = exam.listening;
  if (quizAudio) {
    const audioPath = path.join(AUDIO_DIR, `${id}.mp3`);
    if (!await fs.pathExists(audioPath)) {
      try {
        const buf = await fetchBuffer(audioUrl(quizAudio), auth);
        await fs.writeFile(audioPath, buf);
      } catch (e) { console.log(`\n  [audio fail] ${id}: ${e.message}`); }
    }
  } else if (Array.isArray(exam.parts)) {
    for (let pIdx = 0; pIdx < exam.parts.length; pIdx++) {
      const fileId = exam.parts[pIdx].file_id;
      if (!fileId) continue;
      const audioPath = path.join(AUDIO_DIR, `${id}-${pIdx}.mp3`);
      if (await fs.pathExists(audioPath)) continue;
      try {
        const buf = await fetchBuffer(audioUrl(fileId), auth);
        await fs.writeFile(audioPath, buf);
      } catch (e) { console.log(`\n  [audio fail] ${id}-p${pIdx}: ${e.message}`); }
    }
  }

  // 3) Thumbnail (best effort)
  if (item.thumbnail && !await fs.pathExists(thumbPath)) {
    try {
      const tUrl = `https://cms.youpass.vn/assets/${item.thumbnail}?width=500&fit=cover`;
      const buf = await fetchBuffer(tUrl, auth);
      await fs.writeFile(thumbPath, buf);
    } catch {}
  }
}

async function loadProgress() {
  if (await fs.pathExists(PROGRESS_PATH)) return await fs.readJson(PROGRESS_PATH);
  return { done: [], failed: [] };
}

async function saveProgress(p) {
  await fs.writeJson(PROGRESS_PATH, p, { spaces: 2 });
}

async function main(options = parseArgs()) {
  if (!await fs.pathExists(INDEX_PATH)) {
    console.error('Missing', INDEX_PATH, '— run harvest-listening-list.js first');
    process.exit(1);
  }
  const idx = await fs.readJson(INDEX_PATH);
  await fs.ensureDir(EXAMS_DIR);
  await fs.ensureDir(AUDIO_DIR);
  await fs.ensureDir(IMAGES_DIR);

  const auth = await getCookie();
  const selectedItems = options.ids
    ? idx.items.filter((item) => options.ids.includes(item.id))
    : idx.items;

  if (options.ids) {
    const foundIds = new Set(selectedItems.map((item) => item.id));
    const missing = options.ids.filter((id) => !foundIds.has(id));
    if (missing.length) throw new Error(`IDs not found in listening index: ${missing.join(', ')}`);
  }

  console.log(`[harvest-listening-quiz] ${selectedItems.length} items | concurrency=${CONCURRENCY} delay=${DELAY_MS}ms | force=${options.force}`);

  const progress = await loadProgress();
  const doneSet = options.ids ? new Set() : new Set(progress.done);
  let completed = doneSet.size;
  const total = selectedItems.length;
  const failed = [];
  const startTime = Date.now();

  for (let i = 0; i < selectedItems.length; i += CONCURRENCY) {
    const batch = selectedItems.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async item => {
      if (doneSet.has(item.id)) return;
      try {
        await harvestOne(item, auth, options);
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

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = completed / Math.max(elapsed, 0.001);
    const remaining = total - completed;
    const eta = remaining / Math.max(rate, 0.1);
    process.stdout.write(`\r  [${completed}/${total}] ${(100 * completed / total).toFixed(1)}% | ${rate.toFixed(1)}/s | ETA ${Math.round(eta)}s | failed=${failed.length}    `);

    if (!options.ids && i % 20 === 0) await saveProgress({ done: Array.from(doneSet), failed });
    if (DELAY_MS) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  if (!options.ids) await saveProgress({ done: Array.from(doneSet), failed });
  console.log(`\n\nDone. Success: ${doneSet.size}/${total}, failed: ${failed.length}`);
}

if (require.main === module) {
  main().catch(e => { console.error('\nFATAL:', e); process.exit(1); });
}

module.exports = { main, harvestOne };
