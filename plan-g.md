# Plan G — Round 6: Summary Completion UI + Highlight persistence

## Audit kết quả

### Bug 1 — `SUMMARY_COMPLETION` + letter bank render thành bảng siêu rộng (xấu, khó dùng)

**Reproduce**: `/thi-thu/reading/10291` — Questions 37-40 ("Complete the summary below using the list of words, A-J").

**Data**: `data/normalized/10291.json` QS 3997
- `type: "NOTE_COMPLETION"` với `options.length = 10` (A-J: back, brain, view, convex, sight, nose, round, hollow, drawing, preconception)
- Questions có `type: "SUMMARY_COMPLETION"` (không phải matching)

**Code path hiện tại**: `components/qset/QSetRenderer.tsx:39-54`
```ts
case "NOTE_COMPLETION": {
  if (qs.options && qs.options.length > 0) {
    if (isMatchingStyle) return <MatchingInfo ... />;
    return <TableSelection ... />;  // ← falls here, render bảng 10 cột
  }
  return <GapFilling ... />;
}
```

Bảng 10 cột × 4 hàng cho summary completion = UX tệ. Đáp án đúng phải là:
- **Inline gap-fill** trong câu hỏi (text có `____` placeholder)
- **Option bank** hiển thị trên đầu dưới dạng chips A. back / B. brain / …
- User chọn option bằng dropdown trong gap hoặc drag-drop từ chip vào gap.

**Fix đề xuất**:

Tạo component mới `components/qset/SummaryWithBank.tsx`:
- Render option chips ngang đầu (giống MatchingHeadings list).
- Mỗi question render text inline với gap `<select>` dropdown chứa A-J + option text.
- Trên mobile: dùng dropdown native. Trên desktop có thể thêm drag-drop nhưng dropdown đủ rồi.

Routing trong QSetRenderer:
```ts
case "NOTE_COMPLETION": {
  if (qs.options && qs.options.length > 0) {
    if (isMatchingStyle) return <MatchingInfo ... />;
    // Detect summary-style: questions type SUMMARY_COMPLETION / SENTENCE_COMPLETION
    const SUMMARY_TYPES = new Set(["SUMMARY_COMPLETION", "SENTENCE_COMPLETION"]);
    const isSummaryStyle = qs.questions.some((q) => SUMMARY_TYPES.has(q.type));
    if (isSummaryStyle) {
      return <SummaryWithBank ... />;
    }
    return <TableSelection hideContentHtml ... />;
  }
  return <GapFilling ... />;
}
```

**File mới**: `web/components/qset/SummaryWithBank.tsx`

