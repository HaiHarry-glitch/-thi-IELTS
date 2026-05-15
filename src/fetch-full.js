const fs = require('fs-extra');
const path = require('path');
const { loadSession } = require('./login-portal');

const OUTPUT_DIR = path.join(__dirname, '../data/api-full');

const URLS = [
  'https://api.youpass.vn/v1/quizzes?page_size=20&page=1&types=1&types=9&status=published&is_test=true&quiz_types=3&isLogin=true&sort=practice_listing_priority.desc,simplified_id.asc&submitted_status=2',
  'https://api.youpass.vn/v1/quizzes/10234?included_vocabs=true',
  'https://api.youpass.vn/v1/answers/13239731',
  'https://reading-pro.youpass.vn/api/passages/lookup?quizId=10234',
];

async function main() {
  const loaded = await loadSession();
  const ss = await fs.readJson(loaded.storageStatePath);

  const cookieFor = (host) => ss.cookies
    .filter(c => {
      const cd = c.domain.replace(/^\./, '');
      return host === cd || host.endsWith('.' + cd) || cd.endsWith('.' + host);
    })
    .map(c => `${c.name}=${c.value}`).join('; ');

  await fs.ensureDir(OUTPUT_DIR);

  for (const url of URLS) {
    const host = new URL(url).hostname;
    const cookie = cookieFor(host);
    console.log(`\n[${host}] cookie: ${cookie.length} chars`);
    console.log(`  GET ${url}`);

    try {
      const res = await fetch(url, {
        headers: {
          Cookie: cookie,
          'User-Agent': loaded.session.userAgent,
          Accept: 'application/json',
          Referer: 'https://youpass.vn/',
        },
      });
      const text = await res.text();
      const safeName = url.replace(/[^a-z0-9]/gi, '_').slice(0, 100) + '.json';
      await fs.writeFile(path.join(OUTPUT_DIR, safeName), text);
      console.log(`  ${res.status} - ${text.length} chars saved`);
    } catch (e) {
      console.log(`  FAIL: ${e.message}`);
    }
  }
}

main();
