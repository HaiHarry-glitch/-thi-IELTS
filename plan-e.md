# Plan E — Round 4: Review clients (full-test storage + MC_MANY scoring)

Mục tiêu: sửa 2 lỗi review chưa được phát hiện trong các round trước. Review hiện tại không đọc đúng localStorage cho full-test và chấm sai MC_MANY.

---

## Bug 1 — Review full-test đọc nhầm localStorage key → trang trống

### Hiện trạng

- `ReadingClient` / `ListeningClient` (exam) ghi answers vào:
  ```
  fullTestKey ? `hin_answers_full_${skill}_${fullTestKey}` : `yp_answers_${id}`
  ```
- `ReadingReviewClient` / `ListeningReviewClient` (review) chỉ đọc:
  ```ts
  const STORAGE_KEY = (id: number) => `yp_answers_${id}`;
  ```

→ Khi submit `/thi-thu/full/reading/C20T2` rồi vào review, đáp án không load. Trang review render như user chưa làm gì.

### Files cần sửa

- `web/app/thi-thu/reading/[id]/ReadingReviewClient.tsx`
  - Dòng 12: định nghĩa `STORAGE_KEY` cũ
  - Dòng 123, 127: đọc & ghi answers
- `web/app/thi-thu/listening/[id]/ListeningReviewClient.tsx`
  - Dòng 14, 119, 123 (tương tự)

### Fix

```ts
const STORAGE_KEY = (id: number, skill: "reading" | "listening", fullTestKey?: string) =>
  fullTestKey
    ? `hin_answers_full_${skill}_${fullTestKey}`
    : `yp_answers_${id}`;

// trong component:
const key = STORAGE_KEY(quiz.id, "reading" /* hoặc "listening" */, quiz.fullTestKey);
const saved = localStorage.getItem(key);
```

Lưu ý: `quiz.fullTestKey` đã có sẵn trong `NormalizedQuiz` (loaded bởi `loadFullTestQuiz` trong `lib/data.ts`).

### Verify

1. `/thi-thu/full/reading/C20T2` → làm vài câu → submit → vào review.
2. Trang review phải hiển thị đúng đáp án user đã chọn (highlight xanh/đỏ).
3. Làm tương tự cho `/thi-thu/full/listening/C20T2`.

---

## Bug 2 — Review chấm SAI cho MULTIPLE_CHOICE_MANY

### Hiện trạng

`isAnswerCorrect` hiện tại trong cả 2 review client:

```ts
function isAnswerCorrect(answer, correctValues) {
  if (!answer || correctValues.length === 0) return false;
  const userValues = Array.isArray(answer) ? answer : [answer];
  const normalizedCorrect = correctValues.map((v) => v.trim().toLowerCase()).filter(Boolean);
  return userValues.some((value) => normalizedCorrect.includes(value.trim().toLowerCase()));
}
```

Với MC_MANY (vd correctAnswers = `["A","C"]`):
- User chọn `["A","B"]` → `some()` thấy "A" → return `true` → **đếm là 2 điểm (đúng cả câu)** thay vì 1.
- User chọn `["A","C"]` → return `true` → đếm 2 điểm (đúng).
- User chọn `["B","D"]` → return `false` → 0 điểm (đúng).

Kết quả: user chọn 1 đúng 1 sai vẫn được full điểm câu hỏi → tổng điểm đề luôn cao hơn thực tế.

### Yêu cầu user

> "Đúng bao nhiêu tính điểm bấy nhiêu (đặc biệt là đúng 1 tính 1, đúng 2 tính 2)"

→ Mỗi đáp án đúng = 1 điểm, độc lập với nhau. Đáp án sai = 0 điểm. Đây là chuẩn IELTS thực tế.

### Approach

Đã có sẵn `scoreSlot()` trong `lib/expandQuestions.ts` xử lý đúng logic này:
- Với slot multi: đếm `correctPickCount = user picks ∩ correct set`, slot[i] đúng khi `i < correctPickCount`.
- Tổng điểm = số slot đúng.

→ Refactor review clients dùng `expandAllQuestions` + `scoreSlot` thay vì hàm `isAnswerCorrect` cũ.

### Files cần sửa

- `web/app/thi-thu/reading/[id]/ReadingReviewClient.tsx`
  - Xóa/thay `isAnswerCorrect`, `getCorrectValues`, `answerToText` nếu trùng lặp.
  - Import: `import { expandAllQuestions, scoreSlot } from "@/lib/expandQuestions";`
  - Khu vực render question result và tính tổng score.
- `web/app/thi-thu/listening/[id]/ListeningReviewClient.tsx` — tương tự.

### Fix mẫu

```ts
import { expandAllQuestions, scoreSlot } from "@/lib/expandQuestions";

// Trong component, sau khi load answers:
const allSlots = expandAllQuestions(quiz.parts);
const slotResults = allSlots.map((slot) => {
  const userAnswer = answers[slot.id] as string | string[] | undefined;
  const { answered, isCorrect } = scoreSlot(slot, userAnswer);
  return { slot, answered, isCorrect };
});

const totalCorrect = slotResults.filter(r => r.isCorrect).length;
const totalAnswered = slotResults.filter(r => r.answered).length;
const totalSkipped = allSlots.length - totalAnswered;

// Render từng câu: dùng slotResults lookup theo slot.id + slot.slotIdx
const resultMap = new Map<string, { isCorrect: boolean; answered: boolean }>();
for (const r of slotResults) {
  resultMap.set(`${r.slot.id}-${r.slot.slotIdx}`, { isCorrect: r.isCorrect, answered: r.answered });
}
```

