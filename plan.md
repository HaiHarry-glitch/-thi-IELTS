# Plan v2 — Clone UI từng dạng bài (Reading + Listening) — phần TRANG LÀM ĐỀ

> **Mục tiêu hẹp lại của bản v2**: clone *pixel-perfect* trang **làm đề** (`/thi-thu/...` & `/practice/...`) cho **mọi dạng câu hỏi** xuất hiện trong dataset Reading + Listening đã harvest. Không bỏ sót dạng nào, kèm quy trình verify từng dạng so với screenshot portal gốc.
>
> Bản v1 (`harvest, schema, routing tổng thể`) coi như đã xong. Bản v2 này là **playbook thi công UI render** + **QA matrix**.

---

## 0. TL;DR

- Đã harvest: **510 đề Reading** + **638 file Listening** (sub-quizzes); session login OK; audio/thumb đã tải.
- Đã có scaffold Next.js `web/` với 9 component renderer trong `web/components/qset/` và `ListeningClient.tsx` / Reading client.
- **Còn thiếu**: render đúng pixel-perfect từng *biến thể* dạng bài; chưa verify từng dạng so với portal; một số dạng (MAP_DIAGRAM_LABEL Listening, OTHERS, FILL_BLANK với drag-drop, MATCHING_INFORMATION reading) chưa có component riêng hoặc bị fallback.
- Bản kế hoạch này: ❶ liệt kê **toàn bộ dạng đã đo trong dataset**, ❷ map sang component phải có, ❸ định nghĩa **acceptance criteria + verification script** cho từng dạng.

---

## 1. Inventory thực tế — đếm từ dataset đã harvest

> Số liệu lấy bằng `node` quét `data/normalized` + `data/normalized-listening` (đã chạy lúc lập plan).

### 1.1. Reading — 510 đề, 9 dạng

| # | `question_type` (raw) | Đếm | Tên IELTS chuẩn | Sample id (đã có portal screenshot) |
|---|---|---:|---|---|
| R1 | `SINGLE_SELECTION` | 197 | True/False/Not Given · Yes/No/Not Given | 10011 |
| R2 | `GAP_FILLING` | 231 | Summary / Sentence / Short-answer completion (≤ N words) | 10011 |
| R3 | `TABLE_SELECTION` | 96 | Table / Flowchart completion (chọn từ list) | 10014 |
| R4 | `MATCHING_ENDINGS` | 26 | Matching sentence endings | 10014 |
| R5 | `MATCHING_HEADINGS` | 49 | Matching headings (i, ii, iii…) cho từng paragraph | 10022 |
| R6 | `MATCHING_FEATURES` | 80 | Matching features (researchers ↔ statements) | 10023 |
| R7 | `MULTIPLE_CHOICE_MANY` | 48 | Multiple choice — chọn N (thường 2) đáp án | 10025 |
| R8 | `SINGLE_CHOICE` | 106 | Multiple choice — chọn 1 đáp án | 10064 |
| R9 | `NOTE_COMPLETION` | 50 | Note / Diagram-label completion (text fill) | 10064 |

> ⚠ **Chưa thấy** trong reading dataset: `MATCHING_INFORMATION` (Which paragraph contains…?), `MAP_DIAGRAM_LABEL`. Cần verify lại bằng `harvest-quiz` đề mới (Cambridge 19+) trước khi nói "không tồn tại".

### 1.2. Listening — 638 sub-quiz, 13 dạng

| # | `question_type` (raw) | Đếm | Tên IELTS chuẩn | Sample id |
|---|---|---:|---|---|
| L1 | `SINGLE_CHOICE` | 138 | Multiple choice 1 đáp án | 10006 |
| L2 | `MULTIPLE_CHOICE_ONE` | 104 | Multiple choice 1 đáp án (variant) | (chưa pick — cần) |
| L3 | `MULTIPLE_CHOICE_MANY` | 118 | Multiple choice nhiều đáp án | 10051 |
| L4 | `GAP_FILLING` | 272 | Form / Note completion fill text | 10007 |
| L5 | `FILL_BLANK` | 255 | Fill blank inline trong câu | (cần pick) |
| L6 | `FILL-IN-THE-BLANK` | 3 | Variant cũ của FILL_BLANK (3 đề legacy) | (cần pick) |
| L7 | `NOTE_COMPLETION` | 30 | Note completion | 7393 |
| L8 | `TABLE_SELECTION` | 32 | Table completion (chọn từ list) | 10006 |
| L9 | `MATCHING_INFO` | 64 | Matching (speaker ↔ statement / item ↔ category) | (cần pick) |
| L10 | `MATCHING_FEATURES` | 16 | Matching features | 8341 |
| L11 | `MATCHING_ENDINGS` | 56 | Matching endings | 10051 |
| L12 | `MAP_DIAGRAM_LABEL` | 36 | Map / plan / diagram labelling | (cần pick — quan trọng) |
| L13 | `OTHERS` | 14 | Free-form / unclassified (sample 1324, 1361, 1362) | 1324 |

