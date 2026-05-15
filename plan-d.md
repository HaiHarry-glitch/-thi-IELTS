# Plan D — Bug fixes round 3

Mục tiêu: sửa các bug còn sót sau khi đã làm xong `plan-ui-audit.md`. Tất cả bug dưới đây đã được verify bằng cách đọc code, không chỉ giả thuyết.

---

## 1. `findQuestionForParagraph` so sánh sai kiểu — luôn trả về `undefined`

**File**: `web/components/MatchingHeadingsExam.tsx` dòng 13–16

```ts
export function findQuestionForParagraph(qs: QuestionSet | null, letter: string): Question | undefined {
  if (!qs) return;
  return qs.questions.find((q) => (q as any).matchingHeadingParagraph === letter);
}
```

**Vấn đề**: `matchingHeadingParagraph` trong data thực tế là **number** (vd `2`, `3`, `5`) nhưng `letter` truyền vào là chuỗi `"A"`, `"B"`, … → `=== ` không bao giờ true. Hàm hiện không được gọi từ đâu cả (đã grep), nhưng nó vẫn xuất khẩu và TS không bắt được vì cast `as any`.

**Fix**:
1. Xác định lại signature: nếu paragraph là chỉ số 1-based số nguyên, hàm nên nhận `letter: string` rồi convert sang số (`letter.charCodeAt(0) - 64`).
2. Hoặc đơn giản hơn: xóa hàm này (đã unused).

**Đề xuất**: xóa — `PassageWithHeadings.tsx` đã tự build map `questionByLetter` riêng, không cần helper này.

---

## 2. `qset/types.ts` và `lib/data.ts` khai báo type sai

**Files**:
- `web/components/qset/types.ts` dòng 16: `matchingHeadingParagraph: string | null`
- `web/lib/data.ts` dòng 52: `matchingHeadingParagraph: string | null`

**Vấn đề**: data thật chứa `number`. Type khai báo dối → TS không cảnh báo khi gọi `.trim()`/`.toUpperCase()` trên number (đã từng crash route `/thi-thu/reading/10420`).

**Fix**: đổi sang `string | number | null`. Cập nhật mọi consumer dùng coercion `String(value)` trước khi gọi method string.

Search & update consumers:
```bash
grep -rn "matchingHeadingParagraph" web/
```
- `PassageWithHeadings.tsx:57` — đã có `String(...)` rồi ✓
- `components/qset/MatchingHeadings.tsx:93` — `{q.matchingHeadingParagraph || q.text}` an toàn (React render number) ✓
- `MatchingHeadingsExam.tsx:15` — xóa hàm (mục 1).

---

## 3. PracticeClient không expand MC_MANY → `totalQ` sai

**File**: `web/app/practice/reading/[id]/PracticeClient.tsx` dòng 29–38

```ts
const allQuestions = quiz.parts.flatMap((p) =>
  p.questionSets.flatMap((qs) => qs.questions)
);
const totalQ = allQuestions.length;
const answeredQ = allQuestions.filter((q) => { ... }).length;
```

**Vấn đề**: với passage có MULTIPLE_CHOICE_MANY (vd C20T2 passage 2: q23 maxSel=2 = 2 slot, q25 maxSel=2 = 2 slot), `allQuestions.length = 11` thay vì 13. Header "13/40" sẽ hiện sai.

**Fix**: import `expandQuestion` và đếm slot:
```ts
import { expandQuestion } from "@/lib/expandQuestions";

const allSlots = quiz.parts.flatMap((p) =>
  p.questionSets.flatMap((qs) =>
    qs.questions.flatMap((q) => expandQuestion(q, qs.maxSelections)),
  ),
);
const totalQ = allSlots.length;
const answeredQ = allSlots.filter((slot) => {
  const ans = answers[slot.id];
  const arr = Array.isArray(ans) ? ans : ans ? [String(ans)] : [];
  return slot.isMultiSlot ? arr.length > slot.slotIdx : !!ans && ans !== "";
}).length;
```

---

## 4. Review/Result page có thể đếm lại sai do `expandQuestion` đã đổi

**File**: `web/app/practice/reading/[id]/result/ResultClient.tsx`

