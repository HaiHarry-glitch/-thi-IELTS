# PLAN — HIN UI (Scope thu hẹp)

> **Ngày:** 2026-05-13
> **Scope:** Chỉ 3 surface: Landing · Library · Result
> **KHÔNG đụng:** Trang đề thi (`/thi-thu/*`), trang luyện tập (`/practice/*` exam), trang giải thích (review), toàn bộ question components (`/components/qset/`)
> **Assets có sẵn:** `hin-logo.png` (200KB) + `QRCode.png` (100KB) ở root project
> **Tổng thời gian:** ~2h · **6 files**

---

## BƯỚC 0 — Copy assets vào web/public (2')

```powershell
Copy-Item "D:\YouPassClone\hin-logo.png"  "D:\YouPassClone\web\public\hin-logo.png"
Copy-Item "D:\YouPassClone\QRCode.png"    "D:\YouPassClone\web\public\QRCode.png"
```

Sau đó truy cập được bằng `/hin-logo.png` và `/QRCode.png` trong Next.js.

---

## BƯỚC 1 — Foundation: Font + Token (15')

### 1.1. Cài font — `web/app/layout.tsx`

**Thay toàn bộ file thành:**

```tsx
import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin", "vietnamese"],
  variable: "--font-fraunces",
  weight: ["700", "900"],
  style: ["normal", "italic"],
});
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "HIN — IELTS Reading & Listening",
  description: "Harry IELTS Navigator — Thư viện đề thi IELTS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-[#F5F1E9] text-[#1a1a1a] antialiased" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
```

### 1.2. Token CSS — `web/app/globals.css`

**Thêm vào đầu file (trước `@import "tailwindcss"` nếu đã có, hoặc ngay sau):**

```css
@import "tailwindcss";

/* ─── HIN Tokens ─── */
@theme {
  --color-ink:    #1a1a1a;
  --color-bg:     #F5F1E9;
  --color-card:   #FDFCF9;
  --color-red:    #d9381e;
  --color-yellow: #FFD700;

  --font-display: var(--font-fraunces);
  --font-sans:    var(--font-inter);
  --font-mono:    var(--font-mono);
}

/* Neo-brutalism shadows */
.shadow-neo    { box-shadow: 8px 8px 0 0 #1a1a1a; }
.shadow-neo-sm { box-shadow: 4px 4px 0 0 #1a1a1a; }
.shadow-neo-lg { box-shadow: 12px 12px 0 0 #1a1a1a; }

/* Press effect */
.btn-press { transition: transform 0.08s ease, box-shadow 0.08s ease; }
.btn-press:hover  { transform: translate(2px, 2px); box-shadow: 6px 6px 0 0 #1a1a1a; }
.btn-press:active { transform: translate(4px, 4px); box-shadow: 4px 4px 0 0 #1a1a1a; }

/* Giữ lại các rule cũ (passage-html, content-cms, anchor-hl-note, v.v.) — KHÔNG xoá */
```

> ⚠️ Rule `.shadow-neo*` và `.btn-press` chỉ được dùng ở 3 surface mới. Exam/qset KHÔNG dùng class này.

### 1.3. Verify

```powershell
Set-Location web
npx tsc --noEmit
Set-Location ..
```

Mong đợi: **không lỗi mới**.

---

## BƯỚC 2 — Landing Page (30')

**File:** `web/app/page.tsx` — hiện chỉ là redirect. Thay bằng landing thật.

### Layout tổng quan

```
┌─────────────── NAV ───────────────┐
│ [hin-logo]  HIN NAVIGATOR   [nav] │
├───────────────────────────────────┤
│  ██ HERO ██                       │
│  Tag: // IELTS · Reading · Listen │
│  H1: Luyện đề IELTS               │
│      bản full, không giới hạn.    │
│  [→ Vào thư viện Reading]         │
│  [→ Vào thư viện Listening]       │
├──────────── STATS BAND ───────────┤
│  510 đề Reading  ·  637 đề Listen │
├──────────── FEATURES ─────────────┤
│  Card 1        Card 2       Card 3 │
├──────────── QR / CONTACT ─────────┤
│  [QRCode.png]  Contact info        │
└───────────────────────────────────┘
```