> 🔥 **Dạng "khó" cần dồn nhiều effort**: L12 `MAP_DIAGRAM_LABEL` (drag chữ vào ảnh map), L9 `MATCHING_INFO` (dropdown per question), L13 `OTHERS` (cần xem từng case).

### 1.3. Tổng số component cần có

- **Component renderer chuyên dụng**: 11 (gộp các raw type tương đương).
- **Variant config**: ~18 biến thể (ví dụ TFNG vs YN-NG, MCQ-1 vs MCQ-many, fill-text vs fill-from-list).

---

## 2. Mapping raw type → component (canonical)

| Component | Bao phủ raw types | Reading | Listening |
|---|---|:-:|:-:|
| `SingleSelection.tsx` | `SINGLE_SELECTION` | ✓ | – |
| `SingleChoice.tsx` | `SINGLE_CHOICE`, `MULTIPLE_CHOICE_ONE` | ✓ | ✓ |
| `MultipleChoice.tsx` | `MULTIPLE_CHOICE`, `MULTIPLE_CHOICE_MANY` | ✓ | ✓ |
| `GapFilling.tsx` | `GAP_FILLING`, `FILL_BLANK`, `FILL-IN-THE-BLANK`, `NOTE_COMPLETION` | ✓ | ✓ |
| `ShortAnswer.tsx` | `SHORT_ANSWER`, `SHORT_ANSWERS`, `SENTENCE_COMPLETION`, `SUMMARY_COMPLETION` | ✓ | ✓ |
| `TableSelection.tsx` | `TABLE_SELECTION` | ✓ | ✓ |
| `MatchingHeadings.tsx` | `MATCHING_HEADINGS` | ✓ | – |
| `MatchingInfo.tsx` | `MATCHING_INFORMATION`, `MATCHING_INFO`, `MATCHING_FEATURES`, `MATCHING_ENDINGS`, `MATCHING_NAMES`, `MATCHING` | ✓ | ✓ |
| `LabelDiagram.tsx` | `LABEL_DIAGRAM`, `MAP_LABELLING`, `MAP_DIAGRAM_LABEL` | (tbd) | ✓ |
| `OthersFallback.tsx` | `OTHERS` (mới — phải tạo) | – | ✓ |
| `Unknown.tsx` | default | catch-all | catch-all |

> Hiện tại `QSetRenderer.tsx` fallback default = `ShortAnswer`. **Phải đổi thành `Unknown`** (render warning + dump JSON) để không silent-render sai dạng.

---

## 3. Spec render từng dạng (canonical visual)

> Mỗi dạng dưới đây có 5 mục: **(a)** layout, **(b)** input pattern, **(c)** state (chọn/đã chọn/đúng/sai trong review), **(d)** dữ liệu vào, **(e)** edge cases.

### R1 / SINGLE_SELECTION (TFNG, YNNG)
- **(a)** Mỗi câu là 1 row: `[stem text]` + 3 nút radio dọc/ngang `True / False / Not Given` (hoặc `Yes / No / Not Given`).
- **(b)** Detect biến thể: nếu trong `options` có "YES" → YN-NG; mặc định TF-NG.
- **(c)** Exam: nút sáng xanh (`#418ec8`) khi chọn. Review: ✓ xanh nếu = `correctAnswer`, ✗ đỏ nếu sai, đáp án đúng nhấn nền vàng.
- **(d)** `question.options` (3 phần tử), `question.correctAnswer` ("TRUE" | "FALSE" | "NOT_GIVEN").
- **(e)** Một số đề options viết hoa, một số mix-case → phải normalize lowercase khi compare.

