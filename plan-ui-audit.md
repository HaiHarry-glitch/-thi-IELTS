# Plan: UI Audit & Fixes — Reading/Listening exam routes

Goal: rà soát kỹ từng route đề thi (single quiz + full test, reading + listening), phát hiện & sửa các lỗi UI/numbering/state còn sót sau đợt fix full-test trước đó.

---

## A. Lỗi đã biết (cần sửa ngay)

### A1. Single-quiz route gán nhầm "Part 1" cho passage không phải đầu

**Hiện trạng**: `/thi-thu/reading/10420` là passage 3 (câu 27–40) của Cambridge test, nhưng UI in cứng `Part {activePart + 1}` → ra "Part 1 — questions 27-40" trông mâu thuẫn.

**Files**:
- `web/app/thi-thu/reading/[id]/ExamClient.tsx` dòng 326 (header) và 451 (footer tab)
- `web/app/thi-thu/listening/[id]/ListeningClient.tsx` dòng 394, 530

**Approach (2 lựa chọn — chọn 1)**:

1. **Suy ngược từ q.order**: nếu `partStart >= 14 && partStart < 27` → label "Part 2"; `>= 27` → "Part 3"; reading dùng 13/26 split, listening dùng 10/20/30 split.
2. **Bỏ chữ "Part N" khi quiz là single passage** (không phải full-test): chỉ hiển thị tiêu đề passage. Phân biệt bằng `quiz.fullTestKey`:
   - Có `fullTestKey` → vẫn dùng "Part {idx+1}" (đúng vì là full test).
   - Không có → ẩn label, chỉ giữ `currentPart.title` ("Images and Places") + dải số câu.

→ **Khuyến nghị làm cả hai**: ở header dùng cách 2 (single quiz: ẩn "Part N"), ở footer chỉ render 1 tab duy nhất khi quiz có 1 part → label `currentPart.title` thay cho "Part 1".

### A2. Listening: kiểm tra split câu hỏi theo section

Cần verify file `ListeningClient.tsx` đã áp dụng cùng pattern `expandQuestion` + `partSlotOrders` như reading. Mở dòng ~240–260 và đối chiếu với ExamClient.tsx (reading). Nếu chưa, port y nguyên 4 đoạn:
- `partSlotOrders / partStart / partEnd`
- Footer tab render (`pSlots`, `answeredCount`, `progressPct`)
- `handleCancelExam` reset state
- Timer guard `!examStarted`

---

## B. Audit checklist — chạy lần lượt từng URL, ghi kết quả

Cho mỗi URL dưới đây, kiểm 8 mục:

| # | Mục cần kiểm | Tiêu chí PASS |
|---|---|---|
| 1 | Header range câu | Đúng theo natural order (Reading: 1-13/14-26/27-40, Listening: 1-10/11-20/21-30/31-40) |
| 2 | Footer tab numbers | Không trùng lặp, đúng range, slot MC_MANY mở rộng chính xác |
| 3 | "X of Y" count | Y = số slot thực, X tăng khi trả lời |
| 4 | Progress bar | Xanh, fill theo X/Y |
| 5 | Highlight trong passage | Bôi đen → Ctrl+? hoặc menu chuột phải → `<mark>` giữ nguyên qua re-render khi đổi đáp án |
| 6 | Highlight trong instruction (QSetHeader) | Cùng tiêu chí (5) |
| 7 | Matching Headings drag-to-passage | Drop zone hiện trước paragraph đúng letter (A,B,C…), kéo thả OK |
| 8 | Cancel & restart | Bấm "Hủy bài làm lại từ đầu" → modal chọn chế độ hiện lại, state reset, timer dừng |

### B.1 Reading single-quiz

- [ ] `/thi-thu/reading/10420` (passage 3 — "Images and Places")
- [ ] `/thi-thu/reading/6351` (passage thường — sanity check)
- [ ] `/thi-thu/reading/7253` (passage 1 C20T2 — "Manatees")
- [ ] `/thi-thu/reading/7252` (passage 2 C20T2 — có MC_MANY, kiểm slot 23,24,25,26)
- [ ] `/thi-thu/reading/7254` (passage 3 C20T2)

### B.2 Reading full-test

- [ ] `/thi-thu/full/reading/C20T1`
- [ ] `/thi-thu/full/reading/C20T2` (kiểm 3 part: 1-13, 14-26, 27-40)
- [ ] `/thi-thu/full/reading/C20T3`
- [ ] `/thi-thu/full/reading/C19T1` (kiểm test cũ hơn)
- [ ] `/thi-thu/full/reading/C10T1` (test cũ nhất — phát hiện edge case)

### B.3 Listening single-quiz

- [ ] `/thi-thu/listening/7378` (section 4 C20T2)
- [ ] `/thi-thu/listening/7379` (section 1)
- [ ] `/thi-thu/listening/7381` (section 3 — thường có MC_MANY)

### B.4 Listening full-test

- [ ] `/thi-thu/full/listening/C20T2` (kiểm 4 section: 1-10, 11-20, 21-30, 31-40)
- [ ] `/thi-thu/full/listening/C19T1`
- [ ] `/thi-thu/full/listening/C10T1`

