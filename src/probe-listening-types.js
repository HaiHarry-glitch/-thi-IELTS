const fs = require('fs-extra');
const path = require('path');
const { loadSession } = require('./login-portal');

(async () => {
  const loaded = await loadSession();
  const ss = await fs.readJson(loaded.storageStatePath);
  const cookie = ss.cookies.filter(c => c.domain.replace(/^\./,'').endsWith('youpass.vn')).map(c => `${c.name}=${c.value}`).join('; ');
  const headers = { Cookie: cookie, 'User-Agent': loaded.session.userAgent, Accept: 'application/json', Referer: 'https://youpass.vn/' };

  // Try different types to see which return listening
  const types = [2, 10, 11];
  for (const t of types) {
    const url = `https://api.youpass.vn/v1/quizzes?page=1&page_size=5&types=${t}&quiz_types=3&status=published&is_test=true&isLogin=true`;
    const r = await fetch(url, { headers });
    const j = await r.json();
    if (j.code !== 0) { console.log(`type=${t}: ERROR`, j); continue; }
    console.log(`type=${t}: total=${j.data.total}`);
    for (const it of j.data.items.slice(0, 3)) {
      console.log(`  ${it.id}: type=${it.type} quiz_type=${it.quiz_type} title="${it.title.slice(0,40)}"`);
    }
  }

  // Also try with skill=listening directly if supported
  console.log('\n=== with skill=listening ===');
  const r2 = await fetch('https://api.youpass.vn/v1/quizzes?page=1&page_size=5&skill=listening&status=published&is_test=true&isLogin=true', { headers });
  const j2 = await r2.json();
  if (j2.code === 0) {
    console.log(`skill=listening: total=${j2.data.total}`);
    for (const it of j2.data.items.slice(0, 3)) {
      console.log(`  ${it.id}: type=${it.type}`);
    }
  } else console.log('skill=listening:', j2);
})();
