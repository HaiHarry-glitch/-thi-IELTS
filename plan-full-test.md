# Plan – Chế độ làm Full Test (Cambridge IELTS)

## 1. Mục tiêu

Cho phép học sinh chọn **làm cả một đề Cambridge IELTS đầy đủ** thay vì làm từng passage rời rạc:
- **Reading**: 3 passages × ~13–14 câu = ~40 câu / 60 phút
- **Listening**: 4 sections × ~10 câu = 40 câu / ~30 phút + 10 phút chuyển đáp án

Mỗi full test = 1 "key" `[CxTy]` (ví dụ `[C18T2]`).

---

## 2. Hiện trạng dữ liệu

Đã quét `data/normalized/_index.json` và `data/normalized-listening/_index.json` để tìm pattern `[CxTy]` trong title.

### Reading
| Cambridge | Số test đủ 3/3 | Trạng thái |
|-----------|----------------|------------|
| **C14 → C20** | **7 × 4 = 28 test** | ✅ Đủ — làm full test được ngay |
| C1 – C13 | rải rác 1–2 passage/test | ⚠️ Thiếu — cần cào thêm |

→ Tổng cộng **28 full-test Reading sẵn sàng**.

### Listening
| Cambridge | Số test đủ 4/4 | Trạng thái |
|-----------|----------------|------------|
| **C15, C17, C18, C20** (phần lớn), **C19** (3/4 test) | ~20 test | ✅ Đủ |
| C13, C14, C16 | 3/4 section | ⚠️ Thiếu 1 section/test |
| C1 – C12 | rải rác 1–2 section | ⚠️ Thiếu nhiều |

→ Tổng cộng **~20 full-test Listening sẵn sàng**.

### Việc cần cào thêm (TODO – cần Chrome login)
- Reading: bù các passage còn thiếu cho C1–C13 (mỗi test cần đủ 3 passage)
- Listening: bù section còn thiếu cho C13, C14, C16 (mỗi test cần đủ 4 section)
- → Sau khi user mở Chrome đăng nhập YouPass, tôi sẽ chạy lại crawler để bổ sung.
- Có thể tạm release với 28 Reading + 20 Listening đang đủ, scrape bù sau.

---

## 3. Kiến trúc dữ liệu

### 3.1 Index mới cho full-test
Tạo file `data/full-tests/_index.json` được build sẵn (offline script), schema:

```json
[
  {
    "key": "C18T2",
    "cambridge": 18,
    "test": 2,
    "skill": "reading",
    "title": "Cambridge 18 - Test 2 (Reading)",
    "passages": [
      { "id": 7110, "order": 1, "title": "The steam car", "questions": 13 },
      { "id": 7111, "order": 2, "title": "Living with vending machines", "questions": 13 },
      { "id": 7112, "order": 3, "title": "What is exploration?", "questions": 14 }
    ],
    "totalQuestions": 40,
    "durationMin": 60
  },
  {
    "key": "C18T2",
    "skill": "listening",
    "title": "Cambridge 18 - Test 2 (Listening)",
    "sections": [
      { "id": 8521, "order": 1, "questions": 10 },
      ...
    ],
    "totalQuestions": 40,
    "durationMin": 30
  }
]
```

### 3.2 Script build index
File mới: `scripts/build-full-test-index.ts`
- Đọc `data/normalized/_index.json` (reading) và `data/normalized-listening/_index.json`
- Regex `^\[C(\d+)T(\d+)\]` lấy ra `cambridge`, `test`
- Gom theo `(cambridge, test, skill)`, **chỉ giữ những key có đúng N passage/section** (3 cho reading, 4 cho listening)
- Sort các passage theo thứ tự xuất hiện trên YouPass (có thể dựa vào quiz_code hoặc id)
- Ghi `data/full-tests/_index.json`
- Chạy 1 lần mỗi khi có dữ liệu mới: `npm run build:full-tests`

### 3.3 Loader runtime
File mới: `web/lib/fullTest.ts`
```typescript
export interface FullTestSummary { key, skill, title, passages|sections, totalQuestions, durationMin }
export function getFullTests(skill): FullTestSummary[]
export function getFullTest(key, skill): FullTestSummary | null
```

File mới: `web/lib/data.ts` – thêm hàm:
```typescript
export function loadFullTestQuiz(key: string, skill): NormalizedQuiz
// Đọc 3 (hoặc 4) file normalized JSON, gộp parts lại, đánh lại `order` số câu liên tục (1→40)
// Trả về object NormalizedQuiz giả như là 1 đề duy nhất với 3 parts (reading) hoặc 4 parts (listening)
```

