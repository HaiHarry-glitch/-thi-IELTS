# PLAN — Capture Vocab API từ YouPass thật

> **Mục tiêu:** Bắt API endpoint YouPass dùng cho chức năng "Tra từ vựng" → dùng làm proxy trong project mình
> **Cách:** Playwright tự động hóa: mở review page → click "Tra từ vựng" → click vào 1 từ → log network call
> **Tham chiếu UI:** popup "relatively /ˈrɛlətɪvli/ (adverb) — tương đối …"
> **Tổng thời gian:** ~1.5h capture + 1.5h plan tiếp theo wire vào UI

---

## 📋 STATE HIỆN TẠI

### Có sẵn ✅
- `data/api/review/all-calls.json` — log network của review page (KHÔNG có vocab call vì script chưa click vào từ)
- `src/api-sniffer.js` — Playwright sniffer hiện có 4 target: library, exam, result, review
- `src/login-portal.js` — đã có session login YouPass
- `data/sessions/storage-state.json` — cookie/session đã lưu

### Chưa có ❌
- Vocab API endpoint thật của YouPass
- Format request/response của API tra từ
- Authentication header (nếu có riêng cho vocab API)

---

## 🎯 GIAI ĐOẠN 1 — Mở rộng api-sniffer để bắt vocab call (45')

### Bước 1.1 — Tạo script `src/sniff-vocab.js`

File mới, focus chỉ vào việc bắt vocab API. Workflow:
1. Mở `https://e-learning.youpass.vn/practice/listening/10462?type=review&answerId=13445686`
2. Đợi page load (audio bar hiện)
3. Click tool button `Tra từ vựng` (xác định selector từ DOM)
4. Đợi mode active (cursor đổi hoặc class change)
5. Click vào 1 từ trong transcript (chọn từ "relatively" hoặc "research" — bất kỳ từ có sẵn)
6. Đợi popup hiện
7. Log toàn bộ network calls từ lúc click → sau 3s
8. Lặp thêm 3-5 từ khác nhau để xác nhận format
9. Lưu vào `data/api/vocab-calls.json`

```js
// src/sniff-vocab.js
const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const { loadSession } = require('./login-portal');

const OUTPUT_DIR = path.join(__dirname, '../data/api/vocab');
const TARGET_URL = 'https://e-learning.youpass.vn/practice/listening/10462?type=review&answerId=13445686';

// Các từ test (chọn từ có khả năng xuất hiện trong transcript)
const TEST_WORDS = ['relatively', 'research', 'telescope', 'invention', 'discovered'];

async function main() {
  const loaded = await loadSession();
  if (!loaded) { console.error('No session — run login-portal trước'); process.exit(1); }

  await fs.ensureDir(OUTPUT_DIR);
  const browser = await chromium.launch({ headless: false }); // headed để debug
  const context = await browser.newContext({
    storageState: loaded.storageStatePath,
    userAgent: loaded.session.userAgent,
  });
  const page = await context.newPage();

  // Network logger
  const calls = [];
  page.on('response', async (response) => {
    try {
      const url = response.url();
      // Bỏ qua tracking/analytics
      if (/google|amplitude|sentry|facebook|datadog/.test(url)) return;
      const ct = response.headers()['content-type'] || '';
      if (!ct.includes('json') && !ct.includes('text')) return;

      const text = await response.text().catch(() => '');
      calls.push({
        ts: Date.now(),
        method: response.request().method(),
        url,
        status: response.status(),
        contentType: ct,
        postData: response.request().postData(),
        body: text.slice(0, 5000), // giới hạn 5KB/response
      });
    } catch {}
  });

  console.log('Opening review page...');
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  console.log('Looking for Tra từ vựng button...');
  // Try multiple selector strategies
  const vocabBtnSelectors = [
    'button:has-text("Tra từ vựng")',
    '[title*="Tra từ"]',
    '[aria-label*="Tra từ"]',
    'button:has-text("Vocab")',
  ];
  let vocabBtn = null;
  for (const sel of vocabBtnSelectors) {
    vocabBtn = await page.$(sel);
    if (vocabBtn) { console.log('Found vocab button:', sel); break; }
  }
  if (!vocabBtn) {
    console.log('Vocab button not found by selector — trying keyboard shortcut "T"');
    await page.keyboard.press('t');
  } else {
    await vocabBtn.click();
  }
  await page.waitForTimeout(1500);

  // Find a clickable word in transcript
  console.log('Looking for transcript words to click...');
  for (const word of TEST_WORDS) {
    try {
      // Mark a starting point for this word capture
      calls.push({ MARKER: `START_WORD_${word}`, ts: Date.now() });

      // Find span with that word (case-insensitive)
      const handle = await page.$(`text=${word}`);
      if (!handle) {
        console.log(`Word "${word}" not found in transcript, skip`);
        continue;
      }
      console.log(`Clicking word: ${word}`);
      await handle.click({ force: true });
      await page.waitForTimeout(3000); // wait for popup + API

      calls.push({ MARKER: `END_WORD_${word}`, ts: Date.now() });
    } catch (e) {
      console.log(`Error clicking "${word}":`, e.message);
    }
  }

  await fs.writeJson(path.join(OUTPUT_DIR, 'all-calls.json'), calls, { spaces: 2 });
  console.log(`\n✓ Saved ${calls.length} calls to ${OUTPUT_DIR}/all-calls.json`);

  // Auto-extract vocab-specific calls
  const vocabCalls = calls.filter(c =>
    c.url && /vocab|translate|lookup|dictionary|word/i.test(c.url)
  );
  await fs.writeJson(path.join(OUTPUT_DIR, 'vocab-only.json'), vocabCalls, { spaces: 2 });
  console.log(`✓ Extracted ${vocabCalls.length} vocab-related calls to vocab-only.json`);

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
```

