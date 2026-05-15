const fs = require('fs-extra');
const path = require('path');
const { loadSession } = require('./login-portal');

const INDEX_DIR = path.join(__dirname, '../data/index');

async function getCookie() {
  const loaded = await loadSession();
  if (!loaded) throw new Error('No session — chay login-portal.js truoc');
  const ss = await fs.readJson(loaded.storageStatePath);
  return {
    cookie: ss.cookies
      .filter(c => c.domain.replace(/^\./, '').endsWith('youpass.vn'))
      .map(c => `${c.name}=${c.value}`).join('; '),
    userAgent: loaded.session.userAgent,
  };
}

async function fetchPage({ cookie, userAgent }, page, pageSize, filter) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('page_size', pageSize);
  for (const [k, v] of Object.entries(filter)) {
    if (Array.isArray(v)) v.forEach(vv => params.append(k, vv));
    else params.set(k, v);
  }
  const url = `https://api.youpass.vn/v1/quizzes?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Cookie: cookie, 'User-Agent': userAgent, Accept: 'application/json', Referer: 'https://youpass.vn/' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  if (j.code !== 0) throw new Error(`API code=${j.code}: ${j.message}`);
  return j.data;
}

async function harvestAll(skill, filter) {
  const auth = await getCookie();
  const PAGE_SIZE = 50;

  console.log(`\n[${skill}] Fetching list...`);
  const first = await fetchPage(auth, 1, PAGE_SIZE, filter);
  const total = first.total;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  console.log(`  Total: ${total} items / ${totalPages} pages`);

  const allItems = [...first.items];

  for (let page = 2; page <= totalPages; page++) {
    process.stdout.write(`  Fetching page ${page}/${totalPages}...`);
    const data = await fetchPage(auth, page, PAGE_SIZE, filter);
    allItems.push(...data.items);
    console.log(` got ${data.items.length} items (total so far: ${allItems.length})`);
    await new Promise(r => setTimeout(r, 500));
  }

  // Dedup by id (multi-value filters can return the same item per value)
  const seen = new Set();
  const dedupItems = [];
  for (const it of allItems) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    dedupItems.push(it);
  }
  console.log(`  Dedup: ${allItems.length} -> ${dedupItems.length}`);

  // Slim items: keep only fields we need for library page
  const slim = dedupItems.map(it => ({
    id: it.id,
    title: it.title,
    type: it.type,
    quiz_type: it.quiz_type,
    time: it.time,
    thumbnail: it.thumbnail,
    quiz_code: it.quiz_code,
    total_submitted: it.total_submitted,
    vote_count: it.vote_count,
    is_submitted: it.is_submitted,
    is_public: it.is_public,
    has_guided_retry: it.has_guided_retry,
    date_updated: it.date_updated,
    tags: (it.tags || []).map(t => ({ id: t.id, code: t.code, title: t.title })),
  }));

  await fs.ensureDir(INDEX_DIR);
  const out = path.join(INDEX_DIR, `${skill}.json`);
  await fs.writeJson(out, { skill, total, fetchedAt: new Date().toISOString(), items: slim }, { spaces: 2 });
  console.log(`  Saved: ${out}`);
  return { total, items: slim };
}

async function main() {
  const skills = [
    {
      name: 'reading',
      filter: {
        types: [1, 9],
        quiz_types: 3,
        status: 'published',
        is_test: 'true',
        isLogin: 'true',
        sort: 'practice_listing_priority.desc,simplified_id.asc',
      },
    },
    // Listening để comment ra cho v1 - Reading-only
    // { name: 'listening', filter: { types: 2, status: 'published', is_test: 'true', isLogin: 'true' } },
  ];

  for (const s of skills) {
    await harvestAll(s.name, s.filter);
  }

  console.log('\nDone.');
}

if (require.main === module) {
  main().catch(e => { console.error('Loi:', e); process.exit(1); });
}

module.exports = { harvestAll, getCookie };
