# PLAN — Vocab Lookup (Tra từ vựng)

> **Ngày:** 2026-05-13
> **Scope:** Bật chế độ "Tra từ vựng" (phím T) → click vào từ trong transcript → hiện popup từ điển
> **Tham chiếu UI:** ảnh YouPass thật user gửi (popup "relatively /ˈrɛlətɪvli/ (adverb) — tương đối …")
> **KHÔNG đụng:** Exam mode, Reading, Library, data normalize

---

## 📊 DATA AUDIT

### Đã có ✅
| Field | Path | Mô tả |
|-------|------|-------|
| Sentence text | `part.transcriptSegments[i].sentences[j].text` | Đã có |
| Sentence audio time | `part.vocabs[i].children[j].meta.from/to` | Đã có |

### Chưa có ❌
| Field cần | Lưu ở đâu? |
|-----------|------------|
| IPA phiên âm (`/ˈrɛlətɪvli/`) | Không có |
| Phần loại từ (adverb, noun…) | Không có |
| Nghĩa Tiếng Việt | Không có |
| Audio đọc từ | Không có |
| Câu ví dụ | Không có |
| Cấu trúc liên quan ("relatively easy") | Không có |

**Kết luận:** Tất cả dữ liệu dictionary phải lấy từ **API ngoài** hoặc **cache pre-fetched**.

---

## 🏗 KIẾN TRÚC ĐỀ XUẤT (3 lựa chọn)

### Option A — Live API + cache (KHUYẾN NGHỊ)

```
Click từ → check localStorage cache
         → nếu hit: hiện popup
         → nếu miss: fetch API → cache → hiện popup
```

**Pros:** Bắt đầu nhanh, mọi từ đều có data
**Cons:** Cần internet, độ trễ ~300ms lần đầu mỗi từ

### Option B — Pre-fetch + offline cache

Build script chạy 1 lần:
- Đọc tất cả `transcriptSegments` → trích unique words
- Fetch dictionary cho từng từ → lưu `data/dictionary.json`
- App chỉ đọc local

**Pros:** Offline-ready, 0ms latency
**Cons:** Build script chạy lâu (mỗi từ ~500ms × hàng ngàn từ), data file lớn (~20MB)

### Option C — Hybrid (Option A + một số từ phổ biến pre-fetched)

→ **Khuyến nghị Option A** cho v1. Sau nếu cần offline có thể chuyển sang C.

---

## 🌐 API EXTERNAL CHỌN

### 1. Free Dictionary API (English meaning + IPA + audio)

- URL: `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`
- Free, no key, no rate limit (reasonable use)
- Trả về: phonetic IPA, audio mp3 URL, definitions (POS + meaning), examples

Response sample (word: "relatively"):
```json
[{
  "word": "relatively",
  "phonetic": "/ˈrɛlətɪvli/",
  "phonetics": [{ "text": "/ˈrɛlətɪvli/", "audio": "https://api.dictionaryapi.dev/.../relatively.mp3" }],
  "meanings": [{
    "partOfSpeech": "adverb",
    "definitions": [{ "definition": "In a relative manner...", "example": "..." }]
  }]
}]
```

### 2. MyMemory Translation (EN → VI)

- URL: `https://api.mymemory.translated.net/get?q={text}&langpair=en|vi`
- Free, không cần key, 5000 ký tự/ngày/IP (đủ cho personal use)

Response:
```json
{
  "responseData": { "translatedText": "tương đối" }
}
```

### Alternative VN: Google Translate (free, dùng package `google-translate-api-x`)

---

## 🎨 UI CHI TIẾT (theo ảnh YouPass)

### Popup layout

