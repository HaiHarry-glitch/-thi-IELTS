# PLAN — Listening Review UI (Full detailed)

> **Ngày:** 2026-05-13
> **Scope:** Chỉ `/thi-thu/listening/[id]?type=review` (trang giải thích Listening)
> **KHÔNG đụng:** Exam mode, Reading, Library, Result, question renderer (qset/*)
> **Tổng thời gian:** ~3h · **6 files mới + 3 files sửa**
> **Phong cách đích:** Y hệt giao diện YouPass gốc trong ảnh tham chiếu

---

## 📸 UI THAM CHIẾU (mô tả chi tiết để rebuild)

User gửi 3 screenshot từ YouPass gốc (`e-learning.youpass.vn/practice/listening/10492?type=review`).
Đây là vẻ ngoài đích — phải bám sát.

### Layout tổng thể (kích thước desktop)

```
┌─────────────────────────────────────────────────────────────────────┐
│ TOP NAV (YouPass tabs)                              [PRO] [👤] [🔔]  │ ← cao 48px, border-b xám
├─────────────────────────────────────────────────────────────────────┤
│ [X] | 00:00:04 | 0/10 câu đúng | [Xem note] [Cài đặt] [Chia sẻ]    │ ← cao 48px, action bar
├─────────────────────────────────────────────────────────────────────┤
│ ┌────┐                                                              │
│ │TOOL│      [Focus theo từ ◯/●] (toggle góc trên phải transcript)   │
│ │RAIL│  ┌───────────────────────────────┬─────────────────────────┐ │
│ │    │  │                               │                         │ │
│ │ 🎨 │  │  TRANSCRIPT                   │  FORM/QUESTIONS         │ │
│ │ Hi │  │                               │                         │ │
│ │ ─  │  │  Receptionist: Wildlife       │  Questions 1 - 10       │ │
│ │ 📝 │  │  Conservation Society.        │  Complete the form...   │ │
│ │ No │  │  Good afternoon...            │                         │ │
│ │ ─  │  │                               │  ┌─────────────────────┐│ │
│ │ Aあ│  │  Caller: Oh, hello.           │  │ Wildlife Cons. Soc. ││ │
│ │ Tra│  │  Yes. I'd like to join...     │  │ Application for...  ││ │
│ │    │  │                               │  ├──────┬──────────────┤│ │
│ │    │  │  [highlighted xanh = đang     │  │Heard │ ▶1 ✕→radio  ││ │
│ │    │  │   nghe đến đoạn này]          │  │of WCS│              ││ │
│ │    │  │                               │  ├──────┼──────────────┤│ │
│ │    │  │  ...                          │  │Address│21 Beel...   ││ │
│ │    │  │                               │  ├──────┴──────────────┤│ │
│ │    │  │                               │  │ [Xem vị trí] popup  ││ │
│ │    │  │                               │  ├─────────────────────┤│ │
│ │    │  │                               │  │Postcode ▶2 ✕→LS142..││ │
│ │    │  └───────────────────────────────┴─────────────────────────┘ │
│ │    │                                                              │
├─┴────┴──────────────────────────────────────────────────────────────┤
│ ⟲5 ▶/⏸ 5⟳ ━━━━●━━━━━━━━ 00:47/04:14 🔊━━━ [1x▼]                    │ ← audio bar
├─────────────────────────────────────────────────────────────────────┤
│  Pagination:  1  2  3  4  5  6  7  8  9  10                         │ ← question dots
└─────────────────────────────────────────────────────────────────────┘
```

### Chi tiết visual (từ ảnh)

**Top action bar (xám nhạt):**
- `[X]` close button: hình tròn 28x28 viền xám
- Timer: `00:00:04` mono font
- Score: `0/10 câu đúng` (cam khi >0)
- 3 button bên phải: `Xem note`, `Cài đặt`, `Chia sẻ bài làm` (text trắng, nền cam nhạt khi hover)

**Tool rail trái (cột mảnh ~64px):**
- 🎨 **Highlight** (`Phím (H)`) — icon bút lông
- 📝 **Notes** (`Phím (N)`) — icon giấy ghi
- Aあ **Tra từ vựng** (`Phím (T)`) — icon dictionary
- Mỗi item: icon trên + tên dưới + nhỏ "Phím (X)"
- Phần background: tab cam nhạt khi active, trắng khi inactive
- Có nút công cụ riêng (cờ xanh) phía trên

**Transcript area (cột trái lớn):**
- Header: toggle `Focus theo từ` (góc phải trên)
- Speaker labels: **màu xanh `#5a8c5a`**, in đậm, căn phải
- Speaker label width fixed ~96px, text-right
- Sentences: text đen, leading-relaxed
- **Active sentence (theo audio):** background `#a4d8a4`/40 opacity (xanh lá nhạt), rounded pill nhẹ
- **Hover sentence:** background `#fef3c7` (vàng nhạt) khi có timestamp
- **Focused range (sau khi click "Xem vị trí"):** background `#a4d8a4`/30, sáng pulse 2 lần rồi giữ

**Form/Question area (cột phải):**
- Title: `Questions 1 - 10` (bold đen, text-xl)
- Instruction: `Complete the form below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.`
- **Form table render giống bài thi gốc** (giữ structure NOTE_COMPLETION / TABLE_SELECTION)
- Form cell có border xám nhạt `#e5e7eb`
- Mỗi câu trả lời row có:
  - `▶N` — nút tròn cam `#ff7c2b`, kích thước 24x24, text-white, số N bên trong
  - `✕` — chữ X đỏ `#ef4444` nếu sai (ẩn nếu đúng)
  - Đáp án user: `<text>` (gạch ngang `line-through text-gray-400` nếu sai)
  - `→` — mũi tên xám
  - Đáp án đúng: text xanh `#5a8c5a` đậm
  - 📍 nút "Xem vị trí" (xanh lá nhạt, tooltip "Xem vị trí")

**Audio bar (sticky bottom):**
- Background trắng, border-t xám
- `⟲5` `▶/⏸` (nút tròn cam đỏ ~40px) `5⟳`
- Time display: `00:47 / 04:14` (mono, xám)
- Progress bar: thanh cam `#ff7c2b`, có thumb
- Volume: `🔊` + slider mini
- Speed dropdown: `1x` (border xám nhạt, text xs)

**Bottom pagination:**
- Hàng nhỏ phía dưới audio bar
- Số 1 - 10 căn giữa, mỗi số là pill nhỏ
- Active: nền cam, text trắng

---

## 📊 DATA AUDIT (đã verified)

```
Raw quizzes: 638 | Unavailable: 1 | Usable: 637
Parts with audio: 637 / 637                    ← 100%
Parts with sentence timing: 368 / 637          ← 57%
Raw questions: 4786
  - with locate_info: 3566                     ← 74%
  - with time_ranges: 2150                     ← 44%
  - with paragraph_ranges: 3437                ← 71%
Normalized questions: 6158
  - with locateInfo: 3566
  - with time_ranges: 2150
  - with paragraph_ranges: 3437
```

### Coverage strategy

| Trường hợp | Hiển thị |
|------------|----------|
| Quiz có đầy đủ timing (như `10006`) | Full feature: locate, click-seek, sync highlight |
| Quiz có audio nhưng KHÔNG có sentence timing | Hiện `transcriptHtml` fallback, ẩn highlight, ẩn click-seek |
| Câu hỏi có `time_ranges` | Hiện nút `▶N` locate |
| Câu hỏi có `paragraph_ranges` (nhưng không `time_ranges`) | Hiện nút "Xem vị trí" (không hiện locate ▶) |
| Câu hỏi thiếu cả 2 | Ẩn cả locate và Xem vị trí, vẫn show user/correct answer |

**Quy tắc:** Không bao giờ làm vỡ UI khi thiếu data → mọi feature có graceful fallback.

---

## 🎨 DESIGN TOKENS (giữ thống nhất YouPass classic, không phải HIN)

> Trang review này dùng **YouPass classic look** vì user muốn "y hệt ảnh gốc".  
> KHÁC với landing/library đã chuyển sang HIN.

```css
/* Colors */
--review-bg:        #ffffff;
--review-cream:     #fafaf5;
--review-border:    #e5e7eb;
--review-border-2:  #c1c1c1;
--review-text:      #1f2937;
--review-muted:     #6b7280;

/* Speaker + transcript */
--speaker-green:    #5a8c5a;       /* Speaker label */
--highlight-active: #a4d8a4;       /* Active sentence (40% opacity) */
--highlight-focus:  #a4d8a4;       /* Focused range (30% opacity) */
--highlight-hover:  #fef3c7;       /* Hover sentence */

/* Buttons + answers */
--accent-orange:    #ff7c2b;       /* Play, progress, score >0 */
--wrong-red:        #ef4444;       /* ✕ wrong indicator */
--correct-green:    #5a8c5a;       /* Correct answer text */

/* Audio bar */
--audio-bg:         #ffffff;
--audio-progress:   #ff7c2b;
```

---

## 🛠 IMPLEMENTATION — 8 GIAI ĐOẠN

### GIAI ĐOẠN 1 — Mở rộng normalize (20')

**File:** `src/normalize-listening.js`

Thêm function `reconstructTranscriptSegments(part)`:

```js
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
          text: s.value,
          from: s.meta?.from ?? null,
          to: s.meta?.to ?? null,
          speaker: s.meta?.speaker ?? null,
        });
      }
    }
    if (sentences.length) segments.push({ paragraph: paraIdx++, sentences });
  }
  // Return null if NO sentence has timing (caller falls back to transcriptHtml)
  const hasAnyTiming = segments.some(p => p.sentences.some(s => s.from != null));
  return hasAnyTiming ? segments : null;
}
```

Trong `normalizePart`, thêm:
```js
return {
  ...,
  transcriptHtml: reconstructTranscript(part),
  transcriptSegments: reconstructTranscriptSegments(part),
  ...
};
```

**Verify:**
```powershell
node src\normalize-listening.js
node -e "const d=JSON.parse(require('fs').readFileSync('./data/normalized-listening/10006.json','utf8'));console.log('segments count:', d.parts[0].transcriptSegments?.length);console.log('first sentence:', d.parts[0].transcriptSegments?.[0].sentences[0])"
```

Mong đợi:
```
segments count: 22
first sentence: { text: 'Director: Welcome...', from: 46.1, to: 50.98, speaker: 'Speaker 1' }
```

---

### GIAI ĐOẠN 2 — Type updates (10')

**File:** `web/lib/data.ts`

Thêm:
```ts
export interface TranscriptSentence {
  text: string;
  from: number | null;
  to: number | null;
  speaker: string | null;
}