**Vấn đề**: sau khi sửa `expandQuestion` chỉ expand MC_MANY, các test cũ user đã làm trước đây (đáp án lưu localStorage theo shape cũ) có thể bị tính điểm khác. Cụ thể với `NOTE_COMPLETION maxSel=6`:
- Trước fix: 6 slot/q → user gõ "Smith" vào q33 lưu `answers[44953]="Smith"` (vẫn 1 string), nhưng scoring lúc trước check `slot.isMultiSlot=true` → `slotIdx<correctPickCount` → bị tính sai mọi cách.
- Sau fix: 1 slot/q → scoring single-answer chuẩn xác.

**Action**: không cần code fix, nhưng cần verify:
1. Mở `/practice/reading/{id}/result` với 1 quiz có MATCHING_NAMES (vd 10420) sau khi đã làm bài → kiểm cột "correct/wrong/skipped" có ra số hợp lý.
2. Test 1 quiz có MC_MANY (vd 7252) → kiểm 2 đáp án đúng = 2 điểm.

Nếu thấy `typeStats` không khớp tổng 40 → kiểm `expandAllQuestions` và `scoreSlot`.

---

## 5. Drag-drop matching headings không hoạt động trên mobile/touch

**File**: `web/components/MatchingHeadingsExam.tsx` (cả `MatchingHeadingsRight` và `MatchingHeadingsPlaceholder`)

**Vấn đề**: chỉ dùng HTML5 drag/drop API (`onDragStart`, `onDrop`). API này không bắn event trên iOS/Android touch. Mobile user sẽ kẹt không kéo được.

**Fix (2 phương án)**:

**A. Thêm fallback tap-to-select** (đơn giản, low risk):
- Right panel: tap chip → set state `pickedCode`.
- Placeholder: nếu `pickedCode` đang có và tap vào placeholder → onAnswer.
- Thêm visual indicator chip "đang được chọn".

**B. Dùng library `@dnd-kit/core`** (chuẩn hơn, tốn công).

→ Đề xuất A.

```ts
// Trong cha (ExamClient/PassageWithHeadings) hoặc context:
const [pickedCode, setPickedCode] = useState<string | null>(null);

// Right chip:
onClick={() => setPickedCode(opt.option === pickedCode ? null : opt.option)}
className={`... ${opt.option === pickedCode ? "ring-2 ring-blue-500" : ""}`}

// Placeholder:
onClick={() => {
  if (pickedCode) { onAnswer(question.id, pickedCode); setPickedCode(null); }
}}
```

---

## 6. Listening: kiểm `partEnd` còn dùng raw `q.order` không

**File**: `web/app/thi-thu/listening/[id]/ListeningClient.tsx`

**Action**: mở file, tìm khu vực tính `partStart`/`partEnd`/header "questions X-Y". Nếu còn dùng `Math.max(...q.order)` (raw) thay vì slot-expanded → sửa giống reading dòng 247–251.

---

## 7. Listening AudioPlayer: gate khi chưa start không clamp `listenFrom`

**File**: `web/app/thi-thu/listening/[id]/ListeningClient.tsx` dòng ~465

**Vấn đề tiềm ẩn**: khi đổi `activePart`, key `${activePart}-${audioSrc}` remount AudioPlayer. Nhưng nếu `listenFrom`/`listenTo` không truyền vào → audio play từ đầu file thay vì section tương ứng. Trong full test (1 file audio dùng cho 4 section), bug này lộ rõ.

**Action**:
1. Verify `currentPart.listenFrom`/`listenTo` có pass vào `<AudioPlayer />` props không.
2. Trong `AudioPlayer`, khi `from != null` → setCurrentTime(from) trên mount.
3. Khi `currentTime >= to` → pause.

---

## 8. `expandQuestion` — case `q.correctAnswers.length > qsMaxSel`

**File**: `web/lib/expandQuestions.ts` dòng 55

```ts
const N = Math.max(correctValues.length, qsMaxSel ?? correctValues.length, 1);
```

**Vấn đề**: nếu data có MC_MANY với `correctAnswers=["A","B","C"]` nhưng `maxSelections=2` (user chỉ được chọn 2) → N=3, sinh 3 slot nhưng user chỉ chọn được 2 → 1 slot luôn skipped. Có thể đúng theo design, nhưng đáng để document hoặc clamp về `qsMaxSel`.