```
┌─────────────────────────────────────────────────────────────┐
│ 🔊 relatively /ˈrɛlətɪvli/ (adverb)                    [✕] │
│                                                              │
│ tương đối                            [👍][👎] [+Lưu] [📋]   │
├─────────────────────────────────────────────────────────────┤
│ Từ/Cấu trúc liên quan: relatively easy                       │
│                                                              │
│ Giải thích nghĩa tiếng Việt: Trong đoạn văn, "relatively"   │
│ được sử dụng để chỉ mức độ so sánh, rằng các nhà nghiên     │
│ cứu vẫn còn trẻ so với tuổi thọ làm việc thông thường.      │
│                                                              │
│ Ví dụ:                                                       │
│ The task was relatively easy for him. (Nhiệm vụ tương đối   │
│ dễ dàng đối với anh ấy.)                                     │
│ The weather is relatively warm for this time of year.       │
│ (Thời tiết tương đối ấm áp vào thời điểm này trong năm.)    │
│                                                              │
│ Dịch nghĩa cả câu                                            │
│                                          [Explained by YouPass]│
└─────────────────────────────────────────────────────────────┘
```

### Position

- Hiện inline ngay dưới câu vừa click (push transcript xuống)
- Width: full cột transcript
- Background: `bg-white border border-gray-200 rounded-lg shadow-lg`
- Header: word + IPA + POS + close button

### Components cần

1. **VocabPopup.tsx** — popup hiển thị
2. **VocabLookup.tsx** — wrapper với state management
3. **api/dictionary/[word]/route.ts** — proxy API (tránh CORS)

---

## 🔧 IMPLEMENTATION — 7 GIAI ĐOẠN (~3.5h)

### GIAI ĐOẠN 1 — API proxy backend (30')

**Tạo:** `web/app/api/dictionary/[word]/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";

const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en";
const TRANSLATE_API  = "https://api.mymemory.translated.net/get";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ word: string }> }
) {
  const { word } = await params;
  if (!word || !/^[a-zA-Z'-]{1,50}$/.test(word)) {
    return NextResponse.json({ error: "invalid word" }, { status: 400 });
  }
  const normalized = word.toLowerCase().trim();

  try {
    // Parallel fetch
    const [dictRes, trRes] = await Promise.all([
      fetch(`${DICTIONARY_API}/${encodeURIComponent(normalized)}`, {
        next: { revalidate: 86400 * 30 }, // cache 30 days at fetch layer
      }),
      fetch(`${TRANSLATE_API}?q=${encodeURIComponent(normalized)}&langpair=en|vi`),
    ]);

    const dictData = dictRes.ok ? await dictRes.json() : null;
    const trData = trRes.ok ? await trRes.json() : null;

    // Pick first entry
    const entry = Array.isArray(dictData) ? dictData[0] : null;
    if (!entry) {
      return NextResponse.json({
        word: normalized,
        notFound: true,
        translation: trData?.responseData?.translatedText || null,
      });
    }

    const phonetic = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text || "";
    const audioUrl = entry.phonetics?.find((p: any) => p.audio)?.audio || null;
    const meanings = (entry.meanings || []).slice(0, 3).map((m: any) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: (m.definitions || []).slice(0, 2).map((d: any) => ({
        definition: d.definition,
        example: d.example || null,
      })),
    }));

    return NextResponse.json({
      word: normalized,
      phonetic,
      audioUrl,
      meanings,
      translation: trData?.responseData?.translatedText || null,
    }, {
      headers: { "Cache-Control": "public, max-age=2592000" }, // 30 days
    });
  } catch (e: any) {
    return NextResponse.json({ error: "fetch failed", message: e.message }, { status: 500 });
  }
}
```

**Verify:**
- `curl http://localhost:3000/api/dictionary/relatively`
- Mong đợi: JSON có word, phonetic, audioUrl, meanings, translation

---

### GIAI ĐOẠN 2 — Tool state cho "Tra từ vựng" (15')

**File:** `web/app/thi-thu/listening/[id]/ListeningReviewClient.tsx`

Thêm state:
```tsx
const [activeTool, setActiveTool] = useState<"none" | "highlight" | "notes" | "vocab">("none");
const [vocabWord, setVocabWord] = useState<{
  word: string;
  sentenceKey: string; // "p-s" để biết popup đứng dưới câu nào
} | null>(null);
```

Tool rail button:
```tsx
<ToolItem label="Tra từ vựng" shortcut="T"
  active={activeTool==="vocab"}
  onClick={() => setActiveTool(t => t==="vocab" ? "none" : "vocab")}
/>
```