export interface TranscriptParagraph {
  paragraph: number;
  sentences: TranscriptSentence[];
}

export interface QuestionLocateInfo {
  time_ranges?: { from: number; to: number } | null;
  paragraph_ranges?: Array<{
    start: { paragraph: number; sentence: number; index: number };
    end:   { paragraph: number; sentence: number; index: number };
  }> | null;
}
```

Update `NormalizedPart`:
```ts
export interface NormalizedPart {
  ...
  transcriptHtml: string;
  transcriptSegments?: TranscriptParagraph[] | null;  // ← THÊM
  ...
}
```

Update `Question`:
```ts
export interface Question {
  ...
  locateInfo?: QuestionLocateInfo | null;
}
```

Verify: `cd web && npx tsc --noEmit` → 0 errors.

---

### GIAI ĐOẠN 3 — Tách review ra component riêng (15')

**File:** `web/app/thi-thu/listening/[id]/page.tsx`

```tsx
import { getListeningQuiz } from "@/lib/data";
import { notFound } from "next/navigation";
import ListeningClient from "./ListeningClient";
import ListeningReviewClient from "./ListeningReviewClient";

export default async function ListeningExamPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const quiz = getListeningQuiz(Number(id));
  if (!quiz || quiz.unavailable) notFound();

  if (sp.type === "review") {
    return <ListeningReviewClient quiz={quiz} />;
  }
  return <ListeningClient quiz={quiz} mode="exam" />;
}
```

> Lý do: tránh chia nhánh `isReview` chằng chịt trong ListeningClient. Exam mode giữ NGUYÊN.

---

### GIAI ĐOẠN 4 — ReviewAudioPlayer (30')

**Tạo:** `web/components/listening/ReviewAudioPlayer.tsx`

```tsx
"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface ReviewAudioPlayerHandle {
  seek: (time: number) => void;
  getAudioEl: () => HTMLAudioElement | null;
}

