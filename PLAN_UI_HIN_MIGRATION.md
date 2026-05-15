# 🎨 PLAN — Migration toàn bộ UI sang Design System HIN (Harry IELTS Navigator)

> **Phong cách đích:** Neo-Brutalism + Editorial Design (cream bg + offset black shadow + Fraunces serif headings)
> **Đối tượng:** YouPassClone — tất cả surface (Library, Exam, Practice, Result, components)
> **Tổng scope:** 1 layout + 4 page surfaces + 9 question components + 8 auxiliary components ≈ **22 files**

---

## ⚠️ PHẦN 0 — RỦI RO & LƯU Ý CHIẾN LƯỢC

### 0.1. Phân cấp surface theo "độ loud" của HIN

HIN Design System rất mạnh visual (offset shadow, red accent, italic Fraunces). Áp full vào màn **làm bài thi 60 phút** có thể gây **mỏi mắt + phân tán**. Đề xuất chia 2 mức:

| Surface | Mức HIN |
|---|---|
| **Landing / Library / Result / Marketing** | **HIN FULL** — offset shadow 8-12px, Fraunces hero, red CTA mạnh |
| **Exam mode (đang làm bài)** | **HIN SOFT** — vẫn cream bg + Inter body + hard borders + Fraunces cho heading, NHƯNG shadow chỉ 2-4px, không red flicker, không animation thừa |

> Quyết định cuối ở bạn — plan này mặc định theo 2 mức trên. Nếu bạn muốn FULL khắp nơi, chỉ cần đổi config token ở GĐ 1.

### 0.2. Component không "brutalist hoá" được

- **AudioPlayer** — phải nhỏ gọn, không che passage. Giữ pill style, chỉ đổi font + accent.
- **Inputs gap-fill** — to + vuông + border đen 2px sẽ to gấp đôi inline → vỡ layout note completion. Plan dùng input nhỏ border 1.5px shadow 1px.
- **Radio/Checkbox** — native HTML không brutalist được, dùng custom div thay thế.

### 0.3. Data layer KHÔNG đụng

Plan chỉ chạm UI / styling. Tất cả normalize / data files không sửa.

---

## 🎨 PHẦN 1 — TOKEN SYSTEM & FOUNDATION (15')

### 1.1. Cài font (3')

Thêm vào `web/app/layout.tsx`:

```tsx
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin", "vietnamese"],
  variable: "--font-fraunces",
  weight: ["700", "900"],
  style: ["normal", "italic"],
});
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
});

// Trong <html className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}>
```

### 1.2. Cập nhật `web/app/globals.css` (5')

```css
@import "tailwindcss";

:root {
  /* HIN Brand */
  --bg:     #F5F1E9;
  --card:   #FDFCF9;
  --ink:    #1a1a1a;
  --red:    #d9381e;
  --yellow: #FFD700;

  /* Exam-mode softer tokens */
  --exam-bg:        #FAFAF5;
  --exam-card:      #FFFFFF;
  --exam-accent:    #1a1a1a;  /* mostly ink, NO red distraction */
  --exam-highlight: #FFF9D6;  /* soft yellow cho marked text */
}

/* Map sang Tailwind 4 layer */
@theme {
  --color-ink:      #1a1a1a;
  --color-bg:       #F5F1E9;
  --color-card:     #FDFCF9;
  --color-brand-red:    #d9381e;
  --color-brand-yellow: #FFD700;
  --font-display:  var(--font-fraunces);
  --font-sans:     var(--font-inter);
  --font-mono:     var(--font-mono);
}

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans), sans-serif;
  -webkit-font-smoothing: antialiased;
}

html { scroll-behavior: smooth; }

/* Neo shadows */
.shadow-neo     { box-shadow: 8px 8px 0 0 var(--ink); }
.shadow-neo-sm  { box-shadow: 4px 4px 0 0 var(--ink); }
.shadow-neo-lg  { box-shadow: 12px 12px 0 0 var(--ink); }
.shadow-neo-red    { box-shadow: 8px 8px 0 0 var(--red); }
.shadow-neo-yellow { box-shadow: 8px 8px 0 0 var(--yellow); }

/* Exam-soft shadows */
.shadow-soft    { box-shadow: 2px 2px 0 0 var(--ink); }
.shadow-soft-md { box-shadow: 3px 3px 0 0 var(--ink); }

/* Interactive press */
.btn-press {
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.btn-press:hover {
  transform: translate(2px, 2px);
  box-shadow: 6px 6px 0 0 var(--ink);
}
.btn-press:active {
  transform: translate(4px, 4px);
  box-shadow: 4px 4px 0 0 var(--ink);
}

/* Passage HTML — giữ rules cũ nhưng đổi font + spacing */
.passage-html p  { margin-bottom: 1rem; line-height: 1.85; font-size: 0.95rem; }
.passage-html .paragraph-letter { font-family: var(--font-display); font-weight: 900; font-size: 1.3rem; margin-right: 0.4rem; }
/* (giữ phần còn lại) */
```

