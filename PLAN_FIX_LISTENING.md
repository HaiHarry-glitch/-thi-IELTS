# 📘 PLAN — FIX UI LISTENING (v2 — updated)

> **Cập nhật:** 2026-05-13 (sau khi nhận ảnh chuẩn MCQ_MANY + MAP_DIAGRAM)
> **Data layer:** OK 637/638 (chỉ 1 đề broken: 1579)
> **Trọng tâm:** UI — fix 4 components + tối ưu typing

---

## 🎯 SCOPE — 4 COMPONENT CẦN FIX

| Component | Issue hiện tại | Đích cần đạt |
|---|---|---|
| **GapFilling.tsx** | `<span>` wrapper phá block elements → vỡ layout form/note | DOMParser → React tree giữ nguyên cấu trúc |
| **MultipleChoice.tsx** | Không có row highlight khi selected; badge chỉ hiện 1 số | Row bg `#dde9f5` khi tick; badge dạng `1-2-3` |
| **LabelDiagram.tsx** | Render không khớp map+table layout chuẩn | Side-by-side: image trái, TableSelection phải |
| **TableSelection.tsx** | (probably) cell selected chưa có bg highlight | Cell selected bg `#dde9f5` |

> 🔁 **Bonus:** Sau fix GapFilling, Reading 7248 cũng đẹp lại theo (đã regression).

---

## 📊 HIỆN TRẠNG DATA

| Chỉ số | Giá trị |
|---|---|
| Đề có raw + normalized | 638 / 638 |
| Render OK | 637 (99.8%) |
| Broken | 1 (ID 1579, parts rỗng từ source) |
| Có audio | 638 / 638 |

→ Data layer **không cần đại tu**. Chỉ cần re-crawl thử 1579 ở GĐ 4.

---

## 🛠 IMPLEMENTATION CHI TIẾT

### GĐ 0 — Backup (1')

```powershell
Copy-Item web\components\qset\GapFilling.tsx web\components\qset\GapFilling.tsx.bak
Copy-Item web\components\qset\MultipleChoice.tsx web\components\qset\MultipleChoice.tsx.bak
Copy-Item web\components\qset\LabelDiagram.tsx web\components\qset\LabelDiagram.tsx.bak
Copy-Item web\components\qset\TableSelection.tsx web\components\qset\TableSelection.tsx.bak
```

---

### GĐ 1 — Fix `GapFilling.tsx` với DOMParser (30')

**Vấn đề:** version hiện tại split HTML thành segments rồi wrap mỗi chunk bằng `<span>`. Chunks chứa `<ul>`, `<table>`, `<p>` → browser auto-close span → layout vỡ.

**Giải pháp:** dùng `DOMParser` (native) → walk node tree → render React element tree với gap-placeholder spans chuyển thành React `<input>`.

**Pseudo-code:**
```tsx
function htmlToReact(html: string, renderGap: (qid: number) => ReactNode): ReactNode {
  if (typeof window === "undefined") return null; // SSR guard
  const doc = new DOMParser().parseFromString(`<root>${html}</root>`, "text/html");
  return walk(doc.body.firstChild);

  function walk(node: Node, key?: string): ReactNode {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    const el = node as Element;
    // Convert gap-placeholder → React input
    if (el.tagName === "SPAN" && el.classList.contains("gap-placeholder")) {
      const m = (el.getAttribute("data-question-id") || "").match(/(\d+)/);
      return m ? renderGap(parseInt(m[1])) : null;
    }
    // Convert attributes class → className, style str → object, etc.
    const props = convertAttrs(el);
    const children = Array.from(el.childNodes).map((c, i) => walk(c, String(i)));
    return createElement(el.tagName.toLowerCase(), { key, ...props }, ...children);
  }
}
```

**SSR strategy:** dùng `useEffect` + `useState` để render parsed tree CHỈ ở client. SSR render skeleton (chỉ HTML thô, ko input).

**Acceptance:**
- Form completion (Washing Machine Warranty) — inputs inline với labels
- Reading 7248 không regression
- Typing không lag, không mất chữ

---

### GĐ 2 — Fix `MultipleChoice.tsx` (15')

#### Thay đổi 1: Badge range `1-2-3`
```tsx
// Trước:
{q.order}
// Sau:
{maxSel > 1
  ? `${q.order}-${q.order + maxSel - 1}`
  : q.order}
```

