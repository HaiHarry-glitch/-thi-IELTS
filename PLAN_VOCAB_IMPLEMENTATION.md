# PLAN — Wire Vocab Lookup vào project (Implementation)

> **Trạng thái:** Đã reverse engineer xong API YouPass
> **Tham chiếu:** `data/api/vocab/vocab-only.json` (12 calls captured)
> **Scope:** Wire YouPass vocab API vào `/thi-thu/listening/[id]?type=review`
> **Tổng thời gian:** ~2.5h

---

## ✅ API SPEC ĐÃ XÁC ĐỊNH

### Endpoint 1: Vocab lookup

```http
GET https://api.youpass.vn/v1/vocabs?parent_id={sentenceId}&word={word}
Cookie: auth_token=...; directus_refresh_token=...
```

**Response:**
```json
{
  "code": 0,
  "message": "",
  "data": {
    "id": 2981339,
    "value": "invention",
    "word_class": "noun",
    "meaning": "phát minh",
    "ipa": "/ɪnˈvɛnʃənz/",
    "explanation": "Trong đoạn văn, \"invention's\" là dạng sở hữu cách...",
    "collocation": "a new invention",
    "example": [
      "The internet is a revolutionary invention. (Internet là một phát minh...)",
      "His latest invention won an award. (...)"
    ],
    "word_display": "invention's",
    "parent": {
      "id": 2981330,
      "value": "<full sentence>",
      "meaning": "<VN translation of sentence>",
      "explanation": "<sentence-level explanation>",
      "reference": "<reference notes>"
    }
  }
}
```

### Endpoint 2: Pronunciation audio

```http
POST https://api.youpass.vn/v1/pronunciation
Content-Type: application/json
Cookie: auth_token=...

{"data":{"vocab":"mount","word_class":"noun","ipa":"/maʊnt/"}}
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "data": {
      "vocab": "mount",
      "word_class": "noun",
      "ipa": "/maʊnt/",
      "link": "https://youpass-space.sgp1.digitaloceanspaces.com/<uuid>.mp3"
    }
  }
}
```

### Authentication

- Cookie `auth_token` từ session
- Cookies đã lưu trong `data/sessions/storage-state.json`
- Token cần được attach vào mỗi request

### Quan trọng: `parent_id`

- `parent_id` = ID của câu (sentence) trong transcript
- Lấy từ `raw.parts[i].vocabs[j].children[k].id` (level 2 node)
- Hiện normalized data **KHÔNG có sentence ID** → cần bổ sung

---

## 🎯 KIẾN TRÚC ĐỀ XUẤT: Proxy mode (Option A)

```
[Browser] ←→ [Next.js API route /api/vocab/[word]]
                     ↓
              [YouPass API /v1/vocabs]
                     ↓
              cache result vào localStorage (client)
              + optionally cache vào file (server)
```

**Vì sao Proxy mode:**
- Auth cookie để ở server, không expose client
- Cache hit → 0ms, miss → ~300ms (chỉ lần đầu mỗi từ)
- Không cần pre-fetch hàng ngàn từ (tiết kiệm dcoin nếu có giới hạn)

---

## 🔧 IMPLEMENTATION — 6 GIAI ĐOẠN

### GIAI ĐOẠN 1 — Bổ sung sentence ID vào normalized data (20')

**File:** `src/normalize-listening.js`

Function `reconstructTranscriptSegments(part)` hiện tại tạo sentences nhưng KHÔNG lưu ID. Cần thêm:

```diff
function reconstructTranscriptSegments(part) {
  if (!part.vocabs?.length) return null;
  const segments = [];
  let paraIdx = 0;
  for (const vocab of part.vocabs) {
    const sentences = [];
    const items = vocab.children?.length ? vocab.children : [vocab];
    for (const item of items) {
      const subs = item.children?.length ? item.children : [item];
      for (const s of subs) {
        if (!s.value) continue;
        sentences.push({
+         id: s.id,  // ← SENTENCE ID dùng cho parent_id
          text: s.value,
          from: s.meta?.from ?? null,
          to: s.meta?.to ?? null,
          speaker: s.meta?.speaker ?? null,
        });
      }
    }
    if (sentences.length) segments.push({ paragraph: paraIdx++, sentences });
  }
  const hasAny = segments.some(p => p.sentences.some(s => s.from != null));
  return hasAny ? segments : null;
}
```

