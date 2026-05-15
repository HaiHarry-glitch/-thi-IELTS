# PLAN: Reading Review Page — đồng bộ với Listening Review (HIN/NEO style)

> Mục tiêu: dựng trang `/thi-thu/reading/[id]?type=review` với UI **giống hệt** listening review:
> - HIN top nav + sub-bar
> - Sidebar 2 nút: **Highlight (H)** + **Tra từ điển (T)** — KHÔNG có Notes
> - Passage trái + Question panel phải
> - Inline review badge (locate ▶ + đáp án) — y hệt listening
> - Vocab popup giống listening (dùng chung `VocabPopup.tsx`)
> - KHÔNG có audio player (reading không có audio)

URL test sau khi build xong:
`http://localhost:3001/thi-thu/reading/10427?type=review`

URL tham chiếu YouPass (mình đã mở Chrome cho bạn):
`https://e-learning.youpass.vn/practice/reading/10277?type=review&answerId=13487739`

---

## PHẦN A — KIẾN TRÚC HIỆN TẠI

### A.1 Cấu trúc file reading hiện có
```
web/app/thi-thu/reading/[id]/
├── page.tsx          # Server component — load quiz + truyền vào client
├── PrepClient.tsx    # Trang prep (chưa vào exam) — còn nhãn "YouPass" cam
└── ExamClient.tsx    # Component chính chạy CẢ exam và review (dùng mode prop)
```

### A.2 Mode review hiện tại
- `ExamClient` nhận `mode: "exam" | "review"` qua `?type=review`
- Trong mode review: bỏ timer, hiện đáp án dạng dropdown "Xem giải thích" (ảnh 1 user gửi) — **rất khác** YouPass và **rất khác** listening review của chúng ta
- KHÔNG có sidebar tools, KHÔNG có vocab click, KHÔNG có inline locate

### A.3 Data passage có sẵn vocab markup
Passage HTML (trong `quiz.parts[i].passageHtml` / `passageWithHeadings.html`) chứa markup:
```html
<p>The Erna Bella Arts Centre {[is a place where local Aboriginals can produce][125]} their traditional...</p>
```
Format: `{[đoạn text][parent_id]}` — `parent_id` chính là ID dùng cho `GET /api/vocab?parent_id={id}&word={word}`.

`PassageRenderer.tsx` HIỆN ĐANG **strip** markup này (dòng 7). Cần **GIỮ LẠI** trong mode review để biến thành span clickable.

### A.4 Inline review đã có (chỉ listening dùng)
- `web/components/listening/InlineReview.tsx` — badge inline với play + Q-number + user answer + → + correct answer + locate icon. **Tái dùng được cho reading** chỉ cần đổi tên prop "play" → "locate paragraph" vì reading không có audio.
- `web/components/qset/GapFilling.tsx` đã support prop `reviewRender` — các loại khác CHƯA support.

---

## PHẦN B — KẾ HOẠCH CHI TIẾT (6 giai đoạn)

### GĐ 1 — Tách `ReadingReviewClient.tsx` ra khỏi `ExamClient.tsx`

**Lý do**: Logic review reading khác biệt đủ nhiều (sidebar tools, vocab popup, inline review, passage clickable) — nhồi vào ExamClient sẽ thành 600+ dòng if/else lằng nhằng.

**Việc**:
- Tạo file mới: `web/app/thi-thu/reading/[id]/ReadingReviewClient.tsx`
- Trong `page.tsx`: detect `searchParams.type === "review"` → render `<ReadingReviewClient />` thay vì `<ExamClient />`
- `ExamClient.tsx` giữ nguyên, chỉ phục vụ mode exam