**Action**: kiểm dataset xem có quiz nào correctAnswers.length > maxSelections không (script Node). Nếu có → quyết định: tính theo maxSelections (slot count = N user chọn) hay correctAnswers.length (slot count = N đáp án đúng).

```bash
node -e "
const fs=require('fs'),path=require('path');
for (const dir of ['data/normalized','data/normalized-listening']) {
  for (const f of fs.readdirSync(dir).filter(x=>x.endsWith('.json')&&x!=='_index.json')) {
    const q=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
    for (const p of q.parts) for (const qs of p.questionSets) for (const x of qs.questions) {
      if (x.type==='MULTIPLE_CHOICE_MANY' && (x.correctAnswers||[]).length !== (qs.maxSelections||0)) {
        console.log(f, 'q'+x.id, 'correct='+x.correctAnswers.length, 'maxSel='+qs.maxSelections);
      }
    }
  }
}"
```

---

## 9. localStorage migration — đáp án cũ có thể stale

**Vấn đề**: user đã làm bài trước khi sửa logic. localStorage giữ shape cũ:
- MATCHING_NAMES: lưu `answers[qId]="John"` (string đơn) — vẫn dùng OK.
- MC_MANY: lưu `answers[qId]=["A","C"]` — vẫn OK.
- Nhưng nếu code cũ từng lưu nhầm shape (vd `{"23-0":"A","23-1":"C"}`) → giờ đọc lại không thấy → trông như chưa làm.

**Action**: thêm migration:
```ts
useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY(...));
  if (!saved) return;
  let parsed = JSON.parse(saved);
  // Migrate old slot-keyed shape → question-keyed array
  for (const k of Object.keys(parsed)) {
    if (k.includes("-")) {
      const [qId, slotIdx] = k.split("-");
      parsed[qId] = parsed[qId] || [];
      parsed[qId][Number(slotIdx)] = parsed[k];
      delete parsed[k];
    }
  }
  setAnswers(parsed);
}, ...);
```

Nếu không cần migration (không có shape cũ) → skip.

---

## 10. ResultClient: `cleanTitle` không bóc full-test prefix lặp

**File**: `web/lib/title.ts` (cần đọc)

**Vấn đề tiềm ẩn**: full-test title có thể là `"Cambridge 20 - Test 2 (Reading) - Reading"` → `cleanTitle` cần xử lý.

**Action**: mở `lib/title.ts`, kiểm regex. Test với 5 title mẫu (single, full reading, full listening, cambridge cũ).

---

## Thứ tự thực hiện đề xuất

| Step | Bug | Effort | Priority |
|---|---|---|---|
| 1 | Mục 1 — xóa `findQuestionForParagraph` | 2 phút | Low (unused but tidy) |
| 2 | Mục 2 — fix type `matchingHeadingParagraph` | 5 phút | Medium |
| 3 | Mục 3 — PracticeClient expand slot | 10 phút | **High** |
| 4 | Mục 6 — listening partEnd verify | 5 phút | **High** |
| 5 | Mục 7 — audio listenFrom/listenTo | 15 phút | **High** (lộ rõ trên full-test) |
| 6 | Mục 4 — verify scoring (no code, just QA) | 10 phút | Medium |
| 7 | Mục 8 — script kiểm correctAnswers vs maxSel | 5 phút | Low |
| 8 | Mục 5 — drag-drop fallback tap-to-select | 30 phút | Medium (mobile UX) |
| 9 | Mục 9 — localStorage migration | 10 phút (nếu cần) | Low |
| 10 | Mục 10 — cleanTitle | 5 phút | Low |

**Sau mỗi step**:
- Chạy `npx tsc --noEmit`
- Smoke test 1 URL liên quan
- Commit riêng

---

## Verification cuối

Sau khi fix toàn bộ:
1. Build: `cd web && npm run build`
2. Type check: `npx tsc --noEmit`
3. Run dev: `npm run dev`
4. Test 5 URL ngẫu nhiên (1 full reading, 1 full listening, 1 single reading, 1 single listening, 1 practice)
5. Cập nhật `bugs-found.md` thêm phần "Round 3 Fixed"