### R2/L4/L5/L6 / GAP_FILLING (+ FILL_BLANK + NOTE_COMPLETION text)
- **(a)** Render đoạn HTML có placeholder `{[ans][N]}` → biến thành `<input>` inline có width tỉ lệ độ dài đáp án (~ `correctAnswer.length * 9px`, min 60px).
- **(b)** Trên input có badge số thứ tự câu (q.order) ở góc trên-trái (giống IELTS portal).
- **(c)** Exam: chỉ nhập text. Review: nếu đúng → border xanh + ✓; sai → border đỏ + đáp án đúng hiện bên dưới in nghiêng.
- **(d)** `qs.content` là HTML, regex `\{\[ans\]\[\d+\]\}` → input. `instructionHtml` thường có "NO MORE THAN TWO WORDS…" — render in đậm phía trên.
- **(e)** Listening: trong `parts[].content` (transcript) cũng có markup → KHÔNG dùng cho exam, chỉ dùng cho review/transcript panel. Exam dùng `qs.content`.

### R3/L8 / TABLE_SELECTION
- **(a)** `qs.content` là HTML table. Trong cell có `{[ans][N]}` (đối với listening — fill text) hoặc `{[select][N]}` (đối với reading — chọn từ list `qs.options`).
- **(b)** Reading: cell trở thành `<select>` với options `qs.options`. Listening: cell là `<input>` text.
- **(c)** Border cell theo style portal: header xám `#e8e8e8`, body trắng, viền `#c1c1c1`.
- **(d)** `qs.options` (array string) chỉ tồn tại khi mode select.
- **(e)** Một số table có rowspan/colspan — phải giữ nguyên HTML, chỉ replace marker.

### R4/L11 / MATCHING_ENDINGS
- **(a)** 2 cột: trái `[stem nửa câu] ___` (mỗi câu = row, có dropdown/letter-input). Phải là box "List of endings" với A, B, C, D, E…
- **(b)** Input = dropdown `<select>` chứa các letter A-Z, hoặc inline letter-button (portal dùng dropdown).
- **(c)** Exam: dropdown có viền xám, focus xanh. Review: hiện letter user chọn + (Đáp án đúng: X) màu xanh.
- **(d)** `qs.options` là list các endings; `correctAnswer` = "A"|"B"|...
- **(e)** `allow_reuse=false` thường true cho endings — nhưng UI không enforce.

### R5 / MATCHING_HEADINGS
- **(a)** Box trên cùng "List of Headings" liệt kê i, ii, iii… (Roman numerals). Bên dưới: từng paragraph (A, B, C…) — mỗi paragraph có dropdown/box "Choose heading".
- **(b)** Hiện `web/components/PassageWithHeadings.tsx` đã có scaffold — verify lại numbering + drag-drop hay dropdown.
- **(c)** Đa số portal IELTS dùng **dropdown** chọn roman numeral. Drag-drop là biến thể nâng cao — bản v1 dùng dropdown.
- **(d)** `qs.options` = list headings; `correctAnswer` = "i"|"ii"|...
- **(e)** Trong review: tô màu paragraph được match (hover dropdown → highlight para liên quan).

### R6/L10 / MATCHING_FEATURES
- **(a)** Box "List of features" (A, B, C — researchers/companies/etc.). Bên dưới: list statement, mỗi statement có dropdown chọn letter.
- **(b)** Tương tự MATCHING_ENDINGS nhưng có thể `allow_reuse=true`.
- **(c)** Like above.
- **(d/e)** Same.

### L9 / MATCHING_INFO (Listening flavor)
- **(a)** Box "What does each X say about Y?" — list các option (A. agree, B. disagree, C. unsure). Bên dưới list speaker/items, mỗi item có dropdown.
- **(b)** Variant của MatchingInfo nhưng UI portal Listening hiện đáp án dưới dạng inline letter-buttons sau câu hỏi (không dropdown). **Phải snapshot mới biết chính xác**.
- **(c-e)** TBD sau khi snapshot.

