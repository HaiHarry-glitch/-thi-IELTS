// Mở Chrome thật tới trang reading review của YouPass để user check UI tham chiếu.
// Sau khi đóng browser, tự ghi đè storage-state.json (refresh session luôn).
const { chromium } = require('playwright');
const path = require('path');

const PROFILE_DIR = path.join(__dirname, '../data/sessions/chrome-profile-real');
const STORAGE_STATE_PATH = path.join(__dirname, '../data/sessions/storage-state.json');

// URL tham chiếu user đã gửi
const URL = 'https://e-learning.youpass.vn/practice/reading/10277?type=review&answerId=13487739';

(async () => {
  console.log('\n=== Open Reading Review (YouPass reference) ===');
  console.log(`URL: ${URL}\n`);
  console.log('Hãy:');
  console.log('  1. Đăng nhập nếu cần');
  console.log('  2. Xem giao diện review reading của YouPass');
  console.log('  3. Click vào từ trong đoạn văn để xem vocab popup');
  console.log('  4. Click nút "Locate" (định vị) bên cạnh đáp án');
  console.log('  5. Đóng cửa sổ Chrome khi xong → session sẽ được lưu lại\n');

  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: null,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => console.log('goto warn:', e.message));

  // Tracking vocab calls cho tham khảo
  page.on('response', async (res) => {
    const u = res.url();
    if (/\/v1\/(vocabs|pronunciation)/.test(u)) {
      console.log(`  [VOCAB] ${res.status()} ${u.slice(0, 120)}`);
    }
  });

  // Save trước khi đóng
  let saved = false;
  async function saveSession() {
    if (saved) return;
    saved = true;
    try {
      await ctx.storageState({ path: STORAGE_STATE_PATH });
      console.log(`\n[OK] Session đã lưu → ${STORAGE_STATE_PATH}`);
    } catch (e) {
      console.log('[!] save error:', e.message);
    }
  }

  // Auto save mỗi 30s phòng khi user quên đóng
  const auto = setInterval(saveSession, 30000);

  await new Promise(r => ctx.on('close', r));
  clearInterval(auto);
  await saveSession();

  console.log('[DONE]');
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
