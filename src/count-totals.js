const fs = require('fs-extra');
const path = require('path');
const { loadSession } = require('./login-portal');

async function count(label, url) {
  const loaded = await loadSession();
  const ss = await fs.readJson(loaded.storageStatePath);
  const cookie = ss.cookies
    .filter(c => c.domain.replace(/^\./, '').endsWith('youpass.vn'))
    .map(c => `${c.name}=${c.value}`).join('; ');

  const res = await fetch(url, {
    headers: { Cookie: cookie, 'User-Agent': loaded.session.userAgent, Accept: 'application/json', Referer: 'https://youpass.vn/' },
  });
  const j = await res.json();
  console.log(`${label}: total=${j.data?.total ?? '?'} (HTTP ${res.status})`);
  return j.data?.total ?? 0;
}

(async () => {
  const base = 'https://api.youpass.vn/v1/quizzes?page_size=1&page=1&status=published&is_test=true&isLogin=true';
  // types/quiz_types from the captured library URL: types=1,9; quiz_types=3 for Reading single-passage
  // Listening: usually type=2 or similar. Try a few combos
  console.log('--- Reading ---');
  await count('Reading single-passage (quiz_types=3)', `${base}&types=1&types=9&quiz_types=3`);
  await count('Reading mocktest', `${base}&types=1&types=9&quiz_types=4`);
  console.log('--- Listening ---');
  // Listening URL on site uses ?source=YPBUILDER etc, but base API likely uses different types
  // Try likely values
  await count('Listening (type=2)', `${base}&types=2`);
  await count('Listening (types=1+9 quiz_types=1)', `${base}&types=1&types=9&quiz_types=1`);
  await count('Listening mocktest (quiz_types=2)', `${base}&types=1&types=9&quiz_types=2`);
  await count('All quizzes (no type filter)', base);
})();