**Skeleton của `ReadingReviewClient.tsx`**: copy y nguyên cấu trúc `ListeningReviewClient.tsx`:
```tsx
<div bg-cream>
  <HinTopNav />              {/* Logo HIN + ← Thư viện + score badges */}
  <SubBar />                  {/* Timer + Chia sẻ */}
  <main flex>
    <Sidebar />               {/* HL + T tools */}
    <PartTabs />              {/* Nếu có nhiều passage */}
    <Grid 62%/38%>
      <PassageReview />       {/* ⬅ component mới — xem GĐ 3 */}
      <QuestionsReview />     {/* ⬅ tái dùng QSetRenderer với reviewRender */}
    </Grid>
    <BottomNav />              {/* 1-13 số câu + Xem lịch sử + Làm bài khác */}
  </main>
</div>
```

---

### GĐ 2 — Sidebar Tools (Highlight + Tra từ điển)

**Y hệt listening**. Copy nguyên `ToolItem` component từ `ListeningReviewClient.tsx`:
- **Highlight (H)**: chế độ chọn text để highlight tay (nice-to-have, có thể defer)
- **Tra từ điển (T)**: chế độ click từ → mở vocab popup

State:
```tsx
const [activeTool, setActiveTool] = useState<"highlight" | "vocab" | "none">("highlight");
const [selectedVocab, setSelectedVocab] = useState<{ word: string; parentId: number; key: string } | null>(null);
```

Phím tắt: `T` toggle vocab mode, `Escape` close popup — copy từ listening.

Tooltip hover: y hệt listening, đổi text "Click vào bất kỳ từ nào trong **đoạn văn**…".

---

### GĐ 3 — `ReadingPassageReview.tsx` (component mới — quan trọng nhất)

**Mục đích**: render passage HTML mà giữ vocab markup, biến chúng thành span clickable.

**File mới**: `web/components/reading/ReadingPassageReview.tsx`

**Algorithm**:
1. Nhận `html: string`, `vocabMode: boolean`, `onWordClick(word, parentId, key) => void`, `selectedVocab`, `focusedParagraphs: number[]`
2. Parse markup `{[text][id]}` bằng regex (đã có sẵn ở `PassageRenderer`):
   ```ts
   /\{\[([^\]]*)\]\[(\d+)\]\}/g
   ```
3. Khi `vocabMode === true`:
   - Mỗi đoạn `{[text][id]}` → wrap thành `<span class="vocab-span cursor-help underline-dotted" data-parent-id={id}>{text}</span>`
   - Mỗi word trong đó (split bằng `\S+\s*`) → clickable span. Click → `onWordClick(word, id, key)`
   - Hover: `bg-[#FFD700]/40 underline decoration-dotted`
4. Khi từ đang được tra (`selectedVocab.word === cleanWord(token) && selectedVocab.parentId === parentId`):
   - Highlight persistent: `bg-[#d9381e]/15 underline decoration-[#d9381e]`
5. Khi passage có **focused paragraph** (user click locate ở câu hỏi):
   - Wrap paragraph đó với `ring-2 ring-[#1a1a1a] bg-[#FFD700]/15` + auto-scroll
6. **Vị trí render popup**: dưới đoạn chứa từ, giống listening (`<VocabPopup>` trong Fragment ngay sau span).

**Helper: parse passage thành tree**:
- Vì `dangerouslySetInnerHTML` không cho event handler, cần parse HTML → React tree.
- Approach đơn giản: split paragraph (`<p>...</p>`) → mỗi paragraph render JSX, xử lý markup `{[..][..]}` bên trong.
- Cẩn thận với tag inline khác (`<strong>`, `<em>`) trong markup — passage thường khá đơn giản (chỉ có `<p>` và `<strong>`), có thể an toàn dùng regex.

**Fallback**: nếu passage có HTML phức tạp (table, ul, …), fall back về `PassageRenderer` strip mode để không vỡ layout.

---

### GĐ 4 — Re-style `PassageRenderer.tsx` để support review mode

**Sửa** `web/components/PassageRenderer.tsx`:
- Thêm prop optional `reviewMode?: boolean` — nếu true thì render qua `ReadingPassageReview` thay vì strip markup
- Hoặc đơn giản hơn: trong `ReadingReviewClient` dùng trực tiếp `<ReadingPassageReview html={...} />`, KHÔNG đụng PassageRenderer cũ