### 1.3. Layout shell (`web/app/layout.tsx`) (5')

```tsx
<html lang="vi" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}>
  <body className="min-h-screen bg-bg text-ink font-sans antialiased">
    {children}
  </body>
</html>
```

Bỏ `bg-gray-50` cũ → dùng `bg-bg` (cream).

### 1.4. Acceptance GĐ 1

- [ ] Refresh http://localhost:3000 → font Inter + bg cream `#F5F1E9`
- [ ] Inspector: `font-display`, `font-mono` vars hoạt động
- [ ] Tailwind `bg-bg`, `text-ink`, `shadow-neo` áp dụng được

---

## 🏠 PHẦN 2 — LANDING / LIBRARY PAGE (30')

File: `web/app/luyen-thi/ielts/reading/LibraryClient.tsx` (339 dòng)

### 2.1. Header / Nav band

```tsx
<header className="sticky top-0 z-50 bg-bg/95 backdrop-blur-sm border-b-2 border-ink shadow-sm">
  <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="/" className="group flex items-center gap-3">
      <div className="w-10 h-10 bg-ink text-bg flex items-center justify-center font-display font-black text-xl shadow-soft">H</div>
      <div className="font-display font-black text-xl tracking-tighter">
        HIN<span className="text-brand-red"> NAVIGATOR</span>
      </div>
    </a>
    <nav className="flex items-center gap-6 font-mono text-[11px] font-bold uppercase tracking-widest">
      <a href="/luyen-thi/ielts/reading" className="hover:text-brand-red transition-colors">Reading</a>
      <a href="/luyen-thi/ielts/listening" className="hover:text-brand-red transition-colors">Listening</a>
    </nav>
  </div>
</header>
```

### 2.2. Hero section
```tsx
<section className="py-16 border-b-2 border-ink">
  <div className="max-w-7xl mx-auto px-6">
    <div className="inline-block px-3 py-1 bg-brand-yellow text-ink text-[10px] font-black tracking-widest uppercase shadow-soft mb-6 font-mono">
      // IELTS Reading · {totalCount} đề
    </div>
    <h1 className="font-display text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] max-w-4xl">
      Thư viện <span className="italic text-brand-red">đề thi</span><br />
      bản full chính chủ.
    </h1>
    <p className="mt-6 text-lg text-ink/70 font-medium max-w-2xl">
      Tổng hợp {totalCount} đề Reading từ Cambridge, Actual Tests, Practice Plus. Click vào đề để bắt đầu.
    </p>
  </div>
</section>
```

### 2.3. Quiz card grid

```tsx
<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {quizzes.map((q) => (
    <a
      key={q.id}
      href={`/thi-thu/reading/${q.id}`}
      className="group relative bg-card border-2 border-ink p-5 shadow-neo-sm btn-press"
    >
      <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2">
        #{q.id} · {q.tags?.[0]?.code || "MIXED"}
      </div>
      <h3 className="font-display text-xl font-black leading-tight mb-3 group-hover:text-brand-red transition-colors">
        {q.title.replace(/^\[.+?\]\s*-?\s*/, "")}
      </h3>
      <div className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase">
        <span>{q.time}min</span>
        <span className="w-1 h-1 bg-ink rounded-full" />
        <span>{q.total_submitted} lượt</span>
      </div>
    </a>
  ))}
</div>
```