### Code — `web/app/page.tsx`

```tsx
import Image from "next/image";
import Link from "next/link";
import { getReadingListIndex, getListeningListIndex } from "@/lib/data";

export default function HomePage() {
  const readingCount = getReadingListIndex().length;
  const listeningCount = getListeningListIndex().length;

  return (
    <div className="min-h-screen bg-[#F5F1E9]">
      {/* ─── NAV ─── */}
      <nav className="border-b-2 border-[#1a1a1a] bg-[#F5F1E9] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/hin-logo.png" alt="HIN Logo" width={36} height={36} className="border border-[#1a1a1a]" />
            <span className="font-[family-name:var(--font-fraunces)] font-black text-xl tracking-tighter">
              HIN <span className="text-[#d9381e]">NAVIGATOR</span>
            </span>
          </Link>
          <div className="flex items-center gap-6 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest">
            <Link href="/luyen-thi/ielts/reading" className="hover:text-[#d9381e] transition-colors">Reading</Link>
            <Link href="/luyen-thi/ielts/listening" className="hover:text-[#d9381e] transition-colors">Listening</Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="border-b-2 border-[#1a1a1a] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="inline-block px-3 py-1 bg-[#FFD700] border border-[#1a1a1a] shadow-[3px_3px_0_0_#1a1a1a] font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest mb-8">
            // IELTS · Reading · Listening · {readingCount + listeningCount} đề
          </div>
          <h1 className="font-[family-name:var(--font-fraunces)] text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 max-w-3xl">
            Luyện đề IELTS<br />
            <em className="text-[#d9381e]">bản full,</em><br />
            không giới hạn.
          </h1>
          <p className="text-lg text-[#1a1a1a]/70 mb-10 max-w-xl leading-relaxed">
            Thư viện {readingCount} đề Reading + {listeningCount} đề Listening từ Cambridge, Actual Tests, Practice Plus. Không đăng ký, không trả phí.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/luyen-thi/ielts/reading"
              className="btn-press px-8 py-4 bg-[#1a1a1a] text-[#F5F1E9] border-2 border-[#1a1a1a] shadow-neo font-[family-name:var(--font-fraunces)] font-black text-lg tracking-tight"
            >
              Thư viện Reading →
            </Link>
            <Link
              href="/luyen-thi/ielts/listening"
              className="btn-press px-8 py-4 bg-[#F5F1E9] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-neo font-[family-name:var(--font-fraunces)] font-black text-lg tracking-tight"
            >
              Thư viện Listening →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── STATS BAND ─── */}
      <section className="border-b-2 border-[#1a1a1a] bg-[#1a1a1a] text-[#F5F1E9] py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-8 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest">
          <span>{readingCount} đề Reading</span>
          <span className="opacity-30">·</span>
          <span>{listeningCount} đề Listening</span>
          <span className="opacity-30">·</span>
          <span>0 đăng nhập</span>
          <span className="opacity-30">·</span>
          <span>0 giới hạn</span>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-16 px-6 border-b-2 border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto">
          <div className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/60 mb-8">
            // Features
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Full đề, đủ câu", body: "Dữ liệu chuẩn hóa từ YouPass. Reading 510 đề, Listening 637 đề. Tất cả dạng câu hỏi đều render đúng.", tag: "DATA" },
              { title: "Thi thử như thật", body: "Timer 60 phút, điều hướng theo part, submit & xem kết quả chi tiết. Layout song song Reading + câu hỏi.", tag: "EXAM" },
              { title: "Không cần tài khoản", body: "Mở đề là làm ngay. Câu trả lời lưu local — không server, không tracking.", tag: "PRIVACY" },
            ].map((f) => (
              <div key={f.tag} className="bg-[#FDFCF9] border-2 border-[#1a1a1a] p-6 shadow-neo-sm">
                <div className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/50 mb-3">
                  // {f.tag}
                </div>
                <h3 className="font-[family-name:var(--font-fraunces)] font-black text-2xl tracking-tight mb-3">{f.title}</h3>
                <p className="text-sm text-[#1a1a1a]/70 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONTACT / QR ─── */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start gap-12">
          <div className="flex-1">
            <div className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/60 mb-6">
              // Harry IELTS Navigator
            </div>
            <p className="font-[family-name:var(--font-fraunces)] font-black text-3xl tracking-tight leading-snug mb-6">
              Được xây dựng cho<br />học viên IELTS nghiêm túc.
            </p>
            <p className="text-sm text-[#1a1a1a]/70 leading-relaxed max-w-sm">
              HIN là hệ thống luyện thi IELTS độc lập, không liên kết với YouPass. Nếu bạn thấy hữu ích, hãy chia sẻ cho bạn bè.
            </p>
          </div>
          <div className="shrink-0">
            <div className="border-2 border-[#1a1a1a] shadow-neo-sm p-4 bg-[#FDFCF9] inline-block">
              <Image src="/QRCode.png" alt="QR Code" width={160} height={160} />
              <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-center mt-3 text-[#1a1a1a]/60">
                // Scan để chia sẻ
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t-2 border-[#1a1a1a] py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/50">
          <span>HIN Navigator © 2026</span>
          <div className="flex gap-6">
            <Link href="/luyen-thi/ielts/reading" className="hover:text-[#d9381e] transition-colors">Reading</Link>
            <Link href="/luyen-thi/ielts/listening" className="hover:text-[#d9381e] transition-colors">Listening</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

### Acceptance Bước 2

- [ ] `http://localhost:3000` → hiện landing thật (không redirect)
- [ ] Hero heading Fraunces italic red
- [ ] 2 CTA button: hover dịch 2px + shadow giảm
- [ ] Stats band: nền đen, text cream
- [ ] 3 feature cards: shadow neo
- [ ] QR Code hiển thị trong box border đen