### R7/L3 / MULTIPLE_CHOICE_MANY
- **(a)** Stem câu hỏi ("Choose **TWO** answers") + checkbox list options A-G. Đếm số đã chọn ở góc.
- **(b)** Disable checkbox khi đã đủ `qs.max_selections` (thường 2). Cho phép bỏ chọn.
- **(c)** Review: ✓ xanh cho đúng, ✗ đỏ cho sai, vàng cho "đáp án đúng nhưng user không chọn".
- **(d)** `correctAnswers` (plural) array.
- **(e)** Một vài đề `max_selections=3`.

### R8/L1/L2 / SINGLE_CHOICE / MULTIPLE_CHOICE_ONE
- **(a)** Stem + radio list A/B/C/D.
- **(b)** Click toàn row để chọn (giống portal, không phải chỉ click radio).
- **(c)** Như MCQ-many.

### L12 / MAP_DIAGRAM_LABEL  ⚠ Khó nhất
- **(a)** Hiển thị `qs.image` (URL CMS asset) full-width. Bên cạnh là list số đánh dấu trên ảnh; bên phải là dropdown/list-of-options A-K (place names).
- **(b)** Mỗi dot trên map = 1 câu hỏi, có số (q.order). User chọn letter từ option list. Drag-drop là plus; bản v1 dùng dropdown như portal hiện tại (cần snapshot xác nhận).
- **(c)** Review: tô letter đúng cạnh dot, sai → red + đáp án đúng.
- **(d)** `qs.image` phải tồn tại; `qs.options` = labels; `q.map_position` (nếu có) = `{x, y}` để vẽ dot — nếu không có thì dùng image gốc đã có sẵn dots.
- **(e)** Asset từ `cms.youpass.vn` — cần đảm bảo đã download vào `public/assets/maps/{quiz_id}/{qs_id}.png`.

### L13 / OTHERS
- **(a)** Sample id 1324, 1361, 1362 đều có `questionSets` chỉ với 1 item type=OTHERS. Cần mở 3 file đó, đọc `qs.content` để hiểu structure.
- **(b)** Khả năng cao là edge case "instruction-only" hoặc "intro" — render passive HTML.
- **(c)** Plan: tạo `OthersFallback.tsx` chỉ render `qs.content` HTML + log warning.
- **(d/e)** Sau khi snapshot 3 đề thật, quyết định có cần xử lý đặc biệt không.

---

## 4. Visual reference: snapshot portal cho từng dạng

> Đây là phần **bắt buộc** trước khi code/sửa renderer. Mục tiêu: có 1 ảnh PNG portal gốc cho **mỗi dạng × mỗi state (exam, exam-answered, review-correct, review-wrong)**.

### 4.1. Inventory snapshot hiện có

```
data/portal-by-type/                 # listening 7 dạng (đã có)
  GAP_FILLING-10501/, MATCHING_ENDINGS-10273/, MATCHING_FEATURES-9884/,
  MULTIPLE_CHOICE_MANY-10272/, NOTE_COMPLETION-9969/, SINGLE_CHOICE-10459/,
  TABLE_SELECTION-10459/
data/portal-listening-snapshots/5-review-10501/   # review mode listening
data/portal-crawl/<id>/screenshot.png   # 510+ reading thumbnail-quality (đề full)
```

### 4.2. Snapshot còn thiếu (gap list)

| Skill | Dạng | Trạng thái | Sample id đề xuất |
|---|---|---|---|
| Reading | SINGLE_SELECTION | ❌ | 10011 |
| Reading | GAP_FILLING | ❌ | 10011 |
| Reading | TABLE_SELECTION | ❌ | 10014 |
| Reading | MATCHING_ENDINGS | ❌ | 10014 |
| Reading | MATCHING_HEADINGS | ❌ | 10022 |
| Reading | MATCHING_FEATURES | ❌ | 10023 |
| Reading | MULTIPLE_CHOICE_MANY | ❌ | 10025 |
| Reading | SINGLE_CHOICE | ❌ | 10064 |
| Reading | NOTE_COMPLETION | ❌ | 10064 |
| Listening | MULTIPLE_CHOICE_ONE | ❌ (chỉ có SINGLE_CHOICE) | (cần pick id) |
| Listening | FILL_BLANK | ❌ | (cần pick) |
| Listening | FILL-IN-THE-BLANK | ❌ | (cần pick — chỉ 3 đề) |
| Listening | MATCHING_INFO | ❌ | (cần pick) |
| Listening | MATCHING_ENDINGS | ✅ 10273 (cũng listening) | – |
| Listening | MAP_DIAGRAM_LABEL | ❌ | (cần pick — top priority) |
| Listening | OTHERS | ❌ | 1324, 1361, 1362 |