→ Tận dụng được toàn bộ `ExamClient` / `ListeningClient` hiện tại mà **không cần viết lại UI exam**.

---

## 4. Routes mới

| Route | Nội dung |
|-------|----------|
| `/luyen-thi/ielts/full-test` | Trang chọn full test (xem mục 5) |
| `/thi-thu/full/reading/[key]` | Exam page – reading full test (3 passage) |
| `/thi-thu/full/listening/[key]` | Exam page – listening full test (4 section) |
| `/practice/full/reading/[key]/result` | Result page giống reading hiện tại |
| `/practice/full/listening/[key]/result` | Result page giống listening hiện tại |

Mỗi route mới chỉ là wrapper mỏng:
```typescript
// app/thi-thu/full/reading/[key]/page.tsx
const quiz = loadFullTestQuiz(params.key, "reading");
return <ExamClient quiz={quiz} />;
```

---

## 5. UI – Trang chọn Full Test

### 5.1 Path: `/luyen-thi/ielts/full-test`

### 5.2 Layout (theo phong cách Neo-Brutalism hiện tại với `bg-[#F5F1E9]`)

```
┌──────────────────────────────────────────────────────┐
│  HIN NAVIGATOR · LUYỆN THI IELTS                     │
├──────────────────────────────────────────────────────┤
│  // FULL TEST · CAMBRIDGE                            │
│                                                      │
│  Làm cả 1 đề (3 passage / 4 section) đúng format thi│
│                                                      │
│  [ Reading 60' ]  [ Listening 30' ]    ← tab         │
│                                                      │
│  Cambridge:  [14] [15] [16] [17] [18] [19] [20]      │
│              ━━━━                  (active = #FFD700)│
│                                                      │
│  ┌──────────┬──────────┬──────────┬──────────┐      │
│  │ TEST 1   │ TEST 2   │ TEST 3   │ TEST 4   │      │
│  │ ──────── │ ──────── │ ──────── │ ──────── │      │
│  │ 40 câu   │ 40 câu   │ 40 câu   │ 40 câu   │      │
│  │ 60 phút  │ 60 phút  │ 60 phút  │ 60 phút  │      │
│  │          │          │          │          │      │
│  │ Passage 1│ Passage 1│ Passage 1│          │      │
│  │ Living   │ The steam│ ...      │          │      │
│  │ dunes    │ car      │          │          │      │
│  │          │          │          │          │      │
│  │ [BẮT ĐẦU]│ [BẮT ĐẦU]│ [BẮT ĐẦU]│ [BẮT ĐẦU]│      │
│  └──────────┴──────────┴──────────┴──────────┘      │
└──────────────────────────────────────────────────────┘
```

### 5.3 Component mới: `web/app/luyen-thi/ielts/full-test/page.tsx`
- Tab chuyển Reading/Listening (giống `/luyen-thi/ielts/reading` hiện có)
- Hàng filter Cambridge: button 14 → 20 (chỉ hiện những cambridge có ≥1 test đủ)
- Grid 4 card / hàng (sm:2, md:4): mỗi card = 1 test, hiển thị tên 3 passage / 4 section bên trong
- Nút "BẮT ĐẦU" → link tới `/thi-thu/full/{skill}/{key}`

### 5.4 Entry point từ trang chính
Thêm card "Làm full đề" trên home page (`/luyen-thi/ielts/reading` & `/luyen-thi/ielts/listening`):
- Card nổi bật ở đầu danh sách, bg `#FFD700`, link `/luyen-thi/ielts/full-test`
- Hoặc thêm tab thứ 3 trên nav: `Reading | Listening | Full Test`

---

## 6. Exam page – Điều chỉnh nhỏ

`ExamClient` và `ListeningClient` đã hỗ trợ multi-part rồi (tab Part 1 / Part 2 / Part 3 dưới đáy). Do `loadFullTestQuiz` gộp 3 passage thành 3 `parts`, **gần như không cần sửa code exam**.

Những chỗ cần đụng tới:
1. **Title** trên header: dùng `Cambridge 18 - Test 2 (Reading)` thay vì tên 1 passage.
2. **Submit → result route**: detect `key` thay vì `quiz.id` → push tới `/practice/full/reading/${key}/result`.
   - Phương án đơn giản: thêm prop `isFullTest?: boolean` + `fullTestKey?: string` vào `ExamClient`, condition route trong `doSubmit`.