### 2.4. Filter / search bar (nếu có)

- Search box: `border-2 border-ink shadow-soft bg-card font-mono`
- Tag chips: `bg-brand-yellow border border-ink shadow-soft font-mono text-[10px] uppercase`

### 2.5. Acceptance GĐ 2

- [ ] Landing reading hiển thị grid với cream bg + offset shadow cards
- [ ] Hover card: dịch 2px, shadow giảm
- [ ] Heading Fraunces, label mono, body Inter
- [ ] Cùng treatment cho landing listening

---

## 📝 PHẦN 3 — EXAM SHELL (Header timer + Part nav + Sub-header) (45')

File: `web/app/thi-thu/reading/[id]/ExamClient.tsx`, `web/app/thi-thu/listening/[id]/ListeningClient.tsx`

> ⚠️ Đây là surface "HIN SOFT" — không quá loud.

### 3.1. Header bar

```tsx
<header className="border-b-2 border-ink bg-bg flex items-center justify-between px-6 py-3">
  {/* Left: title + timer */}
  <div className="flex items-center gap-4">
    <a href="/" className="font-display font-black text-lg tracking-tighter">HIN</a>
    <div className="w-[1px] h-6 bg-ink/30" />
    <div>
      <div className="font-display font-bold text-base leading-tight">{quiz.title}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink/60">
        {minutesLeft}:{String(timeLeft % 60).padStart(2, "0")} remaining
      </div>
    </div>
  </div>
  {/* Right: actions */}
  <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase">
    <button className="px-3 py-1.5 border-2 border-ink bg-card shadow-soft btn-press">Notes</button>
    <button className="px-3 py-1.5 border-2 border-ink bg-card shadow-soft btn-press">Help</button>
  </div>
</header>
```

### 3.2. Part instruction band

```tsx
<div className="border-b-2 border-ink bg-bg px-6 py-3 flex items-baseline gap-3">
  <div className="font-display font-black text-2xl tracking-tighter">Part {activePart + 1}</div>
  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">
    // {partInstruction}
  </span>
</div>
```

### 3.3. Bottom navigator (số câu hỏi 1-40)

```tsx
<footer className="border-t-2 border-ink bg-bg px-6 py-2 flex items-center gap-1 overflow-x-auto">
  <span className="font-mono text-[10px] font-bold uppercase mr-3">Part {activePart + 1}:</span>
  {questionsInPart.map((q) => {
    const answered = !!answers[q.id];
    const isCurrent = q.id === currentQId;
    return (
      <button
        key={q.id}
        onClick={() => scrollToQuestion(q.id)}
        className={`min-w-7 h-7 border-2 border-ink font-mono text-[11px] font-bold flex items-center justify-center transition-colors ${
          isCurrent ? "bg-ink text-bg" :
          answered ? "bg-brand-yellow shadow-[2px_2px_0_0_var(--ink)]" :
                     "bg-card"
        }`}
      >
        {q.order}
      </button>
    );
  })}
  <div className="ml-auto">
    <button className="px-4 py-1.5 bg-ink text-bg border-2 border-ink font-mono text-[11px] font-bold uppercase shadow-soft btn-press">
      ✓ Submit
    </button>
  </div>
</footer>
```

### 3.4. Acceptance GĐ 3

- [ ] Header: title Fraunces, timer mono, action button border đen + shadow soft
- [ ] Part band rõ ràng (gắn `// instruction` mono note)
- [ ] Bottom navigator: ô vuông border đen, đã trả lời = yellow bg
- [ ] Áp cho cả Reading + Listening

---

## 🧩 PHẦN 4 — 9 QUESTION COMPONENTS (90')

> ⚠️ Đây là phần chiếm thời gian nhất. Mỗi component đổi theo template chung dưới.

### 4.1. Template chung — `QSetHeader.tsx`

```tsx
// Trước: simple title + instruction
// Sau:
<div className="mb-4">
  <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-1">
    // Questions {firstOrder}-{lastOrder}
  </div>
  <h3 className="font-display text-xl font-black tracking-tight mb-2">
    {qs.title || qs.type.replace(/_/g, " ")}
  </h3>
  {qs.instructionHtml && (
    <div className="text-sm text-ink/80 leading-relaxed [&_strong]:font-bold [&_h2]:hidden" 
         dangerouslySetInnerHTML={{ __html: qs.instructionHtml }} />
  )}
</div>
```