### 4.3. Script snapshot mới (cần viết)

Tạo `src/snap-all-types.js` (mở rộng từ `src/pick-and-snap-types.js`):

1. Cho mỗi `type` còn thiếu trong table 4.2 → query `data/normalized*/_index.json` chọn id đầu tiên có chứa dạng đó (ưu tiên id có trong `portal-crawl*` để chắc render được).
2. Mở 4 URL state:
   - `https://youpass.vn/thi-thu/reading/${id}` (giới thiệu)
   - `https://youpass.vn/practice/reading/${id}` (exam)
   - `https://youpass.vn/practice/reading/${id}?type=review&answerId=…` — cần submit thử 1 lần để có `answerId` (script này nên có nhánh "submit dummy answers").
3. Lưu vào `data/portal-by-type/${SKILL}-${TYPE}-${id}/{1-intro,2-exam,3-exam-answered,4-review}.png`.
4. Cũng lưu `page.html` để diff DOM khi cần.

Đề mocktest (`?type=mocktest`) postpone đến v3.

---

## 5. Quy trình implement + verify cho từng dạng (per-type checklist)

> Áp dụng **đồng thời** cho mỗi dạng. Mỗi dạng = 1 PR/commit nhỏ.

### Bước 1 — Snapshot & spec (cứng)
- [ ] Chạy `node src/snap-all-types.js --type=<TYPE> --skill=<R|L>` → có 4 ảnh portal.
- [ ] Trong PR, paste 4 ảnh vào `docs/visual/<TYPE>.md` kèm note: layout, màu, padding, font, hành vi click.
- [ ] Liệt kê các trường data quan trọng (correctAnswer, options, content placeholder…).

### Bước 2 — Render component
- [ ] Sửa/thêm component trong `web/components/qset/<Type>.tsx`.
- [ ] Hỗ trợ 3 mode: `exam` (chỉ nhập), `review` (đè đáp án đúng/sai), `submitted` (locked).
- [ ] Style Tailwind theo spec; dùng đúng token màu (`#418ec8` blue, `#a4d8a4` review header, `#c1c1c1` border, `#f1f2ec` instruction box…).

### Bước 3 — Inject vào QSetRenderer
- [ ] Đảm bảo `QSetRenderer.tsx` map ALL raw type alias.
- [ ] Đổi default fallback từ `ShortAnswer` → `Unknown` (warning component).

### Bước 4 — Visual diff
- [ ] Chạy local Next: `npm run dev` (port 3000) và mở `localhost:3000/practice/<skill>/<sample_id>`.
- [ ] Dùng `src/visual-diff.js` (cần viết): Playwright mở 2 tab (portal + clone) ở viewport 1440×900, screenshot từng panel, diff PNG bằng `pixelmatch`. Threshold 5% mismatch.
- [ ] Lưu kết quả vào `data/visual-diff/<TYPE>/{portal.png, clone.png, diff.png, report.json}`.

### Bước 5 — Functional check (mỗi đề thuộc dạng đó)
- [ ] `src/check-render-each.js` (cần viết): với mỗi đề có dạng đó, mở `localhost:3000/practice/<skill>/<id>`, đợi mount, đếm số input/radio/select theo `qs.questions.length`. Fail nếu mismatch.
- [ ] Output `data/render-check/<TYPE>-report.json` với cột: `id, expected, rendered, ok`.
- [ ] Acceptance: ≥ 95% `ok`. List các đề fail để debug riêng.

### Bước 6 — Review-mode correctness
- [ ] `src/check-review.js`: tự động fill đáp án **sai có chủ ý**, submit, mở review, kiểm tra:
  - input/option đúng được tô xanh
  - input sai tô đỏ
  - đáp án đúng hiển thị bên cạnh
- [ ] Acceptance: 100% trên 3 đề mẫu mỗi dạng.

### Bước 7 — Sign-off
- [ ] Tick checkbox vào `docs/sign-off.md` cho dạng đó.

---