Keyboard shortcut:
```tsx
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === "T" || e.key === "t") setActiveTool(t => t==="vocab" ? "none" : "vocab");
    if (e.key === "Escape") { setActiveTool("none"); setVocabWord(null); }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
```

---

### GIAI ĐOẠN 3 — Patch TranscriptPlayer: wrap words clickable (30')

**File:** `web/components/listening/TranscriptPlayer.tsx`

Thêm prop:
```tsx
interface Props {
  ...
  vocabMode: boolean;
  onWordClick: (word: string, sentenceKey: string) => void;
}
```

Khi `vocabMode = true`, mỗi sentence render thành các word `<span>` clickable:

```tsx
function renderSentence(text: string, vocabMode: boolean, onWordClick: (w:string)=>void) {
  if (!vocabMode) return text;
  // Split by whitespace but keep punctuation
  const tokens = text.split(/(\s+)/);
  return tokens.map((tok, i) => {
    if (/^\s+$/.test(tok)) return tok;
    // Strip leading/trailing punctuation for lookup
    const clean = tok.replace(/^[^\w']+|[^\w']+$/g, "").toLowerCase();
    if (!clean) return tok;
    return (
      <span key={i}
        onClick={(e) => { e.stopPropagation(); onWordClick(clean); }}
        className="cursor-pointer hover:bg-[#fef3c7] hover:underline decoration-dotted px-px rounded"
      >
        {tok}
      </span>
    );
  });
}
```

Sentence-level click (seek audio) chỉ chạy khi `!vocabMode`:
```tsx
onClick={() => !vocabMode && clickable && onSeek(sen.from!)}
```

→ Khi vocab mode bật, click sentence không seek; click từ mới mở popup.

---

### GIAI ĐOẠN 4 — VocabPopup component (45')

**Tạo:** `web/components/listening/VocabPopup.tsx`