---

## BƯỚC 3 — Library Page (30')

**File:** `web/app/luyen-thi/ielts/reading/LibraryClient.tsx`
(Component này dùng cho cả Reading lẫn Listening — sửa 1 file là xong cả 2)

### Layout mới

```
┌──────────────── NAV (sticky) ──────────────────┐
│ [hin-logo] HIN NAVIGATOR    Reading  Listening  │
├──────────── HERO BAND ──────────────────────────┤
│ // IELTS Reading · 510 đề                       │
│ H1: Thư viện đề thi Reading.                    │
├────────────────────────────────────────────────┤
│ [Search ___________]  [Xóa filter]             │
│ Tag chips: Cambridge · Actual Test · ...        │
├────────────────────────────────────────────────┤
│ CARD GRID (3 cột desktop, 2 tablet, 1 mobile)  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ #ID      │ │ #ID      │ │ #ID      │         │
│ │ Title    │ │ Title    │ │ Title    │         │
│ │ 60p · N  │ │ 60p · N  │ │ 60p · N  │         │
│ └──────────┘ └──────────┘ └──────────┘         │
├────────────────────────────────────────────────┤
│  Pagination  ← 1 2 3 … N →                     │
└────────────────────────────────────────────────┘
```

### Các thay đổi so với hiện tại

| Phần | Hiện tại | Mới |
|------|----------|-----|
| Header | YouPass orange logo + gray nav | HIN logo + ink border 2px sticky |
| Background | `bg-[#f5f5f5]` gray | `bg-[#F5F1E9]` cream |
| Sidebar filter | Aside 52px trắng rounded | Bỏ sidebar — filter dạng chip row ngang |
| Cards | Rounded xl, thumbnail ảnh, shadow md | Square border-2 ink, shadow-neo-sm, btn-press |
| Card content | Ảnh + title + vote + tag pills | Mono ID tag + Fraunces title + mono stats |
| Status tabs | Orange pill | Ink border-2 chips |
| Search | `border rounded-lg orange ring` | `border-2 border-ink bg-card font-mono` |
| Pagination | Orange bg active | Ink bg active |

### Code skeleton — Header + Hero