→ **Chọn cách thứ 2** (KISS): để PassageRenderer cũ nguyên cho mode exam, chỉ thêm component mới cho review.

---

### GĐ 5 — Re-use `InlineReview.tsx` cho reading

`InlineReview` hiện tại có prop:
- `onPlay` — listening dùng để seek audio
- `onShowLocation` — listening dùng để highlight paragraph

**Reading dùng cả 2 nhưng đổi semantic**:
- `onPlay` → đổi tên thành `onLocate` (scroll to + highlight paragraph trong passage); icon đổi từ ▶ play sang 📍 pin
- `onShowLocation` → giữ cho reading luôn (highlight cả range nếu có nhiều paragraph)

**Đề xuất**: refactor `InlineReview` thành 2 prop pattern:
```tsx
interface Props {
  primaryAction: { icon: ReactNode; onClick: () => void; disabled?: boolean; title: string };
  secondaryAction?: { icon: ReactNode; onClick: () => void; title: string };
  ...
}
```
Hoặc tạo `InlineReviewReading.tsx` riêng để khỏi đụng InlineReview của listening (an toàn hơn).

→ **Chọn**: tạo `web/components/reading/InlineReviewReading.tsx` mới, gần như copy InlineReview của listening, đổi:
- Nút play → nút 📍 locate (scroll passage tới paragraph chứa đáp án + highlight)
- Bỏ nút "show location" thứ hai (gộp vào 1 nút duy nhất)

---

### GĐ 6 — Cập nhật `QSetRenderer` + 9 question types

**Vấn đề hiện tại**: chỉ `GapFilling.tsx` support `reviewRender` callback. Reading dùng nhiều loại:
- `GAP_FILLING` ✅ đã có
- `MATCHING_FEATURES` ❌
- `MATCHING_HEADINGS` ❌
- `MULTIPLE_CHOICE` ❌
- `MULTIPLE_CHOICE_MANY` ❌
- `SHORT_ANSWER` ❌
- `TABLE_COMPLETION` (TableSelection) ❌
- `LABEL_DIAGRAM` ❌
- `SINGLE_SELECTION` ❌

**Việc**:
1. Mở rộng `reviewRender` prop xuống tất cả 9 component
2. Mỗi component khi `mode === "review"` && `reviewRender` defined → render badge inline cạnh đáp án user thay vì input thường

**Pattern chuẩn**:
```tsx
{mode === "review" && reviewRender
  ? reviewRender(question, order)
  : <NormalInput ... />}
```

**Ưu tiên**: làm trước GAP_FILLING, MULTIPLE_CHOICE, MULTIPLE_CHOICE_MANY, TABLE_COMPLETION (4 loại phổ biến nhất). Các loại khác làm sau.

---

### GĐ 7 — `locateInfo` cho reading (passage paragraph mapping)

Listening dùng `locateInfo.time_ranges.from` để seek audio. Reading cần `locateInfo.paragraph_ranges` để scroll tới paragraph.

**Kiểm tra data**:
- Đọc 1 file `data/normalized-reading/*.json` để xem `questions[i].locateInfo` có data không
- Nếu CÓ: `paragraph_ranges: [{ start: { paragraph: 3 }, end: { paragraph: 4 } }]` → reading sẵn sàng
- Nếu KHÔNG: phải lấy từ raw + cập nhật `normalize.js` (reading)

**Action item**: bạn (user) check 1 file normalized-reading bất kỳ → xác nhận có `locateInfo` không. Nếu không có thì task này phình ra (phải dùng normalize lại).

---

## PHẦN C — FILES TẠO MỚI / SỬA

### Tạo mới
| File | Mục đích |
|---|---|
| `web/app/thi-thu/reading/[id]/ReadingReviewClient.tsx` | Container review (giống ListeningReviewClient) |
| `web/components/reading/ReadingPassageReview.tsx` | Passage với vocab clickable + paragraph highlight |
| `web/components/reading/InlineReviewReading.tsx` | Badge inline đáp án (locate + answer) |