interface Props { src: string }

const fmt = (t: number) =>
  isFinite(t) ? `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "00:00";

const ReviewAudioPlayer = forwardRef<ReviewAudioPlayerHandle, Props>(
  function ReviewAudioPlayer({ src }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [rate, setRate] = useState(1);
    const [vol, setVol] = useState(1);

    useImperativeHandle(ref, () => ({
      seek: (t) => {
        const a = audioRef.current; if (!a) return;
        a.currentTime = Math.max(0, Math.min(duration || 99999, t));
        a.play().catch(() => {});
      },
      getAudioEl: () => audioRef.current,
    }), [duration]);

    useEffect(() => {
      const a = audioRef.current; if (!a) return;
      const onTime = () => setTime(a.currentTime);
      const onDur = () => setDuration(a.duration);
      const onPlay = () => setPlaying(true);
      const onPause = () => setPlaying(false);
      a.addEventListener("timeupdate", onTime);
      a.addEventListener("loadedmetadata", onDur);
      a.addEventListener("play", onPlay);
      a.addEventListener("pause", onPause);
      return () => {
        a.removeEventListener("timeupdate", onTime);
        a.removeEventListener("loadedmetadata", onDur);
        a.removeEventListener("play", onPlay);
        a.removeEventListener("pause", onPause);
      };
    }, []);

    const toggle = () => {
      const a = audioRef.current; if (!a) return;
      if (playing) a.pause(); else a.play();
    };
    const rewind = () => { const a = audioRef.current; if (a) a.currentTime = Math.max(0, a.currentTime - 5); };
    const forward = () => { const a = audioRef.current; if (a) a.currentTime = Math.min(duration, a.currentTime + 5); };
    const seekTo = (t: number) => { const a = audioRef.current; if (a) a.currentTime = t; };
    const setRateVal = (r: number) => { setRate(r); const a = audioRef.current; if (a) a.playbackRate = r; };
    const setVolVal = (v: number) => { setVol(v); const a = audioRef.current; if (a) a.volume = v; };

    return (
      <div className="border-t border-[#e5e7eb] bg-white px-6 py-3 flex items-center gap-3 shrink-0">
        <audio ref={audioRef} src={src} preload="auto" />

        {/* Rewind 5s */}
        <button onClick={rewind} className="w-9 h-9 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded" title="-5s">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5L4 12l7 7" /><text x="14" y="16" fontSize="10" fill="currentColor" stroke="none">5</text>
          </svg>
        </button>

        {/* Play/Pause */}
        <button onClick={toggle} className="w-11 h-11 rounded-full bg-[#ff7c2b] text-white flex items-center justify-center hover:bg-[#e96a18]">
          {playing ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
          ) : (
            <svg className="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        {/* Forward 5s */}
        <button onClick={forward} className="w-9 h-9 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded" title="+5s">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 5l7 7-7 7" /><text x="2" y="16" fontSize="10" fill="currentColor" stroke="none">5</text>
          </svg>
        </button>

        {/* Time */}
        <span className="font-mono text-xs text-gray-600 min-w-[88px]">{fmt(time)} / {fmt(duration)}</span>

        {/* Progress */}
        <input type="range" min={0} max={duration || 0} step={0.1} value={time}
          onChange={(e) => seekTo(parseFloat(e.target.value))}
          className="flex-1 accent-[#ff7c2b] h-1" />

        {/* Volume */}
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3z" />
          </svg>
          <input type="range" min={0} max={1} step={0.05} value={vol}
            onChange={(e) => setVolVal(parseFloat(e.target.value))}
            className="w-16 accent-gray-500 h-1" />
        </div>

        {/* Speed */}
        <select value={rate} onChange={(e) => setRateVal(parseFloat(e.target.value))}
          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white">
          {[0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r}>{r}x</option>)}
        </select>
      </div>
    );
  }
);

export default ReviewAudioPlayer;
```

