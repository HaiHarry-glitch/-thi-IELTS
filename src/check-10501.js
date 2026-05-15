const fs = require('fs-extra');
const path = require('path');
const { loadSession } = require('./login-portal');

(async () => {
  const loaded = await loadSession();
  const ss = await fs.readJson(loaded.storageStatePath);
  const cookie = ss.cookies.filter(c => c.domain.replace(/^\./,'').endsWith('youpass.vn')).map(c => `${c.name}=${c.value}`).join('; ');

  // Fetch quiz 10501 metadata directly
  const r = await fetch('https://api.youpass.vn/v1/quizzes/10501?included_vocabs=false', {
    headers: { Cookie: cookie, 'User-Agent': loaded.session.userAgent, Accept: 'application/json', Referer: 'https://youpass.vn/' },
  });
  const j = await r.json();
  if (j.code !== 0) { console.log('ERROR:', j); return; }
  const q = j.data;
  console.log('id:', q.id);
  console.log('title:', q.title);
  console.log('type:', q.type);
  console.log('quiz_type:', q.quiz_type);
  console.log('status:', q.status);
  console.log('is_test:', q.is_test);
  console.log('is_public:', q.is_public);
  console.log('listening:', q.listening);
  console.log('parts:', q.parts?.length);
  console.log('total_submitted:', q.total_submitted);
  console.log('tags:', (q.tags || []).map(t => t.code).join(', '));
})();