#### Thay đổi 2: Full-row highlight khi selected
```tsx
// Trong label className:
className={`py-2.5 px-3 flex gap-2 rounded-[2px] duration-200 cursor-pointer ${
  isSel ? "bg-[#dde9f5]" : "hover:bg-[#e4e4e4]"
}`}
```

#### Thay đổi 3: Checkbox to vuông hơn
```tsx
<input
  className="absolute top-1/2 -translate-y-1/2 left-3 w-3.5 h-3.5 cursor-pointer accent-[#418ec8]"
  type={maxSel > 1 ? "checkbox" : "radio"}
/>
```

**Acceptance:** so với ảnh chuẩn — checkbox vuông, row sáng xanh khi tick, badge dạng range.

---

### GĐ 3 — Fix `LabelDiagram.tsx` (20')

**Cấu trúc đúng (theo ảnh chuẩn):**
```tsx
<div className="flex gap-4">
  <div className="flex-shrink-0">
    {qs.image && <img src={qs.image} alt="Map" className="max-w-md" />}
  </div>
  <div className="flex-1">
    <TableSelection qs={qs} answers={answers} onAnswer={onAnswer} mode={mode} />
  </div>
</div>
```

Mảng options là letters A-G. Mỗi câu hỏi 1 row. User pick 1 letter per row → behavior y hệt TABLE_SELECTION.

**Edge case:** một số đề MAP_DIAGRAM_LABEL không có ảnh trong qs.image — fallback render GapFilling (text label).

---

### GĐ 4 — Fix `TableSelection.tsx` (10')

#### Thêm cell highlight khi selected
```tsx
// Trong td:
<td className={`border-black h-full p-0 ${
  i === 0 ? "border-l-2" : "border-l"
} ${checked ? "bg-[#dde9f5]" : ""}`}>
```

#### Number badge dạng "row đầu" không cần range vì 1 row = 1 question.

---

### GĐ 5 — Re-crawl 1579 (10')

```powershell
node src\crawl-listening-quiz.js --ids=1579
node src\normalize-listening.js
node src\audit-listening-data.js
```

Nếu đề thực sự bị xoá khỏi YouPass → skip, mark "not available" trong gallery.

---

### GĐ 6 — Smoke test 8 đề (20')

Tôi sẽ chỉ định 8 URL cụ thể (mỗi loại 1 đề) sau khi GĐ 1–4 xong, để bạn test:

| Type | URL placeholder |
|---|---|
| FILL_BLANK / form | (form completion đề như Washing Machine) |
| GAP_FILLING | (note completion) |
| MCQ_ONE | (single choice) |
| MCQ_MANY | (đề Economics Course Discussion / 8705) |
| MAP_DIAGRAM | (đề Zoo Trip / 8386) |
| MATCHING_INFO | (matching person to statement) |
| TABLE_SELECTION | (Part 3/4 table) |
| Regression Reading 7248 | (đảm bảo không hỏng) |

---

## ⏱ TIMELINE

| GĐ | Việc | Thời lượng |
|---|---|---|
| 0 | Backup | 1' |
| **1** | **Fix GapFilling (DOMParser)** | **30'** |
| 2 | Fix MultipleChoice | 15' |
| 3 | Fix LabelDiagram | 20' |
| 4 | Fix TableSelection | 10' |
| 5 | Re-crawl 1579 | 10' |
| 6 | Smoke test | 20' |
| **TỔNG** | | **~1h45** |

---

## ✅ SUCCESS CRITERIA

1. ✅ Form completion (đề Washing Machine) — inputs inline next to label, không vỡ layout
2. ✅ MCQ_MANY (đề 8705) — row sáng xanh khi tick, badge `1-2-3`
3. ✅ MAP_DIAGRAM (đề 8386) — map trái + table phải, cell selected sáng xanh
4. ✅ Reading 7248 — gap-filling không regression
5. ✅ Typing không lag, không mất chữ
6. ✅ Audit listening: `OK 638 / Broken 0` (sau re-crawl 1579)

---

## ❓ CONFIRM TRƯỚC KHI BẮT ĐẦU

1. Plan ổn? Hay bỏ GĐ nào không cần?
2. Đề 1579 — **re-crawl thử** hay **skip luôn**?
3. Tôi áp luôn (tự edit file) hay viết patch step-by-step như Plan A Reading?

Reply **"OK [áp luôn/patch step]"** để bắt đầu.