**Update type:** `web/lib/data.ts`
```diff
export interface TranscriptSentence {
+ id: number;
  text: string;
  from: number | null;
  to: number | null;
  speaker: string | null;
}
```

**Run:**
```powershell
node src\normalize-listening.js
```

**Verify:**
```powershell
node -e "const d=require('./data/normalized-listening/10006.json'); console.log(d.parts[0].transcriptSegments[0].sentences[0])"
```
→ Phải thấy `id` field.

---

### GIAI ĐOẠN 2 — Backend proxy `/api/vocab` (30')

**Tạo:** `web/app/api/vocab/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const YOUPASS_BASE = "https://api.youpass.vn/v1";
const SESSION_PATH = path.join(process.cwd(), "../data/sessions/storage-state.json");
const CACHE_PATH = path.join(process.cwd(), "../data/api/vocab/cache.json");

let cachedCookies: string | null = null;
let cachedAt = 0;
const COOKIE_TTL = 60 * 60 * 1000; // re-read every 1h

function getCookieHeader(): string {
  if (cachedCookies && Date.now() - cachedAt < COOKIE_TTL) return cachedCookies;
  try {
    const state = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
    const youPassCookies = (state.cookies || []).filter((c: any) =>
      /youpass\.vn$/.test(c.domain) || c.domain === ".youpass.vn"
    );
    cachedCookies = youPassCookies.map((c: any) => `${c.name}=${c.value}`).join("; ");
    cachedAt = Date.now();
    return cachedCookies;
  } catch {
    return "";
  }
}

let fileCache: Record<string, any> = {};
try {
  if (fs.existsSync(CACHE_PATH)) fileCache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
} catch {}

function persistCache() {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(fileCache));
  } catch {}
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parent_id");
  const word = searchParams.get("word");

  if (!parentId || !word) {
    return NextResponse.json({ error: "missing parent_id or word" }, { status: 400 });
  }

  // Validate word
  if (!/^[a-zA-Z'\-]{1,50}$/.test(word)) {
    return NextResponse.json({ error: "invalid word" }, { status: 400 });
  }

  const cacheKey = `${parentId}::${word.toLowerCase()}`;
  if (fileCache[cacheKey]) {
    return NextResponse.json(fileCache[cacheKey], { headers: { "X-Cache": "HIT" } });
  }

  const cookie = getCookieHeader();
  if (!cookie) {
    return NextResponse.json({ error: "no session — run login-portal" }, { status: 401 });
  }

  try {
    const url = `${YOUPASS_BASE}/vocabs?parent_id=${parentId}&word=${encodeURIComponent(word)}`;
    const res = await fetch(url, {
      headers: {
        "Cookie": cookie,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "upstream error", status: res.status }, { status: res.status });
    }
    const data = await res.json();
    fileCache[cacheKey] = data;
    persistCache();
    return NextResponse.json(data, { headers: { "X-Cache": "MISS" } });
  } catch (e: any) {
    return NextResponse.json({ error: "fetch failed", message: e.message }, { status: 500 });
  }
}
```

**Verify:**
```powershell
# Start dev server
cd web; npm run dev

# In another terminal:
curl "http://localhost:3000/api/vocab?parent_id=2981330&word=invention"
```

Mong đợi: JSON có `data.value`, `meaning`, `ipa`, `explanation`, etc.

---

### GIAI ĐOẠN 3 — Pronunciation proxy `/api/vocab/pronunciation` (10')