### Hiển thị UI

Với MC_MANY user chọn `["A","B"]` và correct `["A","C"]`:
- Slot 23 (A): ✓ đúng (xanh)
- Slot 24 (B): ✗ sai (đỏ)
- Hiển thị: "1/2 đúng" hoặc 2 badge riêng cho 2 slot.

Nếu UI review hiện tại chỉ hiển thị 1 row per question (không tách slot), cần:
1. Tách 1 question MC_MANY thành N row trong list review (giống footer exam đã làm).
2. Hoặc giữ 1 row nhưng show "N/M correct".

→ **Đề xuất**: tách N row, đồng nhất với footer + ResultClient.

### Verify

1. Tạo answers giả qua console: `localStorage.setItem("yp_answers_7252", JSON.stringify({ 22437: ["A","B"], 22438: ["D","E"] }))` với correctAnswers thật từ data 7252.
2. Vào review → kiểm:
   - Tổng score = số slot đúng (không phải số question đúng).
   - Mỗi slot hiển thị status đúng/sai/skipped chính xác.
3. Lặp lại với full-test (sau khi fix Bug 1).

---

## Side checks bonus

### S1. `parseSavedAnswers` migration có chạy cho full-test key không?

`web/lib/answerStorage.ts` được tạo round 3 để migrate shape cũ `"23-0"`. Khi review đổi sang full-test key, hàm này cũng cần được gọi với key mới.

→ Verify migration logic không phụ thuộc vào key cụ thể, chỉ vào shape data.

### S2. `quiz.fullTestKey` có truyền vào review client không?

Trong `app/thi-thu/full/reading/[key]/page.tsx`:
```tsx
if (sp.type === "review") return <ReadingReviewClient quiz={quiz} />;
```

`quiz` ở đây là kết quả của `loadFullTestQuiz(key, "reading")`. Hàm này đã set `fullQuiz.fullTestKey = summary.key`. ✓ OK.

### S3. ResultClient (practice) đã đúng — đối chiếu

`app/practice/reading/[id]/result/ResultClient.tsx` đã dùng `expandAllQuestions + scoreSlot` đúng cách. Review thi-thu nên copy y nguyên pattern.

→ Cân nhắc gộp: tạo helper chung `lib/reviewScoring.ts`:
```ts
export function computeReviewStats(quiz: NormalizedQuiz, answers: Answers) {
  const allSlots = expandAllQuestions(quiz.parts);
  const slotResults = allSlots.map(slot => ({
    slot,
    ...scoreSlot(slot, answers[slot.id]),
  }));
  return {
    slots: slotResults,
    total: allSlots.length,
    correct: slotResults.filter(r => r.isCorrect).length,
    answered: slotResults.filter(r => r.answered).length,
    skipped: slotResults.filter(r => !r.answered).length,
  };
}
```

Cả 3 nơi (ResultClient, ReadingReviewClient, ListeningReviewClient) dùng chung → giảm risk lệch logic về sau.

---

## Thứ tự thực hiện

| Step | Việc | Effort | Priority |
|---|---|---|---|
| 1 | Tạo `lib/reviewScoring.ts` helper chung | 10 phút | High |
| 2 | Bug 1 — fix `STORAGE_KEY` cả 2 review client | 5 phút | **Critical** |
| 3 | Bug 2 — thay `isAnswerCorrect` bằng `scoreSlot` | 20 phút | **Critical** |
| 4 | UI review tách N row cho MC_MANY (nếu chưa) | 15 phút | High |
| 5 | Refactor ResultClient dùng helper chung | 10 phút | Medium |
| 6 | Verify 4 URL: 1 single reading, 1 full reading, 1 single listening, 1 full listening | 10 phút | High |
| 7 | Cập nhật `bugs-found.md` phần "Round 4 Fixed" | 5 phút | Low |

---

## Verification cuối

- `npx tsc --noEmit` → 0 errors
- `npm run build` → success
- Smoke test:
  - `/thi-thu/reading/7252?mode=review` (có MC_MANY)
  - `/thi-thu/full/reading/C20T2?type=review`
  - `/thi-thu/listening/7378?mode=review`
  - `/thi-thu/full/listening/C20T2?type=review`
- Trên mỗi URL: kiểm
  - Đáp án user load đúng (không trống cho full-test).
  - Tổng score MC_MANY tính theo slot, không theo question.
  - Badge đúng/sai/skipped khớp logic "đúng 1 tính 1".

---

## Quy ước commit

- `fix(review): use full-test storage key in review clients`
- `fix(review): score MC_MANY per slot, not per question`
- `refactor(review): extract shared scoring helper`
- `chore(audit): document round 4 fixes`
