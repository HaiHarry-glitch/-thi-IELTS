# PLAN — Fix Listening Review UI (match YouPass gốc)

> **Tham chiếu:** `docs/UI_REFERENCE_LISTENING_REVIEW.md` (mô tả chi tiết UI đích)
> **Ảnh mẫu:** `docs/assets/youpass-review-reference.png` (user lưu thủ công)
> **Scope:** Fix `web/app/thi-thu/listening/[id]/ListeningReviewClient.tsx` và 1-2 component liên quan
> **KHÔNG đụng:** Exam mode, Reading, Library, normalize data
> **Tổng thời gian:** ~2h · **2 files mới + 4 files sửa**

---

## 🐛 LỖI HIỆN TẠI (từ screenshot dự án)

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | "Questions 31-40" header hiển thị **2 lần** (page-level + qs.title) | 🔴 Critical |
| 2 | "Complete the notes below…" instruction **2 lần** (page-level + qs.instructionHtml) | 🔴 Critical |
| 3 | `ReviewAnswerRow` list dưới form **trùng** với `AnswerStatus` của QSetRenderer | 🔴 Critical |
| 4 | Form vẫn render `<input>` rỗng trong review mode (đáng lẽ thay bằng `▶N ✕→answer`) | 🟡 Major |
| 5 | Tool rail có `Translate` (không có chức năng), thiếu `Highlight` | 🟡 Major |
| 6 | Top nav band thiếu các tab YouPass (My Homepage, Sổ Từ vựng, IELTS 1984…) | 🟢 Minor |
| 7 | Thiếu toggle `Focus theo từ` góc trên phải transcript | 🟢 Minor |
| 8 | Bottom thiếu `Xem lịch sử làm bài` + `Làm bài khác` (chỉ có pagination dots) | 🟢 Minor |
| 9 | Audio bar thứ tự nút chưa khớp (ảnh: `time | mute | ⟲5 ▶ 5⟳ | progress | speed`) | 🟢 Minor |

---

## 🎯 GIAI ĐOẠN 1 — Fix duplicate (Critical, 30')

### File: `web/app/thi-thu/listening/[id]/ListeningReviewClient.tsx`

**A. Bỏ outer page header** (line ~201-204)

```diff
- <div className="mb-4 border-b border-[#e5e5e5] pb-3">
-   <h1 className="text-lg font-bold">Questions {partStart} - {partEnd}</h1>
-   <p className="text-[12px] text-gray-600">Complete the form below. Review answers...</p>
- </div>
```

→ Để mỗi `qs.title` + `qs.instructionHtml` tự render.

**B. Xóa `ReviewAnswerRow` list** (line ~220-242)

```diff
- <div className="border-t border-[#e4e4e4]">
-   {qs.questions.map((q) => {
-     const locate = locateInfoOf(q);
-     ...
-     return <ReviewAnswerRow ... />;
-   })}
- </div>
```

→ Locate buttons sẽ được nhúng **inline** trong form (xem GĐ 2).

**Verify:**
- Mở `/thi-thu/listening/9967?type=review`
- Mỗi qset chỉ 1 header (qs.title), 1 instruction (qs.instructionHtml)
- Không còn list answer row trùng lặp dưới form

---

## 🎯 GIAI ĐOẠN 2 — Inline review trong form (Major, 45')

Mục tiêu: trong review mode, mỗi `<input>` (gap-filling) và mỗi radio (table-selection) được thay bằng cụm `▶N ✕ → correctAnswer 📍`.

### Bước 2.1 — Tạo `<InlineReview>` component

**File mới:** `web/components/listening/InlineReview.tsx`