**Tạo:** `web/app/api/vocab/pronunciation/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SESSION_PATH = path.join(process.cwd(), "../data/sessions/storage-state.json");
const CACHE_PATH = path.join(process.cwd(), "../data/api/vocab/pronunciation-cache.json");

function getCookieHeader(): string {
  try {
    const state = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
    return (state.cookies || [])
      .filter((c: any) => /youpass\.vn$/.test(c.domain) || c.domain === ".youpass.vn")
      .map((c: any) => `${c.name}=${c.value}`).join("; ");
  } catch { return ""; }
}

let cache: Record<string, any> = {};
try { if (fs.existsSync(CACHE_PATH)) cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")); } catch {}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { vocab, word_class, ipa } = body?.data || {};
  if (!vocab) return NextResponse.json({ error: "missing vocab" }, { status: 400 });

  const key = `${vocab}::${word_class}::${ipa}`;
  if (cache[key]) return NextResponse.json(cache[key], { headers: { "X-Cache": "HIT" } });

  const cookie = getCookieHeader();
  try {
    const res = await fetch("https://api.youpass.vn/v1/pronunciation", {
      method: "POST",
      headers: { "Cookie": cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { vocab, word_class, ipa } }),
    });
    const data = await res.json();
    cache[key] = data;
    try { fs.writeFileSync(CACHE_PATH, JSON.stringify(cache)); } catch {}
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

---

### GIAI ĐOẠN 4 — Patch VocabPopup dùng YouPass API (30')

**File:** `web/components/listening/VocabPopup.tsx` (nếu đã có) hoặc tạo mới.

Component nhận thêm `sentenceId`, gọi `/api/vocab?parent_id={sentenceId}&word={word}`:

```tsx
"use client";
import { useEffect, useState } from "react";

interface YouPassVocab {
  id: number;
  value: string;
  word_class: string;
  meaning: string;
  ipa: string;
  explanation: string;
  collocation?: string;
  example?: string[];
  word_display?: string;
  parent?: {
    id: number;
    value: string;
    meaning: string;
    explanation: string;
    reference?: string;
  };
}

interface Props {
  word: string;
  sentenceId: number;  // ← từ transcriptSegments[].sentences[].id
  onClose: () => void;
}

const CACHE_KEY = (sid: number, w: string) => `yp_vocab_${sid}_${w.toLowerCase()}`;

