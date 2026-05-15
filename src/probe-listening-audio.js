const fs = require('fs-extra');
const path = require('path');
const { loadSession } = require('./login-portal');

(async () => {
  const loaded = await loadSession();
  const ss = await fs.readJson(loaded.storageStatePath);
  const cookie = ss.cookies.filter(c => c.domain.replace(/^\./,'').endsWith('youpass.vn')).map(c => `${c.name}=${c.value}`).join('; ');
  const headers = { Cookie: cookie, 'User-Agent': loaded.session.userAgent, Accept: 'application/json', Referer: 'https://youpass.vn/' };

  // Probe a few type=10 quizzes
  for (const id of [10501, 7450, 8428, 10262]) {
    const r = await fetch(`https://api.youpass.vn/v1/quizzes/${id}?included_vocabs=false`, { headers });
    const j = await r.json();
    if (j.code !== 0) { console.log(`${id} ERR`); continue; }
    const q = j.data;
    console.log(`\n=== ${id}: ${q.title.slice(0, 50)} ===`);
    console.log(`  type: ${q.type}, listening: ${q.listening}`);
    if (q.parts) {
      for (let i = 0; i < q.parts.length; i++) {
        const p = q.parts[i];
        console.log(`  Part ${i}: file_id="${p.file_id}", listen_from=${p.listen_from}, listen_to=${p.listen_to}`);
        // Look for any other audio-ish fields
        for (const k of Object.keys(p)) {
          if (/file|audio|listen|media/i.test(k) && p[k] && k !== 'file_id' && k !== 'listen_from' && k !== 'listen_to') {
            console.log(`    ${k} = ${typeof p[k] === 'object' ? JSON.stringify(p[k]).slice(0, 60) : p[k]}`);
          }
        }
      }
    }
  }
})();
