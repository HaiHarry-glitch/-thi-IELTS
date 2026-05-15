// Download audio for every harvested listening quiz.
// Reads UUID from each exam JSON's `listening` field.
const fs = require('fs-extra');
const path = require('path');
const { getCookie } = require('./harvest-list');

const EXAMS_DIR = path.join(__dirname, '../data/listening-exams');
const AUDIO_DIR = path.join(__dirname, '../data/listening-audio');

async function fetchBuffer(url, auth, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: { Cookie: auth.cookie, 'User-Agent': auth.userAgent, Referer: 'https://youpass.vn/' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return fetchBuffer(url, auth, attempt + 1);
    }
    throw e;
  }
}

(async () => {
  await fs.ensureDir(AUDIO_DIR);
  const auth = await getCookie();
  const files = (await fs.readdir(EXAMS_DIR)).filter(f => f.endsWith('.json'));
  console.log(`${files.length} listening quizzes`);

  let ok = 0, skip = 0, fail = 0, missing = 0;
  const startTs = Date.now();

  // Process in batches of 4 concurrent
  const CONC = 4;
  let cursor = 0;

  async function worker() {
    while (cursor < files.length) {
      const i = cursor++;
      const f = files[i];
      const id = parseInt(f.replace('.json', ''));
      const audioPath = path.join(AUDIO_DIR, `${id}.mp3`);

      if (await fs.pathExists(audioPath)) { skip++; continue; }

      const exam = await fs.readJson(path.join(EXAMS_DIR, f));
      const audioId = exam.listening;
      if (!audioId) { missing++; continue; }

      try {
        const url = `https://cms.youpass.vn/assets/${audioId}`;
        const buf = await fetchBuffer(url, auth);
        await fs.writeFile(audioPath, buf);
        ok++;
        const elapsed = ((Date.now() - startTs) / 1000).toFixed(0);
        const total = ok + fail + skip + missing;
        process.stdout.write(`\r  [${total}/${files.length}] OK=${ok} fail=${fail} skip=${skip} missing=${missing} t=${elapsed}s    `);
      } catch (e) {
        fail++;
        console.log(`\n  [FAIL] ${id}: ${e.message}`);
        if (e.message.includes('401')) {
          console.error('Session expired'); process.exit(2);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONC }, () => worker()));
  console.log(`\n\nDone. OK=${ok}, skip=${skip}, missing=${missing}, fail=${fail}`);
})().catch(e => { console.error(e); process.exit(1); });