```tsx
"use client";
interface Props {
  order: number;
  userAnswer: string | undefined;
  correctAnswer: string;
  isCorrect: boolean;
  locateFrom: number | null;
  hasParagraphRange: boolean;
  onPlay: () => void;
  onShowLocation: () => void;
}

export default function InlineReview({
  order, userAnswer, correctAnswer, isCorrect,
  locateFrom, hasParagraphRange, onPlay, onShowLocation,
}: Props) {
  const hasAnswer = !!(userAnswer && userAnswer.trim());
  return (
    <span className="inline-flex items-center gap-1 align-middle mx-1 px-2 py-0.5 rounded bg-gray-50 border border-gray-200 text-[13px]">
      {/* Play locate */}
      <button onClick={onPlay} disabled={locateFrom == null}
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          locateFrom != null ? "bg-[#ff7c2b] text-white hover:bg-[#e96a18]" : "bg-gray-200 text-gray-400"
        }`}>
        <svg className="w-2 h-2 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <span className="font-bold text-gray-700 text-[11px]">{order}</span>

      {/* Wrong indicator */}
      {hasAnswer && !isCorrect && <span className="text-[#ef4444] font-bold">✕</span>}

      {/* User answer (struck through if wrong) */}
      {hasAnswer && (
        <span className={isCorrect ? "text-[#5a8c5a] font-medium" : "line-through text-gray-400"}>
          {userAnswer}
        </span>
      )}

      <span className="text-gray-400">→</span>

      {/* Correct */}
      <span className="text-[#5a8c5a] font-semibold underline decoration-[#a4d8a4]">
        {correctAnswer}
      </span>

      {/* Locate pin */}
      {hasParagraphRange && (
        <button onClick={onShowLocation}
          className="text-[#5a8c5a] hover:bg-[#a4d8a4]/30 rounded p-0.5"
          title="Xem vị trí">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/>
          </svg>
        </button>
      )}
    </span>
  );
}
```

### Bước 2.2 — Patch `GapFilling` để render inline review

**File:** `web/components/qset/GapFilling.tsx`

Hiện tại GapFilling render `<input>` ở mỗi gap. Cần:
- Nhận thêm prop `reviewRender?: (q, order) => ReactNode`
- Khi `reviewRender` được pass + mode==="review", gọi `reviewRender(q, order)` thay vì `renderGapInput`

```diff
  export default function GapFilling({
    qs,
    answers,
    onAnswer,
    mode,
+   reviewRender,
  }: {
    qs: QuestionSet;
    answers: Answers;
    onAnswer: (qId: number, val: string) => void;
    mode: Mode;
+   reviewRender?: (q: QuestionSet["questions"][0], order: number) => ReactNode;
  }) {
    ...
    const parsedContent = useMemo(() => {
      if (!isClientReady || !hasGaps || !qs.contentHtml) return null;
      return parseHtmlToReact(qs.contentHtml, orderToQuestion, (order, qid) => {
+       if (mode === "review" && reviewRender) {
+         const q = orderToQuestion.get(order);
+         if (q) return reviewRender(q, order);
+       }
        return renderGapInput({ order, qid, answers, onAnswer, isReview });
      });
    }, [...]);
```

### Bước 2.3 — Patch `TableSelection` để render inline review

**File:** `web/components/qset/TableSelection.tsx`

Tương tự — nhận `reviewRender` prop. Khi review + có reviewRender, thay vì render radio button trong td, render `<td>` với `<InlineReview>` ở cell tương ứng option đúng.

Hoặc đơn giản hơn: bên dưới mỗi table row trong review mode, append `<InlineReview>`. Hoặc bỏ table, render dạng list.

→ **Đề xuất:** chỉ patch GapFilling trước (vì NOTE_COMPLETION, GAP_FILLING, FILL_BLANK chiếm 80% cases). TableSelection để sau, vẫn render bằng AnswerStatus rows.

### Bước 2.4 — Wire trong ListeningReviewClient

Pass `reviewRender` xuống `QSetRenderer`:

```tsx
// Trong ListeningReviewClient.tsx
<QSetRenderer
  qs={qs as any}
  answers={answers}
  onAnswer={() => {}}
  mode="review"
  reviewRender={(q: NormalizedQuestion, order: number) => {
    const locate = locateInfoOf(q);
    const correctValues = getCorrectValues(q);
    const answer = answers[q.id];
    return (
      <InlineReview
        order={order}
        userAnswer={answerToText(answer)}
        correctAnswer={correctValues.join(" / ")}
        isCorrect={isAnswerCorrect(answer, correctValues)}
        locateFrom={locate?.time_ranges?.from ?? null}
        hasParagraphRange={!!locate?.paragraph_ranges?.length}
        onPlay={() => { const f = locate?.time_ranges?.from; if (f != null) seekTo(f); }}
        onShowLocation={() => showLocation(q)}
      />
    );
  }}
/>
```

Và update `QSetRenderer.tsx` để forward `reviewRender` xuống GapFilling.

**Verify:**
- Mở `/thi-thu/listening/9967?type=review`
- Trong form, các blank được thay bằng `▶N ✕ → answer 📍` inline trong text
- Click ▶ → audio seek đến `time_ranges.from`
- Click 📍 → transcript scroll + highlight

---

## 🎯 GIAI ĐOẠN 3 — Top nav + Action bar (Minor, 20')

### File: `ListeningReviewClient.tsx` header section

Theo `docs/UI_REFERENCE_LISTENING_REVIEW.md` section 1 + 2.

**Top nav (xanh nhạt) — 8 tab:**
```tsx
<header className="h-12 bg-[#dcfce7] border-b border-gray-200 flex items-center px-4 gap-1 shrink-0">
  {[
    "My Homepage", "Khóa học Intensive 7.0", "Khoá E-learning lẻ",
    "Luyện tập 4 kỹ năng", "Sổ Từ vựng", "Kết quả học viên", "IELTS 1984"
  ].map((label, i) => (
    <a key={label} href="#" className={`px-3 py-1.5 text-sm ${
      label === "Luyện tập 4 kỹ năng" ? "bg-white rounded text-[#168b32] font-semibold" : "text-[#168b32] hover:bg-white/40 rounded"
    }`}>{label}</a>
  ))}
  <button className="ml-auto px-3 py-1 bg-[#f97316] text-white rounded-full text-xs font-bold">
    Nâng cấp PRO 🔥
  </button>
  <span className="ml-3 font-bold text-[#168b32]">YouPass</span>
</header>
```

**Action bar — replace "Xem mode đề" button:**
```tsx
<div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 text-sm shrink-0">
  <Link href="/luyen-thi/ielts/listening" className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-500">✕</Link>
  <span className="font-mono text-gray-700">00:00:00</span>
  <span><strong className={score.correct>0?"text-[#ff7c2b]":"text-gray-700"}>{score.correct}/{score.total}</strong> <span className="text-gray-500">câu đúng</span></span>
  <div className="ml-auto flex gap-2">
    <button className="px-3 py-1.5 bg-[#fef3c7] text-gray-700 rounded hover:bg-[#fde68a] text-xs flex items-center gap-1">📝 Xem note</button>
    <button className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded text-xs flex items-center gap-1">⚙️ Cài đặt</button>
    <button className="px-3 py-1.5 bg-[#5a8c5a] text-white rounded hover:bg-[#4a7c4a] text-xs flex items-center gap-1">🔗 Chia sẻ bài làm</button>
  </div>
</div>
```

**Verify:** screenshot so với ảnh mẫu — màu xanh, vị trí các button khớp.

---

## 🎯 GIAI ĐOẠN 4 — Tool rail đúng (Minor, 15')

### File: `ListeningReviewClient.tsx` aside section

Thay 3 nút `Translate/Note/Vocab` bằng `Highlight/Notes/Tra từ vựng` với keyboard shortcut.

```tsx
<aside className="w-16 border-r border-gray-200 bg-white flex flex-col items-center py-3 gap-2 shrink-0">
  <div className="text-[9px] font-semibold text-gray-500 uppercase">Công cụ</div>
  <button className="w-11 h-11 rounded bg-[#20a34a] text-white flex items-center justify-center hover:bg-[#178435]"
    title="Play audio">
    <svg className="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
  </button>
  <ToolItem label="Highlight" shortcut="H" iconPath="M12 19l7-7 3 3-7 7-3-3z" />
  <ToolItem label="Notes" shortcut="N" iconPath="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
  <ToolItem label="Tra từ vựng" shortcut="T" iconPath="M4 19.5A2.5 2.5 0 016.5 17H20" />
</aside>

function ToolItem({ label, shortcut, iconPath }: { label: string; shortcut: string; iconPath: string }) {
  return (
    <button className="flex flex-col items-center gap-0.5 p-1.5 rounded text-[10px] w-14 text-gray-600 hover:bg-gray-100">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={iconPath}/>
      </svg>
      <span className="font-semibold leading-none text-center">{label}</span>
      <span className="text-[9px] text-gray-400">Phím ({shortcut})</span>
    </button>
  );
}
```

**Note:** Hiện scope KHÔNG làm chức năng Highlight/Notes/Tra từ vựng. Button click không làm gì là OK, miễn UI khớp ảnh. Nếu sau muốn làm Notes thì connect với `<NotesPanel>` đã có sẵn trong exam mode.

---

## 🎯 GIAI ĐOẠN 5 — Bottom pagination + actions (Minor, 15')

### File: `ListeningReviewClient.tsx` bottom section

Thay block pagination cũ (chỉ có số) bằng:

```tsx
<div className="border-t border-gray-200 bg-white px-4 py-2 flex items-center gap-2 shrink-0">
  {/* Question dots */}
  <div className="flex gap-1.5 flex-wrap">
    {partQuestions.map((q) => {
      const ua = answers[q.id];
      const has = ua !== undefined && ua !== "" && !(Array.isArray(ua) && ua.length === 0);
      const ok = has && isAnswerCorrect(ua, getCorrectValues(q));
      const cls = ok ? "bg-[#5a8c5a] text-white border-[#5a8c5a]" :
                  has ? "bg-[#ef4444] text-white border-[#ef4444]" :
                  "bg-white text-gray-500 border-gray-300";
      return (
        <button key={q.id} onClick={() => scrollToQuestion(q.id)}
          className={`w-7 h-7 rounded text-xs font-bold border hover:opacity-80 ${cls}`}>
          {q.order}
        </button>
      );
    })}
  </div>

  {/* Actions */}
  <div className="ml-auto flex gap-2">
    <Link href={`/practice/listening/${quiz.id}/result`}
      className="px-4 py-1.5 border border-[#ff7c2b] text-[#ff7c2b] rounded-full text-sm hover:bg-[#fef3c7]">
      Xem lịch sử làm bài
    </Link>
    <Link href="/luyen-thi/ielts/listening"
      className="px-4 py-1.5 bg-[#ff7c2b] text-white rounded-full text-sm hover:bg-[#e96a18]">
      Làm bài khác
    </Link>
  </div>
</div>
```

---

## 🎯 GIAI ĐOẠN 6 — Toggle "Focus theo từ" (Optional, 10')

Trong cột transcript, góc trên phải, thêm toggle:

```tsx
<div className="flex items-center justify-end mb-3">
  <label className="flex items-center gap-2 cursor-pointer text-sm">
    <span className="text-gray-600">Focus theo từ</span>
    <span className={`w-9 h-5 rounded-full p-0.5 transition ${focusByWord ? "bg-[#20a34a]" : "bg-gray-300"}`}
      onClick={() => setFocusByWord(v=>!v)}>
      <span className={`block w-4 h-4 rounded-full bg-white transition ${focusByWord ? "translate-x-4" : ""}`}/>
    </span>
  </label>
</div>
```

**Functional behavior:** Hiện data chỉ có sentence-level → toggle này có thể chỉ là UI, không thay đổi hành vi. Hoặc khi tắt, highlight cả paragraph thay vì chỉ câu.

→ **Khuyến nghị:** Skip nếu không có thời gian. Đây là feature optional.

---

## 🎯 GIAI ĐOẠN 7 — Audio bar đúng thứ tự (Minor, 10')

### File: `web/components/listening/ReviewAudioPlayer.tsx`

Hiện audio bar có: `⟲5 ▶ 5⟳ time progress 🔊 speed`

Theo ảnh YouPass: `time | 🔊mute slider | ⟲5 ▶ 5⟳ | progress (full width) | speed`

Sắp xếp lại:
```tsx
<div className="border-t border-gray-200 bg-white px-6 py-3 flex items-center gap-3 shrink-0">
  <audio ref={audioRef} src={src} preload="auto" />

  {/* Time (góc trái) */}
  <span className="font-mono text-xs text-gray-600 min-w-[88px]">{fmt(time)} / {fmt(duration)}</span>

  {/* Volume */}
  <button onClick={toggleMute}>🔊</button>
  <input type="range" min={0} max={1} step={0.05} value={vol}
    onChange={(e)=>setVolVal(parseFloat(e.target.value))}
    className="w-16 accent-gray-500 h-1"/>

  {/* Transport: ⟲5 ▶ 5⟳ */}
  <button onClick={rewind} className="w-9 h-9 hover:bg-gray-100 rounded text-xs font-bold">-5</button>
  <button onClick={toggle} className="w-11 h-11 rounded-full bg-[#ff7c2b] text-white">
    {playing ? "⏸" : "▶"}
  </button>
  <button onClick={forward} className="w-9 h-9 hover:bg-gray-100 rounded text-xs font-bold">+5</button>

  {/* Progress */}
  <input type="range" min={0} max={duration||0} step={0.1} value={time}
    onChange={(e)=>seekTo(parseFloat(e.target.value))}
    className="flex-1 accent-[#ff7c2b] h-1"/>

  {/* Speed */}
  <span className="text-xs text-gray-500">Sound</span>
  <select value={rate} onChange={(e)=>setRateVal(parseFloat(e.target.value))}
    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white">
    {[0.75,1,1.25,1.5,2].map(r => <option key={r} value={r}>{r}x</option>)}
  </select>
</div>
```

---

## 📁 FILE SUMMARY

| File | Loại | GĐ | Mô tả |
|------|------|----|-------|
| `web/app/thi-thu/listening/[id]/ListeningReviewClient.tsx` | Sửa | 1, 3, 4, 5 | Bỏ duplicate, sửa nav/rail/bottom |
| `web/components/listening/InlineReview.tsx` | **Tạo** | 2 | Component review token nhúng inline |
| `web/components/qset/GapFilling.tsx` | Sửa | 2 | Thêm prop `reviewRender` |
| `web/components/qset/QSetRenderer.tsx` | Sửa | 2 | Forward `reviewRender` prop |
| `web/components/listening/ReviewAudioPlayer.tsx` | Sửa | 7 | Sắp xếp lại thứ tự nút |
| `web/components/listening/ReviewAnswerRow.tsx` | Xóa | 1 | Không còn dùng |

**Tổng: 1 file mới + 4 file sửa + 1 file xóa**

---

## ✅ SUCCESS CRITERIA

- [ ] Mở `/thi-thu/listening/9967?type=review`:
  - [ ] Chỉ MỘT "Questions X-Y" header (từ `qs.title`)
  - [ ] Chỉ MỘT instruction (từ `qs.instructionHtml`)
  - [ ] Không có list ReviewAnswerRow rời rạc
  - [ ] Trong form, blank inputs được thay bằng `▶N ✕ → answer 📍` inline
- [ ] Click ▶ trên blank → audio jump đến `time_ranges.from`
- [ ] Click 📍 → transcript scroll + highlight đoạn liên quan
- [ ] Click sentence trong transcript → audio seek
- [ ] Audio chạy → sentence highlight xanh
- [ ] Top nav band giống ảnh YouPass (8 tabs xanh nhạt)
- [ ] Action bar: X | timer | score | Xem note | Cài đặt | Chia sẻ bài làm
- [ ] Tool rail: Highlight | Notes | Tra từ vựng (3 nút với phím tắt H/N/T)
- [ ] Bottom: pagination dots + "Xem lịch sử làm bài" + "Làm bài khác"
- [ ] Audio bar: thứ tự `time | volume | ⟲5 ▶ 5⟳ | progress | speed`
- [ ] Exam mode `/thi-thu/listening/9967` KHÔNG bị ảnh hưởng
- [ ] `npx tsc --noEmit` pass
- [ ] `node src/audit-listening-data.js` vẫn `637 OK / 1 unavailable / 0 broken`

---

## 🖼 LƯU ẢNH MẪU

Trước khi bắt đầu fix, lưu screenshot vào:

```
docs/assets/youpass-review-target.png       ← Ảnh 2 (YouPass thật - đích)
docs/assets/current-bug-duplicates.png      ← Ảnh 1 (lỗi hiện tại)
```

Cách lưu:
1. Click chuột phải vào ảnh trong chat → "Save image as..."
2. Lưu vào `D:\YouPassClone\docs\assets\` với tên trên
3. Mở `docs/UI_REFERENCE_LISTENING_REVIEW.md` để xem ảnh inline

---

## 🚦 THỨ TỰ KHUYẾN NGHỊ

1. **GĐ 1 (30')** — Fix duplicate ngay (critical, ảnh hưởng UX nhất)
2. **GĐ 2 (45')** — Inline review (major, làm form đẹp như ảnh)
3. **GĐ 4 (15')** — Tool rail (UI khớp ảnh)
4. **GĐ 5 (15')** — Bottom actions
5. **GĐ 3 (20')** — Top nav (cosmetic)
6. **GĐ 7 (10')** — Audio bar order
7. **GĐ 6 (10')** — Focus theo từ toggle (optional, skip nếu thiếu giờ)

**Tổng: ~2h** nếu làm full. Critical only (GĐ 1+2): ~75'.

---

## 🚫 KHÔNG ĐỤNG

- `web/app/thi-thu/listening/[id]/ListeningClient.tsx` (exam mode — KHÔNG đổi)
- `web/components/AudioPlayer.tsx` (exam overlay player)
- Toàn bộ Reading + Library + Result pages
- `src/normalize-listening.js` (data đã đủ)
- `web/components/qset/SingleChoice.tsx`, `MultipleChoice.tsx`, `MatchingInfo.tsx`, etc. (giữ nguyên review mode render)

---

## ❓ NẾU GẶP VƯỚNG

**TableSelection inline review (NOTE_COMPLETION letter bank):** Hiện đang là bảng radio. Trong review, thay vì checkbox đã check sẵn, có thể:
- Highlight ô đúng = xanh nhạt
- Ô sai user chọn = đỏ nhạt
- Thêm column "Locate" cuối bảng với nút ▶

→ Nếu phức tạp, skip GĐ 2 cho TableSelection, chỉ làm cho GapFilling.

**Tool rail buttons không có chức năng:**
- Highlight: scope sau, tạm để button "Coming soon"
- Notes: connect với `<NotesPanel>` đã có (`NotesContext`)
- Tra từ vựng: thật ra YouPass có data vocabs trong raw → có thể làm nhưng scope sau

**Top nav 8 tabs là links giả:** OK, chỉ cần UI khớp ảnh. Sau này nếu mở rộng có thể wire `Sổ Từ vựng` → page vocab.