### Sửa
| File | Sửa gì |
|---|---|
| `web/app/thi-thu/reading/[id]/page.tsx` | If `searchParams.type === "review"` → render ReadingReviewClient |
| `web/components/qset/QSetRenderer.tsx` | Đảm bảo truyền `reviewRender` xuống tất cả types |
| `web/components/qset/MultipleChoice.tsx` | Thêm support `reviewRender` |
| `web/components/qset/MultipleChoiceMany.tsx` | (nếu có file riêng) |
| `web/components/qset/TableSelection.tsx` | Thêm support `reviewRender` |
| `web/components/qset/MatchingHeadings.tsx` | Thêm support `reviewRender` |
| `web/components/qset/MatchingInfo.tsx` | Thêm support `reviewRender` |
| `web/components/qset/ShortAnswer.tsx` | Thêm support `reviewRender` |
| `web/components/qset/types.ts` | Confirm `ReviewRender` type exported |

### KHÔNG đụng
- `PassageRenderer.tsx` (giữ cho mode exam)
- `ExamClient.tsx` (giữ cho mode exam reading)
- `ListeningReviewClient.tsx` + `web/components/listening/*` (đã xong)
- `VocabPopup.tsx` (đã xong, **dùng chung** cho reading)

---

## PHẦN D — VẤN ĐỀ CÒN MỞ (đợi user xác nhận)

1. **`locateInfo` trong reading**: bạn check 1 file `data/normalized-reading/*.json` xem `questions[].locateInfo.paragraph_ranges` có data không?
   - CÓ → làm theo plan
   - KHÔNG → cần update `src/normalize.js` reading pipeline trước (thêm 1 GĐ chuẩn bị data)

2. **Vocab parent_id cho reading**: confirm sau khi bạn login vào tab Chrome mình mở:
   - Click 1 từ trong passage YouPass → DevTools Network → URL `/v1/vocabs?parent_id=??&word=??` → `parent_id` đó là gì?
   - Mình ĐOÁN là cùng format với markup `{[..][parent_id]}` trong passage HTML hiện có

3. **Highlight tool (H)**: có cần build chế độ select-to-highlight (kéo chuột chọn text → vàng) không, hay để phase 2?
   - Listening hiện tại nút H chỉ là indicator (chưa có behavior thật)
   - Đề xuất: defer — chỉ làm vocab T trước

4. **Thứ tự ưu tiên**: bạn muốn làm theo thứ tự GĐ 1→7, hay ưu tiên:
   - A) Khung HIN trước (GĐ 1+2+5, không có vocab click) — nhanh, giống listening
   - B) Cả vocab click (GĐ 3+4) cùng lúc — đầy đủ, lâu hơn

---

## PHẦN E — CHECKLIST CHO USER

### Trước khi mình code:
- [ ] Check 1 file `data/normalized-reading/*.json` xem có `locateInfo.paragraph_ranges` không
- [ ] Login vào tab Chrome đã mở → click 1 từ trong passage YouPass → DevTools confirm `parent_id` lấy từ đâu
- [ ] Quyết định: defer Highlight tool (H) hay làm luôn?
- [ ] Quyết định: làm khung HIN trước, hay đầy đủ vocab click?

### Sau khi user duyệt:
- [ ] GĐ 1 — Tách `ReadingReviewClient.tsx` (1-2h)
- [ ] GĐ 2 — Sidebar tools (copy từ listening, ~30 min)
- [ ] GĐ 5 — `InlineReviewReading.tsx` (~30 min)
- [ ] GĐ 7 — Confirm `locateInfo` data → wire locate button (~30 min)
- [ ] GĐ 6 — Mở rộng `reviewRender` cho 4 question types (2-3h)
- [ ] GĐ 3 — `ReadingPassageReview.tsx` parse markup + clickable (3-4h, phức tạp nhất)
- [ ] GĐ 4 — Cleanup PassageRenderer (15 min)
- [ ] Test với 3-4 quiz reading khác nhau

**Tổng ước lượng**: ~1 ngày làm việc tập trung.