```tsx
"use client";
import type { QuestionSet, Answers, Mode, ReviewRender } from "./types";
import QSetHeader from "./QSetHeader";

export default function SummaryWithBank({ qs, answers, onAnswer, mode }: {
  qs: QuestionSet; answers: Answers;
  onAnswer: (qId: number, val: string) => void; mode: Mode;
}) {
  const opts = qs.options ?? [];
  const isExam = mode === "exam";

  return (
    <div className="anchor-hl-note content-cms" id={`question-set-${qs.id}`}>
      <QSetHeader qs={qs} />
      {/* Option bank chips */}
      <div className="my-3 flex flex-wrap gap-2">
        {opts.map((opt) => (
          <span key={opt.option} className="border border-[#1a1a1a] rounded-[4px] px-2 py-1 text-sm bg-white">
            <span className="font-bold mr-1">{opt.option}</span>{opt.text}
          </span>
        ))}
      </div>
      {/* Gap-fill rows */}
      <div className="space-y-3 mt-3">
        {qs.questions.map((q) => {
          const val = (answers[q.id] as string | undefined) ?? "";
          const parts = (q.text || "").split(/_{2,}/);
          return (
            <div key={q.id} id={`question-${q.id}`} className="flex items-start gap-2">
              <span className="font-bold min-w-7">{q.order}</span>
              <div className="flex-1">
                {parts.map((part, i) => (
                  <span key={i}>
                    {part}
                    {i < parts.length - 1 && (
                      <select
                        disabled={!isExam}
                        value={val}
                        onChange={(e) => onAnswer(q.id, e.target.value)}
                        className="mx-1 border border-[#418ec8] rounded px-2 py-0.5 text-sm"
                      >
                        <option value="">—</option>
                        {opts.map((o) => (
                          <option key={o.option} value={o.option}>{o.option}. {o.text}</option>
                        ))}
                      </select>
                    )}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Verify**:
- `/thi-thu/reading/10291` Q37-40 → mỗi câu hiển thị inline gap với dropdown.
- Click dropdown → chọn A-J → state lưu giống TableSelection cũ (key `answers[qId] = "A"`).
- Review mode: hiển thị đáp án + highlight đúng/sai (cần handle reviewRender hoặc dùng AnswerStatus).

---

### Bug 2 — Highlight bị mất khi đổi section trong Listening full-test

**Reproduce**: `/thi-thu/full/listening/C20T2` → highlight 1 đoạn ở Section 2 transcript → click Part 3 → quay lại Part 2 → highlight mất.

**Root cause**:
- `HighlightLayer` chỉ chèn `<mark>` vào DOM, không lưu state JS.
- Khi `activePart` đổi, React render lại với content khác (vì component children dùng `currentPart`) → DOM cũ unmount → `<mark>` biến mất.
- Khi quay lại Part 2, React render lại từ source HTML gốc (không có mark).

**Fix approach**:

Lưu highlights vào memory store, restore khi mount.

**Storage shape**:
```ts
type HighlightRange = {
  partIdx: number;
  containerKey: string; // unique stable id per renderable block (e.g., "passage", "qs-554", "transcript-3")
  // Anchor: tìm vị trí trong text plain
  startOffset: number;  // ký tự offset trong textContent của container
  endOffset: number;
  text: string;         // for verify on restore (skip if mismatch)
};
```

**Files cần sửa**:

1. **`web/components/HighlightsStore.tsx`** (new) — Context provider:
```tsx
const HighlightsContext = createContext<{
  add: (h: HighlightRange) => void;
  remove: (containerKey: string, startOffset: number) => void;
  getForContainer: (partIdx: number, containerKey: string) => HighlightRange[];
}>(...);
```

2. **`web/components/HighlightLayer.tsx`** — sau khi apply mark, tính `startOffset/endOffset` so với `wrapRef.current.textContent`, gọi `add(...)`. Dùng `partIdx` từ prop và `containerKey` mới (cần thêm prop).

3. **`web/components/HighlightRestorer.tsx`** (new) — wrap content, on mount đọc store và re-apply highlights bằng Range API.

4. **Sử dụng**: trong `ListeningClient.tsx`, `ExamClient.tsx`, mỗi block content cần wrap thêm `<HighlightRestorer containerKey="transcript" partIdx={activePart}>`.

**Anchor strategy**:
- Khi user highlight, snapshot `range.startOffset` + `range.endOffset` relative to `container.textContent`.
- Khi restore, walk text nodes của container, build map offset→node, dùng `new Range()` + `setStart/setEnd` + apply mark.
- Verify `text` match trước khi apply để tránh sai vị trí khi content thay đổi.

**Simpler MVP**: lưu chỉ `text` (chuỗi highlighted), restore = tìm text đầu tiên match trong container. Edge case: trùng text → chỉ highlight instance đầu. Nhưng đủ dùng cho 90% case.

```ts
function restoreHighlights(container: HTMLElement, highlights: HighlightRange[]) {
  for (const h of highlights) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent || "";
      const idx = text.indexOf(h.text);
      if (idx >= 0) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + h.text.length);
        const mark = document.createElement("mark");
        mark.style.backgroundColor = "#fde68a";
        mark.className = "yp-hl";
        mark.appendChild(range.extractContents());
        range.insertNode(mark);
        attachRemoveHandler(mark);
        break;
      }
    }
  }
}
```

**Persist across reload (optional)**: lưu `localStorage` key `hin_highlights_${quizId}` → khôi phục khi mount.

**Files cần sửa list**:
- New: `web/components/HighlightsStore.tsx`
- New: `web/components/HighlightRestorer.tsx`
- Edit: `web/components/HighlightLayer.tsx` — nhận `containerKey` prop, tính offsets, gọi store.add.
- Edit: `web/app/thi-thu/listening/[id]/ListeningClient.tsx` — wrap transcript blocks với `<HighlightsStore>` + `<HighlightRestorer containerKey="transcript">`.
- Edit: `web/app/thi-thu/reading/[id]/ExamClient.tsx` — tương tự cho passage và question instructions.

**Verify**:
- Listening C20T2: highlight ở Section 2 → đổi Part → quay lại → vẫn còn.
- Reading C20T2: highlight ở Part 1 → đổi Part → quay lại → vẫn còn.
- Click vào mark để xóa → highlight biến mất, store cập nhật.
- Reload trang (nếu có persist localStorage) → highlight vẫn còn (optional).

---

### Bug 3 — Verify audio fix (plan-f) đã chạy đúng

Bạn report đã làm xong. Verify checklist:

| # | Scenario | Mong đợi |
|---|---|---|
| 1 | `/thi-thu/full/listening/C20T2` → bấm Play | Section 1 audio chạy |
| 2 | Section 1 hết | Countdown 30s hiển thị, audio im |
| 3 | Hết countdown | Section 2 audio tự chạy, KHÔNG cần click |
| 4 | Click tab Part 1 khi đang ở Part 2 | UI hiển thị Part 1, audio **vẫn phát Part 2** |
| 5 | Badge "Đang phát Section 2" + nút "Theo dõi audio" | Hiện ra |
| 6 | Click "Theo dõi audio" | Quay về Part 2 |
| 7 | Hết Section 4 | Audio dừng, phase=done, không countdown nữa |
| 8 | Submit giữa chừng | Audio pause, không leak interval |
| 9 | Cancel & restart | Audio reset, phase=idle |

Nếu 1 trong 9 case fail → cần debug.

---

## Audit các renderer khác — quick check

| Type → Renderer | Verify URL | Status |
|---|---|---|
| SINGLE_CHOICE → SingleChoice | `/thi-thu/listening/7378` Q1-10 | Cần test |
| MULTIPLE_CHOICE_ONE → SingleChoice | `/thi-thu/full/listening/C20T3` Q11-13 (ảnh user) | Cần test |
| GAP_FILLING / FILL_BLANK → GapFilling | `/thi-thu/listening/7379` | Cần test |
| TABLE_SELECTION → TableSelection | `/thi-thu/listening/7379` | Cần test |
| MATCHING_HEADINGS → MatchingHeadings | `/thi-thu/reading/10420` | Đã test ✓ |
| MATCHING_INFO → MatchingInfo | `/thi-thu/reading/10420` Q33-38 | Cần test |
| MULTIPLE_CHOICE_MANY → MultipleChoice | `/thi-thu/reading/7252` Q23-26 | Đã test ✓ |
| SHORT_ANSWER / SUMMARY_COMPLETION (no bank) → ShortAnswer | `/thi-thu/reading/7253` Q1-6 | Cần test |
| LABEL_DIAGRAM → LabelDiagram | (tìm quiz có map) | Cần test |
| NOTE_COMPLETION + bank + summary → **bị bug** | `/thi-thu/reading/10291` | **Bug 1 trên** |

→ Sau khi fix Bug 1, chạy lại checklist này, đánh dấu pass/fail.

---

## Thứ tự thực hiện

| # | Việc | Effort | Priority |
|---|---|---|---|
| 1 | Bug 1 — Tạo `SummaryWithBank.tsx` + route vào QSetRenderer | 30 phút | **High** |
| 2 | Bug 1 — Support review mode (đúng/sai/đáp án) | 15 phút | High |
| 3 | Bug 2 MVP — HighlightsStore context + restore by text match | 45 phút | **High** |
| 4 | Bug 2 — Sửa HighlightLayer integrate store | 20 phút | High |
| 5 | Bug 2 — Wrap content blocks trong ListeningClient + ExamClient | 15 phút | High |
| 6 | Bug 2 optional — Persist localStorage | 15 phút | Medium |
| 7 | Verify audio (plan-f) 9 case | 15 phút | High |
| 8 | Verify renderer checklist còn lại | 30 phút | Medium |
| 9 | Cập nhật `bugs-found.md` Round 6 | 5 phút | Low |

---

## Verify cuối

- `npx tsc --noEmit` pass
- `npm run build` pass
- Smoke 5 URL:
  - `/thi-thu/reading/10291` (Summary Completion fix)
  - `/thi-thu/full/listening/C20T2` (audio + highlight persistence)
  - `/thi-thu/full/reading/C20T2` (highlight persistence reading)
  - `/thi-thu/reading/10420` (matching headings regression)
  - `/practice/reading/10291/result` (review summary fix)

---

## Commit suggestions

- `feat(qset): add SummaryWithBank renderer for letter-bank summary completion`
- `fix(qset): route NOTE_COMPLETION with summary-style questions away from wide table`
- `feat(highlight): persist DOM highlights across part switches via context store`
- `feat(highlight): restore highlights by text-anchor on mount`
- `chore(audit): document round 6 fixes`
