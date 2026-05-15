# 📘 PLAN — GĐ 5 + GĐ 6 (Wrap-up Listening)

> **Tình trạng:** GĐ 0–4 hoàn tất. Source quiz 1579 đã bị xoá khỏi YouPass.
> **Mục tiêu:** Đóng GĐ 5 (mark 1579) + GĐ 6 (smoke test cuối + báo cáo)
> **Tổng thời gian:** ~25 phút

---

## GIAI ĐOẠN 5 — Mark 1579 "unavailable" (10 phút)

Vì source thực sự bị xoá, không thể re-crawl. Ta sẽ **đánh dấu unavailable** thay vì xoá hẳn (giữ metadata cho audit log).

### Bước 5.1 — Backup file 1579 (10 giây)

```powershell
Copy-Item data\normalized-listening\1579.json data\normalized-listening\1579.json.bak
```

### Bước 5.2 — Thêm flag `unavailable` vào 1579 (1 phút)

Chạy lệnh sau (1 dòng, copy nguyên):

```powershell
node -e "const fs=require('fs');const p='./data/normalized-listening/1579.json';const d=JSON.parse(fs.readFileSync(p,'utf8'));d.unavailable=true;d.unavailableReason='Source removed from YouPass';d.unavailableMarkedAt='2026-05-13';fs.writeFileSync(p,JSON.stringify(d,null,2));console.log('Marked 1579 unavailable');"
```

Verify:

```powershell
node -e "const d=JSON.parse(require('fs').readFileSync('./data/normalized-listening/1579.json','utf8'));console.log({id:d.id,title:d.title,unavailable:d.unavailable,reason:d.unavailableReason});"
```

Kết quả mong đợi:
```
{ id: 1579, title: '[C7T1] - ...', unavailable: true, reason: 'Source removed from YouPass' }
```

### Bước 5.3 — Cập nhật route để return 404 khi unavailable (2 phút)

Mở `D:\YouPassClone\web\app\thi-thu\listening\[id]\page.tsx` → tìm dòng:

```tsx
if (!quiz) notFound();
```

Thay thành:

```tsx
if (!quiz || quiz.unavailable) notFound();
```

> 💡 Cần TS biết về field `unavailable`. Mở `web/lib/data.ts`, tìm interface `NormalizedQuiz` (gần dòng 90 nơi có `isPublic`), thêm dòng:
> ```ts
> unavailable?: boolean;
> unavailableReason?: string;
> ```

Verify TS:
```powershell
Set-Location web
npx tsc --noEmit
Set-Location ..
```

Mong đợi: **không lỗi**.

### Bước 5.4 — Cập nhật `audit-listening-data.js` để tách unavailable khỏi broken (2 phút)

Mở `src/audit-listening-data.js` (nếu chưa có thì tạo theo template — script tương tự `audit-reading-data.js`). Sửa logic broken check:

```js
// Thay đoạn xác định "broken":
if (d.unavailable) {
  unavailable++;
  continue;
}
if (totalQsets === 0 || totalQuestions === 0) {
  broken.push({ id, title: d.title });
} else {
  ok++;
}
```

In thêm dòng:
```js
console.log(`  ⊘ Unavailable:  ${unavailable}`);
```

### Bước 5.5 — Chạy audit lại (10 giây)

```powershell
node src\audit-listening-data.js
```

Kết quả mong đợi:
```
═══════════════════════════════════════
  Total quizzes: 638
  ✅ OK:          637
  ⊘ Unavailable: 1
  ❌ Broken:      0
═══════════════════════════════════════
```

### Bước 5.6 — Test browser

Mở http://localhost:3000/thi-thu/listening/1579 → phải hiển thị **404 page** (không phải white screen / vỡ UI).

> ✅ Done GĐ 5 khi 1579 ra 404 + audit báo `Unavailable: 1`.

---

## GIAI ĐOẠN 6 — Smoke test cuối + Báo cáo (15 phút)

### Bước 6.1 — Test 2 types còn thiếu (5 phút)

Plan v2 gọi 8 đề. Bạn đã test 7. Còn 2 type chưa test cụ thể:

| Type | URL test | Kỳ vọng |
|---|---|---|
| MULTIPLE_CHOICE_ONE (Listening single radio) | http://localhost:3000/thi-thu/listening/8705 | Câu 4-5 "Choose A/B/C", radio đơn |
| NOTE_COMPLETION | (chọn 1 đề có type NOTE_COMPLETION — list dưới) | Inputs inline với ghi chú |

Tìm đề NOTE_COMPLETION:

```powershell
node -e "const fs=require('fs');for (const f of fs.readdirSync('./data/normalized-listening').filter(x=>x.endsWith('.json')&&!x.startsWith('_'))){const d=JSON.parse(fs.readFileSync('./data/normalized-listening/'+f,'utf8'));for (const p of (d.parts||[]))for (const qs of (p.questionSets||[])){if (qs.type==='NOTE_COMPLETION'){console.log(f.replace('.json',''),d.title);break;}}}" | Select-Object -First 5
```

Lấy 1 ID, mở http://localhost:3000/thi-thu/listening/{ID} → verify:
- [ ] Inputs render trong layout note (bullets, indents)
- [ ] Typing không lag
- [ ] Số placeholder hiển thị ở giữa ô

### Bước 6.2 — Kiểm tra MCQ_ONE (3 phút)

URL: http://localhost:3000/thi-thu/listening/8705

Checklist:
- [ ] Question 4 "What do they think about the essay writing?" với 3 options A/B/C
- [ ] Click radio → chỉ chọn được 1
- [ ] Row không có highlight xanh (vì là single, không phải many)
- [ ] Sau chọn, badge số 4 viền xanh `border-[#418ec8]`

### Bước 6.3 — Regression check Reading (2 phút)

Mở 3 đề Reading từng loại để chắc chắn không regression:

| URL | Kiểm tra |
|---|---|
| http://localhost:3000/thi-thu/reading/7248 | TABLE_SELECTION + MATCHING + GAP_FILLING — tất cả render đúng |
| http://localhost:3000/thi-thu/reading/1027 | GAP_FILLING 7 ô inline trong list `<ul>` (cái này test DOMParser fix) |
| http://localhost:3000/thi-thu/reading/1039 | MATCHING_HEADINGS + GAP_FILLING |

### Bước 6.4 — Final audit cả Reading + Listening (1 phút)

```powershell
node src\audit-reading-data.js
node src\audit-listening-data.js
```

Mong đợi:
```
Reading:   OK 510 / Broken 0
Listening: OK 637 / Unavailable 1 / Broken 0
```

### Bước 6.5 — Generate báo cáo cuối (4 phút)

Tạo file `D:\YouPassClone\FINAL_REPORT.md` với nội dung:

```markdown
# Final Report — Reading + Listening Data & UI

## Data
- Reading: 510 / 510 OK
- Listening: 637 OK / 1 unavailable (1579, source removed) / 0 broken

## UI components fixed
- GapFilling (DOMParser approach)
- MultipleChoice (range badge, row highlight, accent checkbox)
- TableSelection (cell highlight, reusable props)
- LabelDiagram (map + table side-by-side)
- QSetRenderer (heuristic routing for map-table)
- ExamClient (debounced localStorage write)

## Tests passed
- 7 đề listening (FILL_BLANK, GAP_FILLING, MAP_DIAGRAM, MCQ_MANY, MATCHING_INFO, TABLE_SELECTION, MCQ_ONE)
- 1 đề listening NOTE_COMPLETION
- 3 đề reading regression (7248, 1027, 1039)
- TS + ESLint pass
- pageErrors: 0 trên tất cả URLs test

## Known issues
- 1 ESLint warning: <img> in LabelDiagram (non-critical)
- Optional: migrate to next/image for better perf
```

---

## ✅ HOÀN THÀNH KHI

1. ✅ http://localhost:3000/thi-thu/listening/1579 → 404
2. ✅ Audit listening: `OK 637 / Unavailable 1 / Broken 0`
3. ✅ MCQ_ONE đề 8705 render đúng radio (không highlight row)
4. ✅ NOTE_COMPLETION đề test render inline trong list
5. ✅ Reading 7248, 1027, 1039 không regression
6. ✅ `FINAL_REPORT.md` tồn tại

---

## 🆘 TROUBLESHOOTING

### `1579` vẫn lên page (không 404)
→ Check `web/lib/data.ts` đã thêm field `unavailable` chưa. TS strict có thể strip field nếu interface không khai báo.

### `audit-listening-data.js` không tồn tại
→ Copy `src/audit-reading-data.js` thành `src/audit-listening-data.js`, đổi đường dẫn `NORM_DIR` thành `data/normalized-listening`, thêm logic check `d.unavailable`.

### Đề NOTE_COMPLETION không tìm thấy
→ Test bằng đề khác có cùng layout: bất kỳ đề nào có `qs.type === 'GAP_FILLING'` chứa `<ul><li>` đều là note-style. Đề mẫu: bất kỳ đề `[Actual Test]` thường có note completion ở Part 1.

---

## 📞 SAU KHI XONG

Reply:
- **"Xong"** + screenshots nếu có lỗi
- **"Audit ổn"** kèm output audit cuối + Final Report

Tôi sẽ confirm và close session, hoặc đề xuất bước tiếp (Gallery audit, UI polish khác, etc.).