export default function VocabPopup({ word, sentenceId, onClose }: Props) {
  const [data, setData] = useState<YouPassVocab | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showSentenceTranslate, setShowSentenceTranslate] = useState(false);

  // Fetch vocab
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setData(null); setAudioUrl(null);

    // Try cache
    const cached = localStorage.getItem(CACHE_KEY(sentenceId, word));
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (!cancelled) { setData(parsed); setLoading(false); return; }
      } catch {}
    }

    fetch(`/api/vocab?parent_id=${sentenceId}&word=${encodeURIComponent(word.toLowerCase())}`)
      .then(r => r.json())
      .then(res => {
        if (cancelled) return;
        if (res.code === 0 && res.data) {
          setData(res.data);
          try { localStorage.setItem(CACHE_KEY(sentenceId, word), JSON.stringify(res.data)); } catch {}
        } else {
          setError(res.message || "Không tìm thấy từ");
        }
      })
      .catch(e => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [word, sentenceId]);

  // Lazy fetch audio (only on play click)
  async function playAudio() {
    if (!data) return;
    let url = audioUrl;
    if (!url) {
      try {
        const res = await fetch("/api/vocab/pronunciation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { vocab: data.value, word_class: data.word_class, ipa: data.ipa } }),
        });
        const r = await res.json();
        url = r?.data?.data?.link;
        setAudioUrl(url || null);
      } catch {}
    }
    if (url) new Audio(url).play().catch(() => {});
  }

  function copyWord() {
    navigator.clipboard.writeText(word).catch(() => {});
  }

  function saveVocab() {
    // Save to localStorage saved vocab list
    const saved = JSON.parse(localStorage.getItem("yp_saved_vocabs") || "[]");
    if (!saved.find((v: any) => v.word === word)) {
      saved.push({ word, sentenceId, savedAt: Date.now(), data });
      localStorage.setItem("yp_saved_vocabs", JSON.stringify(saved));
    }
  }

  return (
    <div className="my-3 bg-white border border-[#a4d8a4] rounded-lg shadow-md text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <button onClick={playAudio} className="text-gray-600 hover:text-[#5a8c5a]" title="Phát âm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/>
          </svg>
        </button>
        <span className="font-bold text-gray-900 text-base">{data?.word_display || word}</span>
        {data?.ipa && <span className="font-mono text-gray-500">{data.ipa}</span>}
        {data?.word_class && <span className="text-gray-500 italic">({data.word_class})</span>}

        <div className="ml-auto flex items-center gap-2">
          <button className="text-gray-400 hover:text-[#5a8c5a]" title="Hữu ích">👍</button>
          <button className="text-gray-400 hover:text-red-500" title="Không hữu ích">👎</button>
          <button onClick={saveVocab} className="px-3 py-1 bg-[#dcfce7] text-[#168b32] rounded text-xs hover:bg-[#bbf7d0] font-semibold">
            + Lưu từ vựng
          </button>
          <button onClick={copyWord} className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">
            Sao chép
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 ml-1">✕</button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {loading && <div className="text-gray-500 text-xs">Đang tra từ điển...</div>}
        {error && <div className="text-red-500 text-xs">Lỗi: {error}</div>}
        {data && (
          <>
            {/* Meaning */}
            <div className="text-lg text-[#5a8c5a] font-semibold">{data.meaning}</div>

            {/* Related */}
            {data.collocation && (
              <div className="text-sm">
                <span className="font-bold">Từ/Cấu trúc liên quan:</span>{" "}
                <span className="text-gray-700">{data.collocation}</span>
              </div>
            )}

            {/* Explanation */}
            {data.explanation && (
              <div className="text-sm">
                <span className="font-bold">Giải thích nghĩa tiếng Việt:</span>{" "}
                <span className="text-gray-700">{data.explanation}</span>
              </div>
            )}

            {/* Examples */}
            {data.example && data.example.length > 0 && (
              <div className="text-sm">
                <div className="font-bold mb-1">Ví dụ:</div>
                {data.example.map((ex, i) => (
                  <div key={i} className="text-gray-700 ml-2 mb-1">{ex}</div>
                ))}
              </div>
            )}

            {/* Sentence translation toggle */}
            {data.parent && (
              <details className="text-sm" open={showSentenceTranslate}>
                <summary className="cursor-pointer text-[#5a8c5a] hover:underline font-semibold">
                  Dịch nghĩa cả câu
                </summary>
                <div className="mt-2 pl-2 border-l-2 border-[#a4d8a4] space-y-2">
                  <div><strong>Câu:</strong> <em>{data.parent.value}</em></div>
                  <div><strong>Nghĩa:</strong> {data.parent.meaning}</div>
                  {data.parent.explanation && <div><strong>Giải thích:</strong> {data.parent.explanation}</div>}
                  {data.parent.reference && <div><strong>Tham chiếu:</strong> {data.parent.reference}</div>}
                </div>
              </details>
            )}

            {/* Footer */}
            <div className="flex justify-end items-center gap-1 text-xs text-gray-400 pt-2 border-t border-gray-100">
              Explained by <span className="font-bold text-[#168b32]">YouPass</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

---

### GIAI ĐOẠN 5 — Wire popup vào TranscriptPlayer (30')

**File:** `web/components/listening/TranscriptPlayer.tsx`

Cần:
1. Khi `vocabMode = true`, mỗi sentence wrap mỗi word thành `<span>` clickable
2. Click word → mở popup với `word` + `sentenceId` (lấy từ `sen.id`)
3. Popup hiện inline dưới câu vừa click

```tsx
// Inside TranscriptPlayer
interface Props {
  ...
  vocabMode: boolean;
  selectedVocab: { word: string; sentenceId: number; key: string } | null;
  onWordClick: (word: string, sentenceId: number, key: string) => void;
  onCloseVocab: () => void;
}

// Word wrapper helper
function wrapWords(text: string, onClick: (w: string) => void): React.ReactNode {
  const tokens = text.split(/(\s+)/);
  return tokens.map((tok, i) => {
    if (/^\s+$/.test(tok)) return tok;
    const clean = tok.replace(/^[^\w']+|[^\w']+$/g, "").toLowerCase();
    if (!clean) return tok;
    return (
      <span key={i}
        onClick={(e) => { e.stopPropagation(); onClick(clean); }}
        className="cursor-pointer hover:bg-[#fef3c7] hover:underline decoration-dotted">
        {tok}
      </span>
    );
  });
}

// In render:
{block.sentences.map(({ s, sen }) => {
  const key = `${p}-${s}`;
  const isActive = activeKey === key;
  const showPopup = selectedVocab?.key === key;
  return (
    <Fragment key={key}>
      <span data-key={key}
        onClick={() => !vocabMode && sen.from != null && onSeek(sen.from)}
        className={`... ${isActive ? "bg-[#a4d8a4]/50" : ""} ...`}>
        {vocabMode
          ? wrapWords(sen.text, (w) => onWordClick(w, sen.id, key))
          : sen.text + " "}
      </span>
      {showPopup && (
        <VocabPopup
          word={selectedVocab.word}
          sentenceId={selectedVocab.sentenceId}
          onClose={onCloseVocab}
        />
      )}
    </Fragment>
  );
})}
```

**Trong `ListeningReviewClient.tsx`:**

```tsx
const [selectedVocab, setSelectedVocab] = useState<{word:string; sentenceId:number; key:string}|null>(null);

// In tool rail handler:
function toggleVocabTool() {
  setActiveTool(t => t === "vocab" ? "none" : "vocab");
  if (activeTool === "vocab") setSelectedVocab(null); // close popup when tool off
}

// Keyboard shortcut T
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === "t" || e.key === "T") toggleVocabTool();
    if (e.key === "Escape") setSelectedVocab(null);
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [activeTool]);

// Pass to TranscriptPlayer:
<TranscriptPlayer
  ...
  vocabMode={activeTool === "vocab"}
  selectedVocab={selectedVocab}
  onWordClick={(word, sentenceId, key) => setSelectedVocab({ word, sentenceId, key })}
  onCloseVocab={() => setSelectedVocab(null)}
/>
```

---

### GIAI ĐOẠN 6 — Test (15')

**URL test:** `http://localhost:3000/thi-thu/listening/10006?type=review`

**Checklist:**
- [ ] Tool rail có nút "Tra từ vựng" (T)
- [ ] Click vào tool → active state hiện
- [ ] Phím tắt T toggle vocab mode
- [ ] Khi vocab mode bật: cursor đổi help trên transcript
- [ ] Click vào 1 từ trong transcript → popup hiện dưới câu
- [ ] Popup load 200-500ms lần đầu, 0ms lần sau (cache)
- [ ] Popup hiện: word, IPA, POS, nghĩa VN, giải thích, ví dụ, collocation
- [ ] "Dịch nghĩa cả câu" expandable → hiện sentence translation
- [ ] Nút phát âm → audio mp3 phát đúng từ
- [ ] Click "Lưu từ vựng" → lưu vào localStorage `yp_saved_vocabs`
- [ ] Click "Sao chép" → clipboard có từ
- [ ] Click X / Escape → đóng popup
- [ ] Click từ khác → popup chuyển sang từ mới
- [ ] Tắt vocab mode → click sentence vẫn seek audio
- [ ] Audio bar, transcript highlight vẫn hoạt động bình thường

**Verify backend cache:**
```powershell
# Sau khi test xong vài từ, check file cache
Get-Content data\api\vocab\cache.json | ConvertFrom-Json | Get-Member -MemberType NoteProperty | Measure
```
→ Số từ đã cache.

**Verify TS:**
```powershell
cd web
npx tsc --noEmit
```

---

## 📁 FILE SUMMARY

| File | Loại | GĐ |
|------|------|----|
| `src/normalize-listening.js` | Sửa | 1 |
| `web/lib/data.ts` | Sửa | 1 |
| `web/app/api/vocab/route.ts` | **Tạo** | 2 |
| `web/app/api/vocab/pronunciation/route.ts` | **Tạo** | 3 |
| `web/components/listening/VocabPopup.tsx` | **Tạo** | 4 |
| `web/components/listening/TranscriptPlayer.tsx` | Sửa | 5 |
| `web/app/thi-thu/listening/[id]/ListeningReviewClient.tsx` | Sửa | 5 |

**Tổng: 3 file mới + 4 file sửa**

---

## ⚠️ RỦI RO & XỬ LÝ

| Rủi ro | Xử lý |
|--------|-------|
| Session expired → 401 từ YouPass | Re-run `node src/login-and-sniff-vocab.js`, login lại, đóng browser → storage-state.json update |
| Từ không có trong YouPass DB | API trả empty hoặc 404 → popup hiện "Không tìm thấy" |
| sentence ID không khớp parent_id | Verify ngày normalize: `transcriptSegments[].sentences[].id` phải lấy từ raw `vocabs[].children[].id` |
| Tốn dcoin (1 lượt = 1 dcoin) | Account của user đã unlimited_vocab nếu là PRO, hoặc lượt miễn phí. Cache mạnh để giảm fetch |
| YouPass đổi API endpoint | Update URL trong `web/app/api/vocab/route.ts` |
| Cookie leak qua client | Đã ở server-side proxy, client KHÔNG bao giờ thấy cookie |
| Rate limit | YouPass API có thể giới hạn → thêm exponential backoff trong proxy |

---

## 🚀 THỨ TỰ THỰC HIỆN

1. **GĐ 1 (20')** — Bổ sung sentence ID + re-normalize
2. **GĐ 2 (30')** — Backend proxy `/api/vocab`
3. **GĐ 3 (10')** — Pronunciation proxy
4. **GĐ 4 (30')** — VocabPopup component
5. **GĐ 5 (30')** — Wire vào TranscriptPlayer
6. **GĐ 6 (15')** — Test end-to-end

**Tổng:** ~2.5h

---

## ✅ SUCCESS CRITERIA

1. ✅ Bật vocab mode (phím T) → click từ → popup hiện đầy đủ (word, IPA, POS, VN, explain, examples, sentence translation)
2. ✅ Audio pronunciation phát đúng (qua YouPass digitaloceanspaces)
3. ✅ Cache 2 lớp: localStorage client + file server → fetch lần sau 0ms
4. ✅ Cookie auth lưu server-side, không leak ra client
5. ✅ Lưu từ vào localStorage `yp_saved_vocabs`
6. ✅ Tắt vocab mode → click sentence vẫn seek audio
7. ✅ Exam mode KHÔNG bị ảnh hưởng
8. ✅ TypeScript pass
9. ✅ Audit data: 637 OK / 1 unavailable / 0 broken (không regression)

---

## 🛟 NẾU GẶP VƯỚNG

### Session expired
```powershell
node src\login-and-sniff-vocab.js
# Login lại → đóng browser
```

### sentence ID không có trong normalized
- Check raw `data/listening-exams/{id}.json` → `parts[].vocabs[].children[].id`
- Re-run normalize sau khi sửa `normalize-listening.js`

### API trả 401 mặc dù session OK
- Check timing: cookies expired? → re-login
- Check Cookie header format trong proxy có đúng không

### Popup không hiện
- Check console.log `selectedVocab` state
- Check `sentenceId` có truyền đúng không (data attribute)

### Audio không phát
- Check response của `/api/vocab/pronunciation` có `link` field
- Test trực tiếp URL mp3 trong browser tab mới

---

## 📊 DATA COVERAGE (sau khi implement)

- **Vocab lookup:** Mọi từ có thể tra (YouPass DB rộng, generate on-the-fly nếu chưa có)
- **Sentence ID requirement:** 368/637 parts có sentence-level vocabs trong raw → 368 parts hỗ trợ vocab lookup
- **Parts không có vocabs:** popup vẫn fetch được nhưng `parent_id` invalid → có thể fail. Mitigation: chỉ enable vocab mode khi part có `transcriptSegments` không null

---

## 🎬 SAU KHI XONG

Reply:
- **"Xong"** → tôi review code + screenshot
- **"Có lỗi X"** → tôi debug
- **"Tự làm GĐ tiếp"** → tôi để bạn tự làm phần saved vocabs / Sổ Từ vựng page