---

### GIAI ĐOẠN 5 — TranscriptPlayer (45')

**Tạo:** `web/components/listening/TranscriptPlayer.tsx`

Yêu cầu:
- Render từng paragraph với speaker label (xanh, căn phải, width 96px)
- Mỗi sentence là `<span>` clickable nếu có `from`
- Lắng nghe `timeupdate` từ audioEl → tìm sentence khớp → highlight
- Auto-scroll active sentence vào view
- Fallback: nếu segments null → render `transcriptHtml` cũ

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { TranscriptParagraph } from "@/lib/data";

interface Props {
  segments: TranscriptParagraph[] | null;
  fallbackHtml: string;
  audioEl: HTMLAudioElement | null;
  onSeek: (seconds: number) => void;
  focusedRange: { from: number; to: number } | null;
}

export default function TranscriptPlayer({ segments, fallbackHtml, audioEl, onSeek, focusedRange }: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!audioEl || !segments) return;
    const onTime = () => {
      const t = audioEl.currentTime;
      for (let p = 0; p < segments.length; p++) {
        const sents = segments[p].sentences;
        for (let s = 0; s < sents.length; s++) {
          const sen = sents[s];
          if (sen.from != null && sen.to != null && t >= sen.from && t < sen.to) {
            setActiveKey(`${p}-${s}`); return;
          }
        }
      }
      setActiveKey(null);
    };
    audioEl.addEventListener("timeupdate", onTime);
    return () => audioEl.removeEventListener("timeupdate", onTime);
  }, [audioEl, segments]);

  // Auto-scroll active sentence
  useEffect(() => {
    if (!activeKey || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-key="${activeKey}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeKey]);

  // Scroll to focused range when "Xem vị trí" clicked
  useEffect(() => {
    if (!focusedRange || !segments || !containerRef.current) return;
    for (let p = 0; p < segments.length; p++) {
      const sents = segments[p].sentences;
      for (let s = 0; s < sents.length; s++) {
        const sen = sents[s];
        if (sen.from != null && sen.to != null &&
            sen.to > focusedRange.from && sen.from < focusedRange.to) {
          const el = containerRef.current.querySelector(`[data-key="${p}-${s}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }
    }
  }, [focusedRange, segments]);

  // Fallback when no segments
  if (!segments || !segments.length) {
    return (
      <div className="passage-html text-sm leading-relaxed text-gray-700"
        dangerouslySetInnerHTML={{ __html: fallbackHtml }} />
    );
  }

  return (
    <div ref={containerRef} className="space-y-4 text-sm leading-relaxed">
      {segments.map((para, p) => {
        // Group consecutive same-speaker sentences
        const blocks: Array<{ speaker: string; sentences: Array<{ s: number; sen: typeof para.sentences[0] }> }> = [];
        para.sentences.forEach((sen, s) => {
          const spk = sen.speaker || "";
          const last = blocks[blocks.length - 1];
          if (last && last.speaker === spk) last.sentences.push({ s, sen });
          else blocks.push({ speaker: spk, sentences: [{ s, sen }] });
        });

        return blocks.map((block, bi) => (
          <div key={`${p}-${bi}`} className="flex gap-4">
            <div className="w-24 shrink-0 text-right pt-0.5">
              {block.speaker && (
                <span className="text-[#5a8c5a] font-semibold">{block.speaker}:</span>
              )}
            </div>
            <div className="flex-1">
              {block.sentences.map(({ s, sen }) => {
                const key = `${p}-${s}`;
                const isActive = activeKey === key;
                const isFocused = focusedRange && sen.from != null && sen.to != null &&
                  sen.to > focusedRange.from && sen.from < focusedRange.to;
                const clickable = sen.from != null;
                return (
                  <span
                    key={key}
                    data-key={key}
                    onClick={() => clickable && onSeek(sen.from!)}
                    className={[
                      "transition-colors px-0.5 -mx-0.5 rounded",
                      clickable ? "cursor-pointer hover:bg-[#fef3c7]" : "",
                      isActive ? "bg-[#a4d8a4]/50" : "",
                      isFocused && !isActive ? "bg-[#a4d8a4]/30" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    {sen.text}{" "}
                  </span>
                );
              })}
            </div>
          </div>
        ));
      })}
    </div>
  );
}
```

---

### GIAI ĐOẠN 6 — ReviewAnswerRow (25')

**Tạo:** `web/components/listening/ReviewAnswerRow.tsx`

Render INLINE bên trong cell của form (không phải dạng row riêng).
Có 2 mode hiển thị:
- **Inline mode** (cho form/table): show trong cell `▶N ✕ → answer`
- **Standalone mode** (cho list): show row riêng với border

Bắt đầu với inline:

```tsx
"use client";

interface Props {
  order: number;
  userAnswer: string | undefined;
  correctAnswer: string;
  isCorrect: boolean;
  locateFrom: number | null;        // null = ẩn nút play
  hasParagraphRange: boolean;       // true = show "Xem vị trí"
  onPlayLocate: () => void;
  onShowLocation: () => void;
}

export default function ReviewAnswerRow({
  order, userAnswer, correctAnswer, isCorrect, locateFrom, hasParagraphRange,
  onPlayLocate, onShowLocation,
}: Props) {
  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {locateFrom != null ? (
        <button
          onClick={onPlayLocate}
          className="w-6 h-6 rounded-full bg-[#ff7c2b] text-white flex items-center justify-center text-[10px] font-bold hover:bg-[#e96a18]"
          title={`Play from ${Math.floor(locateFrom)}s`}
        >
          <svg className="w-2.5 h-2.5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      ) : (
        <span className="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-gray-500">
          {order}
        </span>
      )}
      {locateFrom != null && <span className="text-[10px] font-bold text-gray-700">{order}</span>}

      {/* User wrong indicator */}
      {!isCorrect && userAnswer ? (
        <span className="text-[#ef4444]">✕</span>
      ) : null}

      {/* User answer (struck-through if wrong) */}
      {userAnswer ? (
        <span className={isCorrect ? "text-[#5a8c5a]" : "line-through text-gray-400 text-sm"}>
          {userAnswer}
        </span>
      ) : null}

      <span className="text-gray-400">→</span>

      {/* Correct answer */}
      <span className="text-[#5a8c5a] font-medium text-sm">{correctAnswer}</span>

      {/* Locate icon (paragraph_ranges) */}
      {hasParagraphRange && (
        <button
          onClick={onShowLocation}
          className="text-[#5a8c5a] hover:bg-[#a4d8a4]/30 rounded p-0.5"
          title="Xem vị trí"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
          </svg>
        </button>
      )}
    </div>
  );
}
```

---

### GIAI ĐOẠN 7 — ListeningReviewClient layout (45')

**Tạo:** `web/app/thi-thu/listening/[id]/ListeningReviewClient.tsx`

Đây là component lớn nhất. Layout:
- Top action bar (score, buttons)
- Tool rail left (Highlight, Notes, Tra từ vựng)
- Main grid: transcript LEFT (3/5) | questions RIGHT (2/5)
- Sticky audio bar bottom
- Question number pagination bottom

Key behaviors:
- State: `activePart`, `answers`, `focusedRange`, `audioEl`
- Effect: load answers from localStorage on mount
- Effect: after audio mount, capture audioEl via ref
- `seekTo(t)` → audioPlayerRef.seek(t)
- `showLocation(q)` → setFocusedRange + seekTo(time_ranges.from)
- For each questionSet: render QSetRenderer (review mode) PLUS ReviewAnswerRow per question

Skeleton:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NormalizedQuiz, Question } from "@/lib/data";
import type { Answers } from "@/components/qset/types";
import QSetRenderer from "@/components/qset/QSetRenderer";
import TranscriptPlayer from "@/components/listening/TranscriptPlayer";
import ReviewAudioPlayer, { type ReviewAudioPlayerHandle } from "@/components/listening/ReviewAudioPlayer";
import ReviewAnswerRow from "@/components/listening/ReviewAnswerRow";
import { isCorrect } from "@/components/qset/AnswerStatus";
import { getCorrect } from "@/components/qset/types";

const STORAGE_KEY = (id: number) => `yp_answers_${id}`;

export default function ListeningReviewClient({ quiz }: { quiz: NormalizedQuiz }) {
  const audioPlayerRef = useRef<ReviewAudioPlayerHandle>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [activePart, setActivePart] = useState(0);
  const [focusedRange, setFocusedRange] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY(quiz.id));
    if (saved) { try { setAnswers(JSON.parse(saved)); } catch {} }
  }, [quiz.id]);

  // Capture audio element after mount
  useEffect(() => {
    const tid = setInterval(() => {
      const el = audioPlayerRef.current?.getAudioEl();
      if (el) { setAudioEl(el); clearInterval(tid); }
    }, 50);
    return () => clearInterval(tid);
  }, []);

  const part = quiz.parts[activePart];
  const allQuestions = quiz.parts.flatMap(p => p.questionSets.flatMap(qs => qs.questions));
  
  // Compute score
  let correctCount = 0, totalCount = allQuestions.length;
  for (const q of allQuestions) {
    const ca = getCorrect(q as Question);
    const ua = answers[q.id] as string | string[] | undefined;
    const has = ua !== undefined && ua !== "" && !(Array.isArray(ua) && ua.length === 0);
    if (has && isCorrect(ua, ca)) correctCount++;
  }

  function seekTo(t: number) { audioPlayerRef.current?.seek(t); }
  function showLocation(q: any) {
    const tr = q.locateInfo?.time_ranges;
    if (tr?.from != null && tr?.to != null) {
      setFocusedRange({ from: tr.from, to: tr.to });
      seekTo(tr.from);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top YouPass-style header */}
      <header className="border-b border-[#e5e7eb] px-4 py-2 flex items-center gap-4 shrink-0 bg-white">
        <Link href={`/luyen-thi/ielts/listening`} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100">
          <span className="text-gray-500">✕</span>
        </Link>
        <span className="font-mono text-sm text-gray-700">00:00:04</span>
        <span className="text-sm">
          <strong className={correctCount > 0 ? "text-[#ff7c2b]" : "text-gray-700"}>{correctCount}/{totalCount}</strong>
          <span className="text-gray-500"> câu đúng</span>
        </span>
        <div className="ml-auto flex gap-2 text-sm">
          <button className="px-3 py-1.5 bg-[#fef3c7] text-gray-700 rounded hover:bg-[#fde68a]">📝 Xem note</button>
          <button className="px-3 py-1.5 hover:bg-gray-100 rounded">⚙️ Cài đặt</button>
          <button className="px-3 py-1.5 bg-[#5a8c5a] text-white rounded hover:bg-[#4a7c4a]">🔗 Chia sẻ bài làm</button>
        </div>
      </header>

      {/* Part tabs */}
      {quiz.parts.length > 1 && (
        <div className="flex border-b border-[#e5e7eb] bg-white shrink-0">
          {quiz.parts.map((p, idx) => (
            <button key={p.id} onClick={() => setActivePart(idx)}
              className={`px-6 py-2 text-sm font-medium transition-colors ${
                idx === activePart ? "border-b-2 border-[#ff7c2b] text-[#ff7c2b]" : "text-gray-600 hover:text-[#ff7c2b]"
              }`}>
              Part {idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tool rail */}
        <aside className="w-16 border-r border-[#e5e7eb] bg-white shrink-0 flex flex-col items-center py-3 gap-3 text-[10px] text-gray-600">
          <button className="w-12 h-12 bg-[#5a8c5a] rounded flex items-center justify-center text-white">▶</button>
          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:text-[#ff7c2b]">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" />
            </svg>
            <span className="font-semibold">Highlight</span>
            <span>Phím (H)</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:text-[#ff7c2b]">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="font-semibold">Notes</span>
            <span>Phím (N)</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 cursor-pointer hover:text-[#ff7c2b]">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            <span className="font-semibold">Tra từ vựng</span>
            <span>Phím (T)</span>
          </div>
        </aside>

        {/* Two columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* Transcript (LEFT) */}
          <div className="w-3/5 overflow-y-auto p-6 border-r border-[#e5e7eb] bg-white">
            {part.title && <h2 className="text-center font-bold text-base mb-4">{part.title}</h2>}
            <TranscriptPlayer
              segments={part.transcriptSegments ?? null}
              fallbackHtml={part.transcriptHtml || ""}
              audioEl={audioEl}
              onSeek={seekTo}
              focusedRange={focusedRange}
            />
          </div>

          {/* Questions (RIGHT) */}
          <div className="w-2/5 overflow-y-auto p-6 bg-white">
            {part.questionSets.map((qs) => (
              <div key={qs.id} className="mb-8">
                <h3 className="font-bold text-base mb-2">{qs.title}</h3>
                {qs.instructionHtml && (
                  <div className="text-sm text-gray-700 mb-3" dangerouslySetInnerHTML={{ __html: qs.instructionHtml }} />
                )}

                {/* Original form/table render */}
                <QSetRenderer qs={qs as any} answers={answers} onAnswer={() => {}} mode="review" />

                {/* Per-question review row list */}
                <div className="mt-4 space-y-2">
                  {qs.questions.map((q: any) => {
                    const ca = getCorrect(q);
                    const ua = answers[q.id] as string | string[] | undefined;
                    const has = ua !== undefined && ua !== "" && !(Array.isArray(ua) && ua.length === 0);
                    const ok = has && isCorrect(ua, ca);
                    const caStr = Array.isArray(ca) ? ca.join(" / ") : (ca ?? "");
                    const uaStr = Array.isArray(ua) ? ua.join(", ") : (ua ?? "");
                    const locFrom = q.locateInfo?.time_ranges?.from ?? null;
                    const hasParaRange = !!q.locateInfo?.paragraph_ranges?.length;
                    return (
                      <div key={q.id} className="text-sm">
                        <ReviewAnswerRow
                          order={q.order}
                          userAnswer={has ? uaStr : undefined}
                          correctAnswer={String(caStr)}
                          isCorrect={!!ok}
                          locateFrom={locFrom}
                          hasParagraphRange={hasParaRange}
                          onPlayLocate={() => locFrom != null && seekTo(locFrom)}
                          onShowLocation={() => showLocation(q)}
                        />
                        {q.explanationHtml && (
                          <details className="ml-7 mt-1 text-xs text-gray-600">
                            <summary className="cursor-pointer text-[#5a8c5a] hover:underline">Giải thích</summary>
                            <div className="mt-1 pl-2 border-l-2 border-[#a4d8a4]" dangerouslySetInnerHTML={{ __html: q.explanationHtml }} />
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audio bar */}
      {part.audioUrl && <ReviewAudioPlayer ref={audioPlayerRef} src={part.audioUrl} />}

      {/* Question pagination dots */}
      <div className="border-t border-[#e5e7eb] bg-white py-2 px-6 flex items-center justify-center gap-2 shrink-0">
        {allQuestions.map((q: any) => {
          const ua = answers[q.id];
          const has = ua !== undefined && ua !== "" && !(Array.isArray(ua) && ua.length === 0);
          const ca = getCorrect(q as Question);
          const ok = has && isCorrect(ua, ca);
          return (
            <span key={q.id} className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold border ${
              ok ? "bg-[#5a8c5a] text-white border-[#5a8c5a]" :
              has ? "bg-[#ef4444] text-white border-[#ef4444]" :
              "bg-white text-gray-500 border-gray-300"
            }`}>{q.order}</span>
          );
        })}
      </div>
    </div>
  );
}
```

---

### GIAI ĐOẠN 8 — Test + verify (15')

**Test 4 URL:**

| URL | Coverage kỳ vọng |
|-----|------------------|
| `/thi-thu/listening/10006?type=review` | Full timing → đầy đủ tính năng |
| `/thi-thu/listening/1369?type=review` | Có timing → đầy đủ |
| `/thi-thu/listening/9969?type=review` | Part 3, có timing → đầy đủ |
| `/thi-thu/listening/1003?type=review` | Part 2 (orders 11-20) → kiểm tra Part shift |

**Checklist mỗi URL:**

- [ ] Click vào sentence trong transcript → audio jump đến giây đó + play
- [ ] Audio chạy → câu hiện tại highlight `#a4d8a4`/50 (xanh nhạt)
- [ ] Auto-scroll: transcript tự cuộn đến câu đang nghe
- [ ] Click locate `▶N` button trên câu hỏi → audio jump đến `time_ranges.from`
- [ ] Click 📍 "Xem vị trí" → transcript scroll + highlight đoạn `paragraph_ranges`
- [ ] Audio bar: play/pause, ⟲5/5⟳, time `mm:ss / mm:ss`, progress slider, volume, speed
- [ ] Score đúng (`X/N câu đúng`) trong header
- [ ] Question dots dưới cùng: xanh = đúng, đỏ = sai, trắng = bỏ
- [ ] Click question dot → scroll đến câu? (optional)
- [ ] Exam mode `/thi-thu/listening/10006` (KHÔNG `?type=review`) vẫn dùng overlay click-to-play như cũ

**Quizzes không có sentence timing (fallback test):**
- Tìm 1 quiz có `audioUrl` nhưng `transcriptSegments=null` → mở review → đảm bảo:
  - Hiển thị `transcriptHtml` cũ
  - Không có highlight chạy theo audio
  - Audio bar vẫn hoạt động
  - Locate buttons vẫn show nếu có `time_ranges`

**Verify TS:**
```powershell
cd web
npx tsc --noEmit
```

**Verify audit không regression:**
```powershell
node src\audit-listening-data.js
```
Mong đợi: 637 OK / 1 unavailable / 0 broken.

---

## 📁 FILE SUMMARY

| File | Loại | Mô tả |
|------|------|-------|
| `src/normalize-listening.js` | Sửa | Thêm `reconstructTranscriptSegments` + field `transcriptSegments` |
| `web/lib/data.ts` | Sửa | Thêm types `TranscriptSentence`, `TranscriptParagraph`, `QuestionLocateInfo` |
| `web/app/thi-thu/listening/[id]/page.tsx` | Sửa | Route `?type=review` → `ListeningReviewClient` |
| `web/app/thi-thu/listening/[id]/ListeningReviewClient.tsx` | **Tạo** | Compose layout |
| `web/components/listening/TranscriptPlayer.tsx` | **Tạo** | Click + sync highlight + scroll |
| `web/components/listening/ReviewAudioPlayer.tsx` | **Tạo** | Full audio bar |
| `web/components/listening/ReviewAnswerRow.tsx` | **Tạo** | Inline answer review row |

**Tổng: 4 file mới + 3 file sửa**

---

## 🚫 KHÔNG ĐỤNG (giữ nguyên)

- `web/app/thi-thu/listening/[id]/ListeningClient.tsx` (exam mode)
- `web/components/AudioPlayer.tsx` (exam overlay player)
- `web/components/qset/*` (tất cả question renderer)
- `web/components/HighlightLayer.tsx`, `NotesPanel.tsx`, `NotesContext.tsx`
- Reading exam/review/practice pages
- Landing, library, result pages

---

## ✅ SUCCESS CRITERIA

1. ✅ Quiz có timing đầy đủ (`10006`): cả 3 tính năng (locate, sync highlight, click-to-seek) hoạt động
2. ✅ Quiz thiếu timing: fallback `transcriptHtml`, không vỡ UI, ẩn locate buttons hợp lý
3. ✅ Audio player: đủ controls (play/pause/⟲5/5⟳/progress/volume/speed)
4. ✅ Click sentence → audio seek + play
5. ✅ Audio chạy → sentence được bôi xanh `#a4d8a4`/50, auto-scroll vào view
6. ✅ Click locate `▶N` → seek đến `time_ranges.from`
7. ✅ Click 📍 "Xem vị trí" → transcript scroll + highlight đoạn `paragraph_ranges`
8. ✅ Score header đếm đúng số câu đúng/sai
9. ✅ Question dots: xanh/đỏ/trắng đúng theo trạng thái
10. ✅ Exam mode `/thi-thu/listening/[id]` KHÔNG bị ảnh hưởng
11. ✅ TypeScript: 0 errors
12. ✅ Audit data: vẫn 637 OK / 1 unavailable / 0 broken

---

## 🎯 THỰC HIỆN

Reply **"Áp luôn"** → tôi làm cả 8 giai đoạn (~3h).

Reply **"Mock GĐ4+5 trước"** → tôi làm ReviewAudioPlayer + TranscriptPlayer mẫu trên 1 page test để duyệt vibe, sau đó rollout đầy đủ.

Reply **"Skip GĐ7 chi tiết"** → bỏ qua tool rail trái + question dots, chỉ cần transcript + audio + answer review row.