```tsx
{/* NAV */}
<nav className="border-b-2 border-[#1a1a1a] bg-[#F5F1E9] sticky top-0 z-50">
  <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
    <Link href="/" className="flex items-center gap-3">
      <Image src="/hin-logo.png" alt="HIN" width={32} height={32} className="border border-[#1a1a1a]" />
      <span className="font-[family-name:var(--font-fraunces)] font-black text-lg tracking-tighter">
        HIN <span className="text-[#d9381e]">NAVIGATOR</span>
      </span>
    </Link>
    <div className="flex items-center gap-6 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest">
      <Link href="/luyen-thi/ielts/reading" className={skill==="reading" ? "text-[#d9381e]" : "hover:text-[#d9381e] transition-colors"}>Reading</Link>
      <Link href="/luyen-thi/ielts/listening" className={skill==="listening" ? "text-[#d9381e]" : "hover:text-[#d9381e] transition-colors"}>Listening</Link>
    </div>
  </div>
</nav>

{/* HERO BAND */}
<div className="border-b-2 border-[#1a1a1a] py-10 px-6">
  <div className="max-w-6xl mx-auto">
    <div className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/60 mb-3">
      // IELTS {skill === "listening" ? "Listening" : "Reading"} · {items.length} đề
    </div>
    <h1 className="font-[family-name:var(--font-fraunces)] text-5xl md:text-6xl font-black tracking-tighter">
      Thư viện đề thi <em className="text-[#d9381e]">{skill === "listening" ? "Listening" : "Reading"}.</em>
    </h1>
  </div>
</div>
```

### Code skeleton — Card

```tsx
function ExamCard({ item, skill }: { item: LibraryItem; skill: "reading" | "listening" }) {
  return (
    <Link
      href={`/thi-thu/${skill}/${item.id}`}
      className="btn-press group bg-[#FDFCF9] border-2 border-[#1a1a1a] p-5 shadow-neo-sm block"
    >
      {/* ID + category tag */}
      <div className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/50 mb-2">
        #{item.id} · {item.tags?.[0]?.title || "MIXED"}
      </div>
      {/* Title */}
      <h3 className="font-[family-name:var(--font-fraunces)] font-black text-lg leading-tight mb-4 group-hover:text-[#d9381e] transition-colors">
        {item.title.replace(/^\[.+?\]\s*[-–]?\s*/, "")}
      </h3>
      {/* Stats row */}
      <div className="flex items-center gap-3 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase">
        <span>{item.time}min</span>
        <span className="w-1 h-1 rounded-full bg-[#1a1a1a]" />
        <span>{item.total_submitted.toLocaleString()} lượt</span>
      </div>
    </Link>
  );
}
```

### Code skeleton — Search + Filter row

```tsx
{/* Search + Filter */}
<div className="border-b-2 border-[#1a1a1a] py-4 px-6 bg-[#F5F1E9]">
  <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3">
    {/* Search */}
    <div className="relative">
      <input
        type="text"
        placeholder="Tìm kiếm đề..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="pl-4 pr-10 py-2 border-2 border-[#1a1a1a] bg-[#FDFCF9] font-[family-name:var(--font-mono)] text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#d9381e] w-56"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a1a1a]/40 text-sm">⌕</span>
    </div>

    {/* Tag chips */}
    {allTags.slice(0, 10).map((t) => (
      <button
        key={t.code}
        onClick={() => toggleTag(t.code)}
        className={`px-3 py-1.5 border-2 border-[#1a1a1a] font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wide transition-colors ${
          selectedTags.has(t.code)
            ? "bg-[#FFD700] shadow-[2px_2px_0_0_#1a1a1a]"
            : "bg-[#FDFCF9] hover:bg-[#FFD700]/40"
        }`}
      >
        {t.title}
      </button>
    ))}

    {selectedTags.size > 0 && (
      <button
        onClick={() => setSelectedTags(new Set())}
        className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase text-[#d9381e] hover:underline"
      >
        Xóa filter ✕
      </button>
    )}

    <div className="ml-auto font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase text-[#1a1a1a]/50">
      {filtered.length} đề
    </div>
  </div>
</div>
```

### Acceptance Bước 3

- [ ] `http://localhost:3000/luyen-thi/ielts/reading` → cream bg + ink nav
- [ ] Heading Fraunces, italic red
- [ ] Cards: square, border đen, shadow offset, hover press effect + title đỏ
- [ ] Search focus: shadow đỏ
- [ ] Tag chips: yellow khi active
- [ ] `http://localhost:3000/luyen-thi/ielts/listening` → cùng style, title "Listening"

---

## BƯỚC 4 — Result Page (25')