### Bước 1.2 — Chạy capture

```powershell
cd D:\YouPassClone
node src\sniff-vocab.js
```

> Cửa sổ Chromium sẽ mở (headless: false). Để mặc cho script tự thao tác. Nếu nó kẹt ở "Tra từ vựng" button:
> - Mở DevTools → Inspect button → copy đúng selector → update array `vocabBtnSelectors`
> - Hoặc: tự click thủ công, script vẫn log network từ lúc page load

### Bước 1.3 — Phân tích output

```powershell
node -e "
const fs=require('fs');
const calls=JSON.parse(fs.readFileSync('data/api/vocab/all-calls.json','utf8'));
console.log('Total calls:', calls.length);
console.log('URLs unique:');
const urls=new Set();
for(const c of calls){if(c.url) urls.add(c.url.replace(/[?&].+$/,'').replace(/\d+/g,'{ID}'));}
[...urls].forEach(u=>console.log(' -',u));
"
```

→ Tìm URL pattern nào liên quan: `vocab`, `translate`, `lookup`, `dictionary`.

### Acceptance Bước 1

- [ ] File `data/api/vocab/vocab-only.json` có >= 1 call
- [ ] URL của vocab API được xác định (sample URL)
- [ ] Sample response có chứa: word, IPA, meaning VN, audio URL (hoặc tương đương)

---

## 🎯 GIAI ĐOẠN 2 — Document API spec (15')

Sau khi có capture, viết spec vào `docs/VOCAB_API_SPEC.md`:

```markdown
# YouPass Vocab API Spec (reverse engineered)

## Endpoint
`GET https://api.youpass.vn/v1/...`  ← điền sau khi capture

## Request
- Method: GET hoặc POST
- Headers: Authorization, ...
- Query params: word=..., language=vi, ...
- Body (nếu POST): {...}

## Response
\`\`\`json
{
  "word": "relatively",
  "phonetic": "/ˈrɛlətɪvli/",
  "pos": "adverb",
  "translation_vi": "tương đối",
  "audio_url": "...",
  "examples": [...],
  "related_phrases": [...]
}
\`\`\`

## Authentication
- Cookie-based hoặc Bearer token từ session
- Token sống bao lâu?

## Rate limit
- Có hạn chế không?
- 1 lượt vocab = 1 dcoin (theo pricing_models đã capture)
```

---

## 🎯 GIAI ĐOẠN 3 — Quyết định kiến trúc (15')

Sau khi có spec, chọn 1 trong 3:

### Option A — Proxy live qua API mình
- App gọi `/api/dictionary/{word}` → server fetch YouPass API → trả về client
- **Pros:** Không cần pre-fetch, mọi từ đều có
- **Cons:** Phụ thuộc YouPass có thể block IP, mỗi request mất ~300ms

### Option B — Pre-fetch và cache local
- Script chạy 1 lần: extract unique words từ tất cả transcripts → fetch từ YouPass cho từng từ → lưu `data/vocab-dict.json`
- App đọc từ local file, không gọi YouPass lúc runtime
- **Pros:** Offline-ready, 0ms, không lo bị block
- **Cons:** File ~10-30MB tùy số từ unique, build script chạy lâu (~30 phút–2h), tốn dcoin của user

### Option C — Hybrid
- Build script pre-fetch top 5000 từ phổ biến nhất → `data/vocab-common.json`
- Runtime: check local trước, miss → call live → cache
- **Pros:** Cân bằng

→ **Khuyến nghị: Option B** nếu xác định được API không bị giới hạn account/dcoin. Option A nếu API yêu cầu authenticated request mỗi lần.

---

## 🎯 GIAI ĐOẠN 4 — Implement (sẽ lên plan chi tiết sau khi capture xong)

Tùy Option chọn ở GĐ 3, sẽ có plan riêng:
- Nếu A → tạo `/api/dictionary/[word]/route.ts` proxy
- Nếu B → tạo `src/fetch-all-vocab.js` build script + đọc local
- Nếu C → kết hợp cả 2

---

## 🚦 THỨ TỰ THỰC HIỆN

1. **GĐ 1 (45')** — Capture API thật từ YouPass
2. **GĐ 2 (15')** — Document spec
3. **GĐ 3 (15')** — Chọn kiến trúc (A/B/C)
4. **GĐ 4 (1-2h)** — Implement (plan chi tiết sau)

**Tổng GĐ 1-3:** ~1.5h reconnaissance + decision

---

## 🛟 NẾU GẶP VƯỚNG

### Script không tìm thấy "Tra từ vựng" button
1. Mở Chrome thủ công tại URL review
2. F12 → Inspect button "Tra từ vựng" → copy CSS selector
3. Update `vocabBtnSelectors` array trong script
4. Hoặc: dùng phím tắt T (script đã có fallback)

### Session expired (login)
```powershell
node src\login-portal.js
```
→ Login thủ công, save session, sau đó chạy lại sniffer.

### Không có call nào liên quan vocab
- Có thể YouPass dùng GraphQL → URL không có chữ "vocab"
- Check tất cả POST request với body chứa "word" hoặc "translate"
- Hoặc check WebSocket connections

### Vocab cần dcoin
- Account đã capture có thể không đủ dcoin → API trả 402/403
- Cần account khác hoặc đăng ký lượt vocab

### API trả về encrypted/encoded
- Decode bằng base64/JSON parse
- Check headers `Content-Encoding`

---

## 📁 FILE SẼ TẠO

| File | Mục đích |
|------|---------|
| `src/sniff-vocab.js` | Script capture |
| `data/api/vocab/all-calls.json` | Raw log tất cả network |
| `data/api/vocab/vocab-only.json` | Filtered vocab calls |
| `docs/VOCAB_API_SPEC.md` | Spec API sau khi reverse engineer |

---

## ✅ SUCCESS CRITERIA

- [ ] Chạy `node src\sniff-vocab.js` không lỗi
- [ ] Có ít nhất 1 file response JSON chứa word + IPA + VN translation
- [ ] Xác định được URL endpoint chính xác
- [ ] Xác định được auth method (cookie/bearer)
- [ ] Document spec đầy đủ vào `docs/VOCAB_API_SPEC.md`
- [ ] Quyết định được Option A/B/C cho implementation

---

## 🎬 SAU KHI CAPTURE XONG

Reply lại tôi với:
1. URL endpoint chính xác
2. Sample response (paste JSON)
3. Auth method (cookie/token)

Tôi sẽ lên plan GĐ 4 cụ thể tùy theo result.

Hoặc reply **"Tự làm tiếp"** → tự wire vào project theo plan đã có ở `PLAN_VOCAB_LOOKUP.md` nhưng thay external API bằng YouPass API.
