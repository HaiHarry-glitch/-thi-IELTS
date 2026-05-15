// Mở persistent context (đã login từ login-and-sniff-vocab.js)
// → dump storage state ngay → đóng. Headless để không phiền.
const { chromium } = require('playwright');
const path = require('path');

const PROFILE_DIR = path.join(__dirname, '../data/sessions/chrome-profile-real');
const STORAGE_STATE_PATH = path.join(__dirname, '../data/sessions/storage-state.json');

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: true,
  });
  // Mở 1 page để context "warm up"
  const page = await ctx.newPage();
  await page.goto('https://e-learning.youpass.vn/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await ctx.storageState({ path: STORAGE_STATE_PATH });
  const state = require(STORAGE_STATE_PATH);
  const youpassCookies = state.cookies.filter(c => /youpass\.vn$/.test(c.domain || ''));
  const authToken = youpassCookies.find(c => c.name === 'auth_token');
  console.log(`[OK] Saved ${state.cookies.length} cookies → ${STORAGE_STATE_PATH}`);
  console.log(`  YouPass cookies: ${youpassCookies.length}`);
  console.log(`  auth_token: ${authToken ? authToken.value.slice(0, 30) + '...' : 'MISSING'}`);
  await ctx.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