```tsx
"use client";
import { useEffect, useState } from "react";

interface DictEntry {
  word: string;
  phonetic?: string;
  audioUrl?: string | null;
  meanings?: Array<{
    partOfSpeech: string;
    definitions: Array<{ definition: string; example?: string | null }>;
  }>;
  translation?: string | null;
  notFound?: boolean;
}

interface Props {
  word: string;
  onClose: () => void;
}

const CACHE_KEY = (w: string) => `yp_dict_${w.toLowerCase()}`;

export default function VocabPopup({ word, onClose }: Props) {
  const [entry, setEntry] = useState<DictEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEntry(null);

    // Try cache first
    const cached = localStorage.getItem(CACHE_KEY(word));
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (!cancelled) { setEntry(data); setLoading(false); }
        return;
      } catch {}
    }

    fetch(`/api/dictionary/${encodeURIComponent(word.toLowerCase())}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setEntry(data);
        try { localStorage.setItem(CACHE_KEY(word), JSON.stringify(data)); } catch {}
      })
      .catch(() => { if (!cancelled) setEntry({ word, notFound: true }); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [word]);

  function playAudio() {
    if (entry?.audioUrl) new Audio(entry.audioUrl).play().catch(() => {});
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(word).catch(() => {});
  }

  const pos = entry?.meanings?.[0]?.partOfSpeech;
  const definition = entry?.meanings?.[0]?.definitions?.[0]?.definition;
  const example = entry?.meanings?.[0]?.definitions?.[0]?.example;

  return (
    <div className="my-3 bg-white border border-gray-200 rounded-lg shadow-md text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        {entry?.audioUrl && (
          <button onClick={playAudio} className="text-gray-600 hover:text-[#5a8c5a]" title="Phát âm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/>
            </svg>
          </button>
        )}
        <span className="font-bold text-gray-900">{word}</span>
        {entry?.phonetic && <span className="font-mono text-gray-500">{entry.phonetic}</span>}
        {pos && <span className="text-gray-500 italic">({pos})</span>}

        <div className="ml-auto flex items-center gap-2">
          <button className="text-gray-400 hover:text-gray-700" title="Like">👍</button>
          <button className="text-gray-400 hover:text-gray-700" title="Dislike">👎</button>
          <button className="px-2 py-1 bg-[#dcfce7] text-[#168b32] rounded text-xs hover:bg-[#bbf7d0]">
            ➕ Lưu từ vựng
          </button>
          <button onClick={copyToClipboard} className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">
            📋 Sao chép
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {loading ? (
          <div className="text-gray-500 text-xs">Đang tra từ điển...</div>
        ) : entry?.notFound ? (
          <div className="text-gray-500 text-xs">
            Không tìm thấy từ "{word}" trong từ điển.
            {entry.translation && (
              <div className="mt-2"><strong>Dịch:</strong> {entry.translation}</div>
            )}
          </div>
        ) : (
          <>
            {entry?.translation && (
              <div className="text-base text-[#5a8c5a] font-semibold">{entry.translation}</div>
            )}

            {definition && (
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Definition:</div>
                <div className="text-gray-700">{definition}</div>
              </div>
            )}

            {example && (
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Ví dụ:</div>
                <div className="text-gray-700 italic">{example}</div>
              </div>
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

Trong `TranscriptPlayer.tsx`, sau khi render mỗi sentence, nếu `vocabWord` đang được chọn cho sentence đó → render `<VocabPopup>` ngay dưới:

```tsx
// In TranscriptPlayer.tsx
interface Props {
  ...
  vocabMode: boolean;
  selectedWord: { word: string; sentenceKey: string } | null;
  onWordClick: (word: string, sentenceKey: string) => void;
  onCloseVocab: () => void;
}

// Inside render:
{block.sentences.map(({ s, sen }) => {
  const key = `${p}-${s}`;
  const isActive = activeKey === key;
  const showPopup = selectedWord?.sentenceKey === key;
  return (
    <Fragment key={key}>
      <span ...> {/* sentence content */}
        {renderSentence(sen.text, vocabMode, (w) => onWordClick(w, key))}
      </span>
      {showPopup && (
        <VocabPopup
          word={selectedWord!.word}
          onClose={onCloseVocab}
        />
      )}
    </Fragment>
  );
})}
```

Trong `ListeningReviewClient.tsx`:
```tsx
<TranscriptPlayer
  ...
  vocabMode={activeTool === "vocab"}
  selectedWord={vocabWord}
  onWordClick={(w, key) => setVocabWord({ word: w, sentenceKey: key })}
  onCloseVocab={() => setVocabWord(null)}
/>
```

---

### GIAI ĐOẠN 6 — UX polish (20')

**Visual cue khi vocab mode bật:**
- Tool button `Tra từ vựng` đổi bg vàng nhạt + viền cam
- Cursor trên transcript đổi thành `cursor-help`
- Tooltip nhỏ: "Click vào từ để tra nghĩa"

```tsx
<div className={vocabMode ? "cursor-help" : ""}>
  {/* TranscriptPlayer */}
</div>
```

**Close popup on:**
- Click ngoài popup
- Press Escape
- Click từ khác → mở popup cho từ mới
- Tắt vocab mode (đổi tool) → popup tự đóng

**Lưu từ vựng (Lưu từ vựng button):**
- Lưu vào localStorage `yp_saved_vocabs` = `[{word, savedAt}, ...]`
- Hiển thị toast "Đã lưu"
- Có thể list ra sau tại trang `Sổ Từ vựng` (out of scope hiện tại)

---

### GIAI ĐOẠN 7 — Test (15')

**URL test:** `http://localhost:3000/thi-thu/listening/10006?type=review`

**Checklist:**
- [ ] Click tool `Tra từ vựng` → button highlight, cursor đổi help
- [ ] Phím tắt `T` toggle vocab mode
- [ ] Click vào từ "relatively" trong transcript → popup hiện dưới câu
- [ ] Popup load: hiện "Đang tra từ điển..." rồi hiện kết quả
- [ ] Popup: word, IPA, POS, VN translation, definition, example, audio button
- [ ] Click audio button → phát âm
- [ ] Click X → đóng popup
- [ ] Press Escape → đóng popup + tắt vocab mode
- [ ] Click từ khác khi popup đang mở → popup chuyển sang từ mới
- [ ] Tắt vocab mode → click sentence vẫn seek audio (không mở popup)
- [ ] Quay lại sau, click cùng từ → load từ cache (~0ms)
- [ ] Từ không có trong từ điển → hiện "Không tìm thấy" + có thể có translation
- [ ] Click "Lưu từ vựng" → lưu vào localStorage

**Verify:**
- `npx tsc --noEmit` pass
- Network tab: lần đầu fetch `/api/dictionary/relatively`, response ~200-500ms
- Lần 2 cùng từ: KHÔNG fetch (cache)
- `localStorage` có key `yp_dict_relatively`

---

## 📁 FILE SUMMARY

| File | Loại | GĐ |
|------|------|----|
| `web/app/api/dictionary/[word]/route.ts` | **Tạo** | 1 |
| `web/components/listening/VocabPopup.tsx` | **Tạo** | 4 |
| `web/components/listening/TranscriptPlayer.tsx` | Sửa | 3, 5 |
| `web/app/thi-thu/listening/[id]/ListeningReviewClient.tsx` | Sửa | 2, 5 |

**Tổng: 2 file mới + 2 file sửa**

---

## 🚫 KHÔNG ĐỤNG

- Exam mode, Reading, Library, Result
- `src/normalize-listening.js` (không cần thêm data)
- Other qset components

---

## 💡 IMPROVEMENTS NEXT (sau v1)

1. **Pre-fetch top 5000 words** vào `data/dictionary-common.json` → cho từ phổ biến load 0ms
2. **Trang "Sổ Từ vựng"** liệt kê các từ đã lưu
3. **Highlight từ đã tra** trong transcript (visited words)
4. **Tooltip on hover** thay vì click (nếu user thấy bất tiện)
5. **Phrase lookup** (chọn nhiều từ → tra cụm) — phức tạp, scope sau
6. **Better VN translation** — chuyển từ MyMemory sang Google Translate hoặc DeepL nếu cần chất lượng cao hơn
7. **Cache trên server** thay vì localStorage để chia sẻ giữa users

---

## ⚠️ RỦI RO

| Rủi ro | Tác động | Mitigation |
|--------|---------|------------|
| MyMemory rate limit 5000 char/ngày/IP | Translation không hoạt động | Cache mạnh ở localStorage, từng phrase cache 30 ngày |
| Dictionary API down | Popup hiện "Không tìm thấy" | Fallback chỉ hiện translation |
| Click word ở giữa highlight được audio active | Conflict UX | Khi vocab mode bật, disable sentence click-to-seek |
| Từ trong transcript có ký tự đặc biệt | Lookup fail | Strip punctuation trước khi fetch |
| User click trong câu hỏi (cột phải) | Popup không mong muốn | Chỉ enable wrap word trong TranscriptPlayer, KHÔNG trong form |

---

## 🎯 SUCCESS CRITERIA

1. ✅ Phím tắt T bật/tắt vocab mode
2. ✅ Click vào từ → popup hiện dưới câu, có IPA, POS, VN translation, audio
3. ✅ Cache hoạt động: từ đã tra load lại 0ms
4. ✅ Popup đóng được (X, Escape, click ngoài)
5. ✅ Vocab mode không phá click-to-seek của transcript (chỉ áp dụng khi tắt)
6. ✅ "Lưu từ vựng" lưu vào localStorage
7. ✅ Audio pronunciation phát đúng từ
8. ✅ Từ không trong từ điển vẫn hiện popup (Không tìm thấy + translation nếu có)
9. ✅ TypeScript pass
10. ✅ Không ảnh hưởng exam mode hay tính năng cũ

---

## 🎬 THỨ TỰ KHUYẾN NGHỊ

1. **GĐ 1 (30')** — API proxy (test bằng curl trước khi làm UI)
2. **GĐ 4 (45')** — VocabPopup standalone (test render với mock data)
3. **GĐ 2 (15')** — Tool state + phím tắt
4. **GĐ 3 (30')** — Wrap words clickable
5. **GĐ 5 (30')** — Wire popup vào TranscriptPlayer
6. **GĐ 6 (20')** — UX polish
7. **GĐ 7 (15')** — Test

**Tổng:** ~3h