**File:** `web/app/practice/reading/[id]/result/ResultClient.tsx`

### Layout mới

```
┌──────────── NAV (HIN style) ─────────────────┐
├──────────── HERO SCORE ──────────────────────┤
│  // RESULT · [title]                         │
│  H1: 27 / 40  (Fraunces 8xl)                │
│  [BAND 7.0] yellow chip                      │
├──────────── QUESTION GRID (10 per row) ──────┤
│  [1✓][2✗][3✓][4 ][5✓][6✓][7✗][8✓][9 ][10✓]│
│  (yellow=đúng, red=sai, white=bỏ)            │
├──────────── STATS TABLE ─────────────────────┤
│  Type | Tổng | Đúng | Sai | Bỏ              │
├──────────── ACTIONS ─────────────────────────┤
│  [Làm lại]    [Đề khác →]                   │
└──────────────────────────────────────────────┘
```

### Thay đổi so với hiện tại

| Phần | Hiện tại | Mới |
|------|----------|-----|
| Nav | ElearningNav (orange tabs) | HIN Nav (ink border, logo) |
| Score | SVG circle + gradient card | Fraunces giant number, band chip yellow |
| Motivation card | Gradient bg + emoji | Inline mono quote, không card gradient |
| Question breakdown | Không có per-question grid | Grid ô vuông 10-per-row |
| Stats table | Rounded circle badges | Flat mono numbers, border-ink rows |
| CTA buttons | Rounded xl orange | Square border-2 ink shadow-neo-sm |

### Code skeleton — Hero Score

```tsx
{/* HERO SCORE */}
<section className="border-b-2 border-[#1a1a1a] py-14 px-6">
  <div className="max-w-4xl mx-auto">
    <div className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/60 mb-4">
      // Result · {quiz.title}
    </div>
    <div className="flex items-end gap-6 mb-6">
      <h1 className="font-[family-name:var(--font-fraunces)] font-black text-8xl md:text-9xl tracking-tighter leading-none">
        <span className={pct >= 0.7 ? "text-[#d9381e]" : ""}>{correct}</span>
        <span className="text-[#1a1a1a]/25">/{total}</span>
      </h1>
      <div className="mb-4">
        <div className="px-4 py-2 bg-[#FFD700] border-2 border-[#1a1a1a] shadow-[3px_3px_0_0_#1a1a1a] font-[family-name:var(--font-mono)] font-bold text-sm uppercase">
          {pct >= 0.7 ? "Xuất sắc!" : pct >= 0.4 ? "Cố lên!" : "Luyện thêm nhé"}
        </div>
        <div className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase mt-2 text-[#1a1a1a]/60">
          {Math.round(pct * 100)}% · {correct} đúng · {wrong} sai · {skipped} bỏ
        </div>
      </div>
    </div>
  </div>
</section>
```

### Code skeleton — Question Grid

```tsx
{/* QUESTION GRID */}
<section className="border-b-2 border-[#1a1a1a] py-10 px-6">
  <div className="max-w-4xl mx-auto">
    <div className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/60 mb-4">
      // Câu hỏi chi tiết
    </div>
    <div className="grid grid-cols-10 gap-1.5">
      {allQs.map((q) => {
        const ca = getCorrect(q);
        const ua = answers[q.id] as string | string[] | undefined;
        const hasAnswer = ua !== undefined && ua !== "" && !(Array.isArray(ua) && ua.length === 0);
        const ok = hasAnswer && isCorrect(ua, ca);
        return (
          <div
            key={q.id}
            title={`Câu ${q.order}`}
            className={`aspect-square border-2 border-[#1a1a1a] flex items-center justify-center font-[family-name:var(--font-mono)] text-[11px] font-bold ${
              ok ? "bg-[#FFD700]" :
              hasAnswer ? "bg-[#d9381e] text-[#F5F1E9]" :
              "bg-[#FDFCF9] text-[#1a1a1a]/40"
            }`}
          >
            {q.order}
          </div>
        );
      })}
    </div>
    <div className="flex gap-4 mt-3 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase">
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#FFD700] border border-[#1a1a1a]" />Đúng</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#d9381e] border border-[#1a1a1a]" />Sai</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#FDFCF9] border border-[#1a1a1a]" />Bỏ qua</span>
    </div>
  </div>
</section>
```