3. **localStorage key**: dùng `yp_answers_full_${key}` thay vì `yp_answers_${quiz.id}` để không clash với chế độ làm passage rời.
4. **Tracking payload**: thêm field `fullTestKey` vào AttemptPayload (cho phép phân tích kết quả theo đề thay vì theo passage). Quiz ID gửi đi vẫn là id của passage đầu tiên hoặc một id ảo (cần quyết định – tôi đề xuất giữ id ảo dạng `-${cambridge}${test}` ví dụ `-182` để Sheets dễ filter).

---

## 7. Result page – Điều chỉnh

`ResultClient` hiện tính điểm trên `quiz.parts` đã có sẵn → vẫn dùng được vì `loadFullTestQuiz` trả parts đầy đủ.

Cần thêm:
- Section "Điểm theo passage" (Reading) hoặc "Điểm theo section" (Listening):
  ```
  Passage 1 (Living dunes):     12/13
  Passage 2 (The steam car):     9/13
  Passage 3 (Exploration):      11/14
  ───────────────────────────────────
  Tổng:                         32/40
  Band điểm:                    7.0
  ```
- **Band score conversion** (mapping `correct → band` theo bảng chuẩn IELTS Reading/Listening):
  ```
  Reading Academic:
    39-40 → 9.0    38 → 8.5    36-37 → 8.0
    34-35 → 7.5    33 → 7.5    30-32 → 7.0
    27-29 → 6.5    23-26 → 6.0    19-22 → 5.5  ...
  ```
  Tạo `web/lib/bandScore.ts` chứa bảng + hàm `getBand(correct: number, skill: "reading"|"listening")`.

---

## 8. Tracking & Sheets

Khi student làm full test ở chế độ Fullscreen (login bắt buộc):
- `AttemptPayload.attempt.quizId` = id ảo `-${cambridge}${test}` hoặc giữ id passage đầu
- Thêm trường mới `fullTestKey: "C18T2"` vào `attempt`
- Thêm trường `band: number` (computed từ `correct/totalQ`)
- GAS `Code.gs` cần update sheet header & `submitAttempt()` để chấp nhận thêm 2 trường này
  - Optional: tạo sheet riêng `attempts_fulltest` để không lẫn với attempts của passage lẻ

---

## 9. Thứ tự triển khai (đề xuất)

**Phase 1 – MVP, dùng data có sẵn (28 Reading + 20 Listening):**
1. ✅ Đã có data → build `data/full-tests/_index.json` ngay (script `scripts/build-full-test-index.ts`)
2. Viết `web/lib/fullTest.ts` + `loadFullTestQuiz` trong `data.ts`
3. Tạo trang `/luyen-thi/ielts/full-test` (chọn đề)
4. Tạo route `/thi-thu/full/{skill}/[key]` (wrapper mỏng quanh ExamClient/ListeningClient)
5. Pass `isFullTest` + `fullTestKey` xuống ExamClient để fix submit route + localStorage key
6. Tạo route `/practice/full/{skill}/[key]/result` (wrapper mỏng quanh ResultClient + band score)
7. Thêm `web/lib/bandScore.ts` + hiển thị band trên result
8. Thêm card "Full Test" hoặc tab thứ 3 vào nav

**Phase 2 – Bổ sung data:**
9. Mở Chrome để user login → tôi cào bù các passage/section thiếu của C1–C13 (Reading) và C13/C14/C16 (Listening).
10. Re-run build script → có thêm full test.

**Phase 3 – Polish:**
11. Update GAS sheet schema để track `fullTestKey` + `band`.
12. Dashboard student: hiển thị lịch sử full test riêng.

---

## 10. Câu hỏi & yêu cầu ảnh từ user

Bạn có thể chụp giúp tôi vài ảnh tham khảo cho UI **trang chọn full test** (nếu có):

1. **Trang chọn đề chính thức của YouPass / British Council** – để xem họ xếp Cambridge 14/15/16... ra sao
2. **Trang kết quả full test của YouPass** – có band score conversion chưa, hiển thị thế nào
3. **Có muốn audio listening tự động chuyển section** không? (giống thi thật: hết section 1 nhạc liền chạy section 2, không bấm next)

Bạn xác nhận:
- [ ] OK với "id ảo" `-${cambridge}${test}` cho quiz id của full test (để khỏi clash với passage lẻ)?
- [ ] OK release MVP với 28 Reading + 20 Listening trước, scrape bù C1–C13 sau?
- [ ] Có cần thêm tab thứ 3 "Full Test" trên nav chính, hay chỉ link rời ngoài?
- [ ] Khi cần cào dữ liệu — bạn login YouPass trong Chrome rồi báo tôi, tôi dùng MCP Chrome scrape ngay.