## 6. Acceptance matrix tổng thể

> Plan này coi như **xong dạng X** khi tất cả 7 ô của dạng X có ✅.

| Dạng | 1 Snapshot | 2 Component | 3 Mapping | 4 Visual diff < 5% | 5 Render-check ≥ 95% | 6 Review-check | 7 Sign-off |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| R1 SINGLE_SELECTION | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| R2 GAP_FILLING | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| R3 TABLE_SELECTION | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| R4 MATCHING_ENDINGS | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| R5 MATCHING_HEADINGS | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| R6 MATCHING_FEATURES | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| R7 MULTIPLE_CHOICE_MANY | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| R8 SINGLE_CHOICE | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| R9 NOTE_COMPLETION | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| L1 SINGLE_CHOICE | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| L2 MULTIPLE_CHOICE_ONE | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| L3 MULTIPLE_CHOICE_MANY | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| L4 GAP_FILLING | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| L5 FILL_BLANK | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| L6 FILL-IN-THE-BLANK | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| L7 NOTE_COMPLETION | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| L8 TABLE_SELECTION | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| L9 MATCHING_INFO | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| L10 MATCHING_FEATURES | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| L11 MATCHING_ENDINGS | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| L12 MAP_DIAGRAM_LABEL | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| L13 OTHERS | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

Total = **22 dòng × 7 cột = 154 ô** phải tick.

---

## 7. Per-quiz QA — "check từng đề xem đúng chưa"

Bên cạnh per-type, cần quét **toàn bộ 510 + 638 đề** xem render có lỗi runtime/visual không. 4 lớp QA:

### 7.1. Static/data integrity (đã/sẽ chạy 1 lần)
- `src/qa-data-integrity.js`:
  - Mỗi normalized json: kiểm có `parts`, mỗi part có `questionSets`, mỗi qs có ≥ 1 question.
  - `correctAnswer` không rỗng (trừ OTHERS).
  - `qs.content` chứa đủ marker `{[ans][N]}` khớp `qs.questions.length` (cho fill types).
  - `MAP_DIAGRAM_LABEL` phải có `qs.image`.
  - Ghi `data/qa/data-integrity.csv` columns: `id, skill, type, qsId, issue`.

### 7.2. Render smoke test (Playwright batch)
- `src/qa-render-smoke.js`:
  - Khởi `next start` background.
  - Loop từng id (Reading + Listening), `page.goto` `/practice/<skill>/<id>`, đợi `interactive-question` mount, capture console errors (`page.on('pageerror')`), screenshot viewport.
  - Output `data/qa/render-smoke/<id>.png` + `report.csv`: `id, errors, missingComponent, ok`.
  - Acceptance: 0 `pageerror`, 0 component "Unknown" warning.

### 7.3. Compare with portal screenshot
- `src/qa-visual-vs-portal.js`:
  - Cho mỗi id có sẵn `data/portal-crawl*/<id>/screenshot.png`, screenshot clone tại cùng viewport, diff bằng `pixelmatch`.
  - Output `report.csv`: `id, mismatchPct`.
  - Acceptance: ≤ 10% mismatch trên 90% đề. Đề > 10% mismatch flag để inspect (thường là font/Vietnamese diacritic, content order).

### 7.4. Audio playable check (Listening)
- `src/qa-audio.js`:
  - Mỗi listening id: `fetch HEAD` `/assets/audio/<id>/<part>.mp3`; verify `Content-Length > 10KB`, `Content-Type` contains `audio`.
  - Mở browser, gọi `audio.play()` thử 1s, kiểm `currentTime > 0.5`.
  - Output `report.csv`: `id, partIdx, durationSec, playable`.

### 7.5. Dashboard
- `src/qa-dashboard.js`:
  - Tổng hợp 4 report → 1 file HTML `data/qa/dashboard.html` với bảng mỗi đề: ✅/❌ cho từng lớp.
  - Mở để rà soát trực quan trước khi sign-off v2.

---

## 8. Roadmap thực thi (thời gian ước lượng)