### 4.2. Số thứ tự câu hỏi (badge) — pattern chung

```tsx
// Thay tất cả pill `border-[#418ec8]` cũ bằng:
<div className={`font-mono font-bold border-2 border-ink min-w-7 h-7 px-1.5 flex items-center justify-center text-sm bg-card ${
  answered ? "bg-brand-yellow" : ""
}`}>
  {q.order}
</div>
```

### 4.3. Per-component

| Component | Thay đổi cụ thể |
|---|---|
| **SingleChoice.tsx** | Option rows: `border-2 border-ink shadow-soft` (chỉ ô được chọn). Radio dùng custom div đen-trắng. Hover: bg `#FFF9D6` |
| **SingleSelection.tsx** | TFNG/YNNG — option button 3 cái side-by-side, vuông border-ink, selected = ink bg + bg text |
| **MultipleChoice.tsx** | Giữ row highlight `bg-brand-yellow/30`, checkbox vuông border đen 2px |
| **GapFilling.tsx** | Input `border-1.5 border-ink` (không 2 vì sẽ to quá), focus `shadow-soft`. Placeholder số mono |
| **TableSelection.tsx** | Border collapse + border-ink 2px. Selected cell `bg-brand-yellow/40`. Header bg-ink text-bg |
| **MatchingHeadings.tsx** | Drag chips: `bg-card border-2 border-ink shadow-soft btn-press`. Used: opacity 30 + line-through |
| **MatchingInfo.tsx** | List options chips horizontal, mỗi chip border-2 ink shadow-soft, click chọn để gắn vào row |
| **LabelDiagram.tsx** | Image trong box `border-2 border-ink shadow-neo-sm`, table giữ style 4.x |
| **ShortAnswer.tsx** | Input border 1.5 ink, placeholder mono, focus highlight yellow |

### 4.4. Acceptance GĐ 4

Mỗi component test 1 đề mẫu (8 URL từ smoke test trước). Checklist mỗi đề:
- [ ] Hết blue/orange tone YouPass cũ
- [ ] Cream bg consistency
- [ ] Border đen + offset shadow nhẹ
- [ ] Font đúng vai: display / mono / inter
- [ ] Hover/focus có cảm giác "press" 3D
- [ ] Không vỡ layout (test note completion 1621 đặc biệt)

---

## 🎧 PHẦN 5 — AUDIO PLAYER + NOTES + HIGHLIGHT (30')

### 5.1. AudioPlayer.tsx

Hiện: pill xanh navy. Đổi sang:

```tsx
<div className="fixed bottom-0 inset-x-0 border-t-2 border-ink bg-card px-6 py-2.5 flex items-center gap-4 z-40">
  <button className="w-10 h-10 bg-ink text-bg border-2 border-ink flex items-center justify-center shadow-soft btn-press">
    ▶
  </button>
  <div className="flex-1">
    <div className="h-1.5 bg-ink/10 border border-ink relative">
      <div className="h-full bg-brand-red" style={{ width: `${progress}%` }} />
    </div>
    <div className="flex justify-between font-mono text-[10px] font-bold mt-1 uppercase">
      <span>{currentTime}</span>
      <span>{duration}</span>
    </div>
  </div>
  <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">
    1x speed · 70% vol
  </div>
</div>
```

### 5.2. NotesPanel.tsx

- Off-canvas right side
- `bg-card border-l-2 border-ink shadow-[-8px_0_0_0_var(--ink)]`
- Header: `font-display font-black text-2xl` + `// PRIVATE NOTES` mono

### 5.3. HighlightLayer.tsx

- Highlight color: `bg-brand-yellow/50` thay vì màu hiện tại
- Floating tool button: `border-2 border-ink bg-card shadow-soft`

### 5.4. Acceptance GĐ 5

- [ ] Audio player listening: progress đỏ, control button vuông
- [ ] Notes panel slide-in từ phải, border-ink shadow
- [ ] Highlight: vàng nhạt, marker icon mono

---

## 📊 PHẦN 6 — RESULT PAGE (20')

File: `web/app/practice/reading/[id]/result/ResultClient.tsx`

```tsx
<section className="py-12 border-b-2 border-ink">
  <div className="max-w-4xl mx-auto px-6 text-center">
    <div className="font-mono text-[10px] uppercase tracking-widest text-ink/60 mb-3">
      // RESULT · {quiz.title}
    </div>
    <h1 className="font-display text-7xl font-black tracking-tighter mb-4">
      <span className={correct/total >= 0.7 ? "text-brand-red" : ""}>{correct}</span>
      <span className="text-ink/30">/{total}</span>
    </h1>
    <div className="inline-block px-4 py-2 bg-brand-yellow border-2 border-ink shadow-soft font-mono text-sm font-bold uppercase">
      Band score: {bandScore}
    </div>
  </div>
</section>

{/* Per-question breakdown */}
<section className="py-12">
  <div className="max-w-4xl mx-auto px-6">
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-8">
      {questions.map(q => (
        <div className={`aspect-square border-2 border-ink flex items-center justify-center font-mono font-bold ${
          q.correct ? "bg-brand-yellow" : q.userAnswer ? "bg-brand-red text-bg" : "bg-card"
        }`}>
          {q.order}
        </div>
      ))}
    </div>
    {/* Review accordion per question */}
  </div>
</section>
```

### Acceptance GĐ 6

- [ ] Hero điểm số to + Fraunces
- [ ] Grid kết quả trực quan: yellow = đúng, red = sai, trắng = bỏ trống
- [ ] CTA "Làm lại" hoặc "Đề khác" — red button big

---

## 🧹 PHẦN 7 — POLISH & QA (30')

### 7.1. Visual regression check

Mở các URL sau, screenshot trước/sau:
- `/` → redirect → Library Reading
- `/luyen-thi/ielts/listening` → Library Listening
- `/thi-thu/reading/7248` → Exam mode
- `/thi-thu/reading/1027` → Form Completion (test edge case)
- `/thi-thu/listening/1621` → Map Diagram + Table
- `/practice/reading/7248/result` → Result

### 7.2. Color audit

- [ ] Không còn `#418ec8` (YouPass blue) trong source
- [ ] Không còn `bg-gray-50/100/200` (thay bằng bg/card)
- [ ] `text-blue-700`, `text-gray-700` etc → `text-ink` hoặc `text-ink/70`

Lệnh grep nhanh:
```powershell
Select-String -Path web\components\**\*.tsx,web\app\**\*.tsx -Pattern "418ec8|gray-50|gray-100|blue-" | Measure-Object | Select-Object Count
```
Mục tiêu: **Count 0** (chỉ còn trong comments)

### 7.3. Typography audit

- [ ] Mọi `<h1>`, `<h2>`, `<h3>` lớn → `font-display`
- [ ] Mọi badge / label / number → `font-mono`
- [ ] Body → mặc định Inter (đã set ở `<body>`)

### 7.4. Performance check

Sau khi áp shadow nhiều, refresh đề 1027 (7 gap inputs):
- [ ] Typing không lag (DOMParser GapFilling vẫn fast)
- [ ] Scroll smooth
- [ ] FPS 60 trên DevTools Performance tab

---

## ⏱ TIMELINE TỔNG

| GĐ | Việc | Thời lượng |
|---|---|---|
| 1 | Foundation (fonts + tokens + globals) | 15' |
| 2 | Library / Landing pages | 30' |
| 3 | Exam shell (header + part nav + footer) | 45' |
| 4 | 9 question components | 90' |
| 5 | Audio + Notes + Highlight | 30' |
| 6 | Result page | 20' |
| 7 | Polish + QA | 30' |
| **TỔNG** | | **~4h00** |

---

## ✅ SUCCESS CRITERIA

1. ✅ Mọi surface dùng cream bg `#F5F1E9` (hoặc `#FFFFFF` xen kẽ landing)
2. ✅ Font Fraunces cho heading, Inter cho body, JetBrains Mono cho label
3. ✅ Border đen 2px + offset black shadow trên mọi card/button
4. ✅ Hover effect "press" (translate + shadow giảm) cho mọi interactive
5. ✅ Exam mode dùng HIN SOFT (shadow 2-3px, không red flicker)
6. ✅ Landing/Result dùng HIN FULL (shadow 8-12px, red CTA mạnh)
7. ✅ Audit color: 0 instance YouPass blue/orange còn lại
8. ✅ Data layer không regression (audit Reading + Listening vẫn pass)
9. ✅ Typing trong gap input không lag (Reading 1027 vẫn smooth)

---

## 📂 DANH SÁCH FILE SẼ SỬA (22 files)

### Foundation (3)
- `web/app/layout.tsx`
- `web/app/globals.css`
- `web/next.config.ts` (nếu cần Next Font config)

### Landing (4)
- `web/app/luyen-thi/ielts/reading/LibraryClient.tsx`
- `web/app/luyen-thi/ielts/reading/page.tsx` (nếu cần Header)
- `web/app/luyen-thi/ielts/listening/page.tsx`
- (tạo mới) `web/components/SiteHeader.tsx`

### Exam shell (4)
- `web/app/thi-thu/reading/[id]/ExamClient.tsx`
- `web/app/thi-thu/listening/[id]/ListeningClient.tsx`
- `web/app/practice/reading/[id]/PracticeClient.tsx`
- `web/components/ResizableSplit.tsx` (handle bar style)

### Question components (10)
- `web/components/qset/QSetHeader.tsx`
- `web/components/qset/QSetRenderer.tsx` (không đổi logic, chỉ wrapper)
- `web/components/qset/SingleChoice.tsx`
- `web/components/qset/SingleSelection.tsx`
- `web/components/qset/MultipleChoice.tsx`
- `web/components/qset/GapFilling.tsx` (chỉ đổi input style, giữ DOMParser)
- `web/components/qset/TableSelection.tsx`
- `web/components/qset/MatchingHeadings.tsx`
- `web/components/qset/MatchingInfo.tsx`
- `web/components/qset/LabelDiagram.tsx`
- `web/components/qset/ShortAnswer.tsx`
- `web/components/qset/AnswerStatus.tsx`

### Auxiliary (4)
- `web/components/AudioPlayer.tsx`
- `web/components/NotesPanel.tsx`
- `web/components/HighlightLayer.tsx`
- `web/components/PassageRenderer.tsx`
- `web/components/PassageWithHeadings.tsx`
- `web/components/MatchingHeadingsExam.tsx`

### Result (1)
- `web/app/practice/reading/[id]/result/ResultClient.tsx`

---

## ❓ CONFIRM TRƯỚC KHI BẮT ĐẦU

### 1. Phân cấp surface
- [ ] Đồng ý: Exam mode dùng **HIN SOFT** (shadow nhỏ, ít red)
- [ ] Hay muốn **HIN FULL** khắp nơi?

### 2. Brand identity
- Tên ngắn hiển thị header: **"HIN"** hay **"HIN NAVIGATOR"** hay khác?
- Logo: tạm dùng monogram `H` block đen — bạn có file logo riêng không?

### 3. Cách triển khai
- **"Áp luôn"** → tôi sửa trực tiếp 22 files theo plan (~4h)
- **"Patch step"** → tôi chia thành 7 patch riêng, bạn áp từng GĐ (an toàn hơn, mỗi GĐ test xong mới sang tiếp)
- **"Mock trước"** → tôi làm 1 page mẫu (vd Library) để bạn duyệt vibe, sau đó mới rollout

### 4. Phạm vi
- [ ] Cả Reading + Listening + Library + Result
- [ ] Hay chỉ làm Reading exam trước, các phần khác sau?

### 5. Asset cần (nếu có)
- Logo HIN (SVG/PNG)
- Custom font file (nếu không dùng Google Fonts)
- Reference design Figma/screenshot khác (ngoài design system doc)

---

> 👉 Reply **"OK [hin-soft|hin-full] [patch-step|áp-luôn|mock-trước] [full|reading-only]"** + thông tin brand để bắt đầu.
>
> Ví dụ: `"OK hin-soft mock-trước full"` → tôi làm Library mẫu để duyệt trước.