---

## C. Khu vực nghi có bug tiềm ẩn — kiểm tra code

### C1. `expandQuestion` (đã sửa) — verify side-effects

Sau khi bỏ điều kiện `qsMaxSel > 1` khỏi `isMulti`, kiểm tra mọi nơi gọi `expandQuestion`:
- `lib/tracking.ts:184`
- `lib/expandQuestions.ts:124` (`expandAllQuestions`)
- `ExamClient.tsx`, `ListeningClient.tsx` (footer)

Đảm bảo không có chỗ nào dựa vào `qsMaxSel` để chia slot cho qs không phải MC_MANY (vd: scoring, persistence). Search `qsMaxSel` toàn repo và đọc context.

### C2. `MatchingHeadingsPlaceholder` & paragraph letter detection

`PassageWithHeadings.tsx`:
- `detectParagraphLetter` chỉ nhận `^[A-Z].\s` — passages dùng `Section A`/`A —`/`A:` có thể fail.
- Đã mở regex hỏi sang `"Paragraph|Section"`. Verify thêm các từ khoá khác: `Part`, `Passage`. Có thể bổ sung.

→ **Đề xuất**: ưu tiên dùng `q.matchingHeadingParagraph` (1-indexed paragraph) khi có, fallback letter detection.

```ts
// Pseudo:
const paragraphIdx = q.matchingHeadingParagraph; // 1-based
// map q → paragraphs[paragraphIdx - 1]
```

### C3. Highlight persistence chỗ khác

`ParagraphChunk` và `InstructionBody` đã `memo`. Kiểm các renderer khác có `dangerouslySetInnerHTML`:
```bash
grep -rn "dangerouslySetInnerHTML" components/ app/
```
Mọi component render passage/instruction/option HTML có khả năng nhận highlight cần `memo` theo prop HTML.

### C4. Review mode (sau submit)

Bấm submit → trang `result/ResultClient.tsx`. Verify:
- Số câu chấm đúng (tổng = totalSlots, không trùng)
- MC_MANY scoring đúng: nếu user chọn 2 đáp án đúng → 2 điểm; 1 đúng 1 sai → 1 điểm
- Matching Headings highlight đáp án đúng/sai
- Quay về exam page không reset answers (xem session storage)

### C5. Cancel flow trong fullscreen

- Vào fullscreen → bấm Cancel → state reset, exit fullscreen, modal hiện lại
- Test trong cả reading và listening
- Test với answers đã có → localStorage `STORAGE_KEY` xóa

### C6. Listening audio

- `partFrom`/`partTo` clamp đúng cho từng section
- Khi đổi part: audio seek đến `listenFrom`
- Submit → audio dừng

---

## D. Sanity check data integrity

Script Node ad-hoc — chạy từ `D:\YouPassClone`:

```bash
node -e "
const fs = require('fs');
const idx = JSON.parse(fs.readFileSync('data/full-tests/_index.json','utf8'));
for (const t of idx) {
  const items = t.skill === 'reading' ? t.passages : t.sections;
  let total = 0;
  const ranges = [];
  for (const it of items) {
    const q = JSON.parse(fs.readFileSync(\`data/normalized/\${t.skill === 'listening' ? 'normalized-listening/' : ''}\${it.id}.json\`,'utf8'));
    const orders = [];
    for (const qs of q.parts[0].questionSets) {
      for (const x of qs.questions) {
        const N = x.type === 'MULTIPLE_CHOICE_MANY' ? Math.max((x.correctAnswers||[]).length, qs.maxSelections || 1, 1) : 1;
        for (let i = 0; i < N; i++) orders.push(x.order + i);
      }
    }
    ranges.push(\`\${Math.min(...orders)}-\${Math.max(...orders)} (\${orders.length})\`);
    total += orders.length;
  }
  if (total !== 40) console.log('!!', t.key, t.skill, 'total=', total, 'ranges=', ranges.join(' | '));
  // Check contiguous global numbering
  // Reading: should be 1-13, 14-26, 27-40
  // Listening: 1-10, 11-20, 21-30, 31-40
}
console.log('done');
"
```

PASS = không có dòng `!!` nào.

---

## E. Thứ tự thực hiện đề xuất

1. **Đọc plan này hết** trước khi sửa.
2. **Fix A1** (single-quiz Part label) — 10 phút.
3. **Fix A2** (đối chiếu listening ↔ reading) — 15 phút.
4. **Chạy script D** — phát hiện test nào có numbering sai.
5. **Audit B.1 → B.4** từng URL, đánh dấu ✗ vào checklist khi gặp lỗi.
6. **Với mỗi lỗi mới** → ghi vào file `bugs-found.md`, gom batch trước khi sửa để tránh sửa-vỡ-sửa.
7. **Sau khi sửa hết** → chạy `npx tsc --noEmit` + smoke test 3 URL ngẫu nhiên.

---

## F. Quy ước commit

Mỗi nhóm fix → 1 commit:
- `fix(exam): hide Part label on single-quiz routes`
- `fix(exam): align listening client with reading slot expansion`
- `fix(passage): use matchingHeadingParagraph for drop-zone placement`
- `chore(audit): document remaining UI issues`