| Tuần | Việc | Output |
|---|---|---|
| **W1** | Snapshot tools — viết `src/snap-all-types.js`, chụp đủ 22 dạng | `data/portal-by-type/*` đầy đủ |
| W1 | Viết `src/visual-diff.js`, `src/qa-data-integrity.js`, `src/qa-render-smoke.js` | infra QA |
| **W2** | Implement R1–R9 (theo thứ tự độ phổ biến: GAP_FILLING → SINGLE_SELECTION → SINGLE_CHOICE → TABLE → MATCHING_FEATURES → NOTE → MATCHING_HEADINGS → MULTIPLE_CHOICE_MANY → MATCHING_ENDINGS) | Reading 9/9 sign-off |
| **W3** | Implement L1–L8 (focus FILL_BLANK + GAP_FILLING + SINGLE_CHOICE — chiếm ~80% volume) | Listening 8/13 sign-off |
| **W4** | Implement L9 MATCHING_INFO, L10–L11, L12 MAP_DIAGRAM_LABEL, L13 OTHERS | Listening 13/13 sign-off |
| **W4.5** | Chạy 7.x QA matrix toàn bộ 1148 đề; fix các fail | dashboard ≥ 95% ✅ |
| **W5** | Buffer + polish (timer, audio gate IELTS thật, NotesPanel, highlight) | v2 release |

---

## 9. Risk & open questions

1. **`MULTIPLE_CHOICE_ONE` vs `SINGLE_CHOICE`** — cùng UI nhưng có thể khác data shape (correctAnswer string vs array length=1). Cần inspect 1 sample mỗi loại trước khi gộp.
2. **`FILL_BLANK` vs `GAP_FILLING`** — cùng renderer nhưng `qs.content` placeholder pattern có thể khác (`{[ans]}` vs `___`). Cần verify regex.
3. **`MATCHING_INFO` listening** — chưa rõ là dropdown hay button-row; portal Vietnamese IELTS có khi dùng letter-buttons. Snapshot trước khi code.
4. **`MAP_DIAGRAM_LABEL`** — image asset có thể là SVG có pre-baked dots hoặc raster cần render dot tự overlay. Inspect HTML portal kỹ.
5. **`OTHERS`** — 14 đề, đa số có `qs.id < 0` (synthetic). Có thể là instruction-only insert. Decide: ẩn hay render passive HTML.
6. **`NOTE_COMPLETION` reading vs listening** — listening có audio cue + part header, reading thì là sub-section trong passage. Layout hơi khác — kiểm spec riêng.
7. **`TABLE_SELECTION` listening fill vs reading select** — đã note ở §3 nhưng phải test ngay khi vào W2.
8. **Mocktest mode** (4 part listening / 3 passage reading liên tiếp) — postpone v3, plan này chỉ làm single-part.

---

## 10. Definition of Done — bản v2

- [ ] 22/22 dạng ✅ trong matrix §6 (154/154 ô).
- [ ] Dashboard QA §7.5 ≥ 95% đề pass smoke + visual.
- [ ] Mọi đề Reading/Listening render không pageerror, không Unknown component.
- [ ] Có `docs/visual/<TYPE>.md` cho 22 dạng (ảnh + spec).
- [ ] Code path: `web/components/qset/*.tsx` không còn fallback im lặng.
- [ ] README cập nhật cách chạy `npm run qa:all` reproduce QA.

---

## Appendix A — Lệnh nhanh

```powershell
# data
node src/snap-all-types.js              # snapshot portal đủ 22 dạng
node src/qa-data-integrity.js
# render
cd web; npm run build; npm run start    # serve clone
node ../src/qa-render-smoke.js
node ../src/qa-visual-vs-portal.js
node ../src/qa-audio.js
node ../src/qa-dashboard.js              # → data/qa/dashboard.html
```

## Appendix B — File mới sẽ tạo

```
src/
  snap-all-types.js
  visual-diff.js
  qa-data-integrity.js
  qa-render-smoke.js
  qa-visual-vs-portal.js
  qa-audio.js
  qa-dashboard.js
  check-render-each.js
  check-review.js
web/components/qset/
  Unknown.tsx
  OthersFallback.tsx
  MatchingEndings.tsx           # tách khỏi MatchingInfo nếu UX khác
  MapDiagramLabel.tsx           # spin off khỏi LabelDiagram nếu cần
docs/visual/
  R1_SINGLE_SELECTION.md
  R2_GAP_FILLING.md
  ... (22 file)
docs/sign-off.md
```