### Code skeleton — Actions

```tsx
{/* ACTIONS */}
<div className="flex flex-wrap gap-4 py-10 px-6 max-w-4xl mx-auto">
  <Link
    href={`/thi-thu/${skill}/${quiz.id}`}
    className="btn-press flex-1 py-4 border-2 border-[#1a1a1a] bg-[#FDFCF9] shadow-neo-sm font-[family-name:var(--font-fraunces)] font-black text-lg tracking-tight text-center"
  >
    Làm lại
  </Link>
  <Link
    href={`/luyen-thi/ielts/${skill}`}
    className="btn-press flex-1 py-4 border-2 border-[#1a1a1a] bg-[#1a1a1a] text-[#F5F1E9] shadow-neo-sm font-[family-name:var(--font-fraunces)] font-black text-lg tracking-tight text-center"
  >
    Đề khác →
  </Link>
</div>
```

### Acceptance Bước 4

- [ ] `http://localhost:3000/practice/reading/7248/result` → HIN nav + cream bg
- [ ] Score: số Fraunces 9xl, đỏ nếu >= 70%
- [ ] Question grid: 10 cột, vàng/đỏ/trắng
- [ ] Stats table: ink border, mono text
- [ ] 2 CTA: square shadow-neo-sm, press effect

---

## BƯỚC 5 — Verify tổng thể (10')

### 5.1. TypeScript check

```powershell
Set-Location web
npx tsc --noEmit
Set-Location ..
```

### 5.2. Test 4 URL

| URL | Mong đợi |
|-----|----------|
| `http://localhost:3000` | Landing đầy đủ, không redirect |
| `http://localhost:3000/luyen-thi/ielts/reading` | Library reading HIN style |
| `http://localhost:3000/luyen-thi/ielts/listening` | Library listening, cùng style |
| `http://localhost:3000/practice/reading/7248/result` | Result HIN style |

### 5.3. Verify exam KHÔNG thay đổi

```
http://localhost:3000/thi-thu/reading/7248
http://localhost:3000/thi-thu/listening/1369
```

Cả 2 vẫn dùng giao diện YouPass cũ — KHÔNG có HIN style (chỉ cream bg từ layout.tsx là bình thường).

### 5.4. Audit data không regression

```powershell
node src\audit-reading-data.js
node src\audit-listening-data.js
```

Mong đợi: Reading OK 510 / Listening OK 637 / Unavailable 1 / Broken 0.

---

## FILE SUMMARY

| File | Thao tác | Ghi chú |
|------|----------|---------|
| `web/public/hin-logo.png` | Copy từ root | Asset |
| `web/public/QRCode.png` | Copy từ root | Asset |
| `web/app/layout.tsx` | Sửa | Thêm font + body class |
| `web/app/globals.css` | Sửa (thêm vào đầu) | Token + shadow utility |
| `web/app/page.tsx` | Viết lại | Landing mới (không còn redirect) |
| `web/app/luyen-thi/ielts/reading/LibraryClient.tsx` | Viết lại | Áp HIN style (dùng cho cả Listening) |
| `web/app/practice/reading/[id]/result/ResultClient.tsx` | Viết lại | Áp HIN style |

**Tổng: 5 files sửa + 2 file copy = 7 thao tác**

---

## KHÔNG ĐỤNG

Các file sau KHÔNG sửa trong plan này:

- `web/app/thi-thu/reading/[id]/ExamClient.tsx`
- `web/app/thi-thu/reading/[id]/PrepClient.tsx`
- `web/app/thi-thu/listening/[id]/ListeningClient.tsx`
- `web/app/practice/reading/[id]/PracticeClient.tsx`
- `web/app/practice/listening/[id]/result/page.tsx`
- `web/components/qset/*` (tất cả question components)
- `web/components/AudioPlayer.tsx`
- `web/components/NotesPanel.tsx`
- `src/*` (data pipeline)
- `data/*`

---

## THỰC HIỆN

Reply **"Áp luôn"** → tôi sửa 7 file theo plan này (~1.5h).

Reply **"Mock landing trước"** → tôi làm `page.tsx` mẫu để duyệt vibe, sau đó mới sang Library + Result.
