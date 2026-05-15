# UI Reference — Listening Review Page (YouPass gốc)

> **Mục đích:** Đây là spec UI ĐÍCH cho `/thi-thu/listening/[id]?type=review`.
> Bám sát ảnh chụp từ YouPass thật tại `e-learning.youpass.vn/practice/listening/10462?type=review`.
> **Lưu ảnh gốc:** `docs/assets/youpass-review-reference.png` (user tự lưu)

---

## 🎯 Layout tổng (1920x1080 desktop)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TOP NAV (cao 48px, bg-white, border-b)                                   │
│ My Homepage │ Khóa học Intensive 7.0 │ Khoá E-learning lẻ │              │
│ [Luyện tập 4 kỹ năng] │ Sổ Từ vựng │ Kết quả học viên │ IELTS 1984      │
│                                              [Nâng cấp PRO 🔥] [logo YP]│
├──────────────────────────────────────────────────────────────────────────┤
│ ACTION BAR (cao 48px)                                                    │
│ [X] │ 00:00:03 │ 0/10 câu đúng │     [📝 Xem note] [⚙ Cài đặt] [🔗 Chia sẻ bài làm] │
├────┬─────────────────────────────────────────────────────────────────────┤
│ T  │                                       [Focus theo từ ●]  (toggle)  │
│ O  │ ┌──────────────────────────────────┬──────────────────────────────┐│
│ O  │ │                                  │ Questions 31 - 40            ││
│ L  │ │   TRANSCRIPT                     │ Complete the notes below.    ││
│    │ │                                  │ Write ONE WORD ONLY...       ││
│ R  │ │   Speaker 0: Now turn to...      │                              ││
│ A  │ │                                  │ Roger Bacon (1200s)          ││
│ I  │ │   Speaker 1: Good morning...     │ • His invention assisted     ││
│ L  │ │                                  │   ▶31 ✕ → researchers 📍    ││
│    │ │   [highlighted sentence in       │   with sight problems...     ││
│ Cô │ │    green xanh #a4d8a4]           │                              ││
│ ng │ │                                  │ Lipperhey                    ││
│ cụ │ │                                  │ • 1608: he put concave...   ││
│    │ │                                  │ • The small telescope...    ││
│ ─  │ │                                  │   ▶32 ✕ → theater 📍        ││
│ 🖍 │ │                                  │                              ││
│ Hi │ │                                  │ Galileo                      ││
│ gh │ │                                  │ • 1609: he tried...         ││
│ li │ │                                  │ • He started the ▶33 ✕ →   ││
│ gh │ │                                  │   production 📍 of lenses... ││
│ t  │ │                                  │                              ││
│ Ph │ │                                  │ ...                          ││
│ ím │ │                                  │                              ││
│ (H)│ │                                  │                              ││
│ ─  │ │                                  │                              ││
│ 📝 │ │                                  │                              ││
│ No │ │                                  │                              ││
│ te │ │                                  │                              ││
│ s  │ │                                  │                              ││
│ Ph │ │                                  │                              ││
│ ím │ │                                  │                              ││
│ (N)│ │                                  │                              ││
│ ─  │ │                                  │                              ││
│ Aあ│ │                                  │                              ││
│ Tra│ │                                  │                              ││
│ từ │ │                                  │                              ││
│ vựng│ │                                 │                              ││
│ Ph │ │                                  │                              ││
│ ím │ │                                  │                              ││
│ (T)│ │                                  │                              ││
│    │ └──────────────────────────────────┴──────────────────────────────┘│
├────┴─────────────────────────────────────────────────────────────────────┤
│ AUDIO BAR                                                                │
│ 00:00/06:34 [▼mute━]  [⟲5] [▶] [5⟳]  ━━━━━●━━━━━━━ [1x▼]              │
├──────────────────────────────────────────────────────────────────────────┤
│ PAGINATION + ACTIONS                                                     │
│  [31][32][33][34][35][36][37][38][39][40]   [Xem lịch sử] [Làm bài khác]│
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color tokens (lấy từ ảnh thật)

| Token | Hex | Dùng cho |
|-------|-----|----------|
| `--bg-white` | `#ffffff` | Background chính |
| `--bg-cream` | `#fffaf5` | Background transcript area (kem rất nhẹ) |
| `--border-light` | `#e5e7eb` | Border separator |
| `--border-medium` | `#d2d2d2` | Border đậm hơn (cột) |
| `--text-default` | `#1f2937` | Text body |
| `--text-muted` | `#6b7280` | Text phụ |
| `--speaker-green` | `#5a8c5a` | Tên Speaker, đáp án đúng, locate icon |
| `--highlight-active` | `#a4d8a4` (50% opacity) | Sentence đang được nghe |
| `--highlight-focus` | `#a4d8a4` (30% opacity) | Sentence trong range "Xem vị trí" |
| `--accent-orange` | `#ff7c2b` | Play button, score >0, progress bar |
| `--wrong-red` | `#ef4444` | Dấu ✕ user sai |
| `--pro-orange` | `#f97316` | Badge "Nâng cấp PRO" |
| `--top-nav-active` | `#dcfce7` | Tab active "Luyện tập 4 kỹ năng" (xanh nhạt) |

---

## 📐 Spacing & sizing

| Phần | Kích thước |
|------|-----------|
| Top nav | h-12 (48px) |
| Action bar | h-12 (48px) |
| Tool rail width | w-16 (64px) |
| Transcript column | flex-1 (~60%) |
| Form column | w-[480px] hoặc 40% |
| Audio bar | h-14 (56px) |
| Pagination row | h-12 (48px) |
| Speaker label width | w-24 (96px), text-right |
| Play locate button | w-7 h-7 (28x28) tròn cam |

---

## 🔧 Chi tiết từng vùng

### 1. TOP NAV (giống ảnh 2 phần xanh nhạt trên cùng)

- Background: `bg-[#dcfce7]` (xanh nhạt) hoặc trắng tùy theme YouPass
- Items: link xanh đậm `text-[#168b32]` với khoảng cách rộng
- Active tab "Luyện tập 4 kỹ năng": background trắng + border-rounded
- Right: badge "Nâng cấp PRO 🔥" (cam tròn), logo YouPass

```tsx
<header className="h-12 bg-[#dcfce7] border-b border-gray-200 flex items-center px-6">
  {[
    { label: "My Homepage", href: "#" },
    { label: "Khóa học Intensive 7.0", href: "#" },
    { label: "Khoá E-learning lẻ", href: "#" },
    { label: "Luyện tập 4 kỹ năng", href: "#", active: true },
    { label: "Sổ Từ vựng", href: "#" },
    { label: "Kết quả học viên", href: "#" },
    { label: "IELTS 1984", href: "#" },
  ].map(it => (
    <a key={it.label} href={it.href}
      className={`px-3 py-1.5 text-sm font-medium ${
        it.active ? "bg-white rounded text-[#168b32]" : "text-[#168b32] hover:text-[#0d5d20]"
      }`}>
      {it.label}
    </a>
  ))}
  <button className="ml-auto px-3 py-1 bg-[#f97316] text-white rounded-full text-xs font-bold">
    Nâng cấp PRO 🔥
  </button>
  <span className="ml-3 font-bold text-[#168b32]">YouPass</span>
</header>
```

### 2. ACTION BAR

- `[X]` close: tròn 28x28 viền xám, click → quay về library
- `00:00:03`: timer mono (giả lập, dùng `useEffect` setInterval khi cần)
- `0/10 câu đúng`: text, số đỏ cam khi >0
- `[Xem note]`: bg vàng nhạt `bg-[#fef3c7]`
- `[Cài đặt]`: bg trắng hover gray
- `[Chia sẻ bài làm]`: bg xanh `bg-[#5a8c5a]` text trắng

```tsx
<div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 text-sm">
  <Link href="/luyen-thi/ielts/listening" className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100">✕</Link>
  <span className="font-mono text-gray-700">00:00:00</span>
  <span><strong className={score.correct>0?"text-[#ff7c2b]":""}>{score.correct}/{score.total}</strong> câu đúng</span>
  <div className="ml-auto flex gap-2">
    <button className="px-3 py-1.5 bg-[#fef3c7] text-gray-700 rounded hover:bg-[#fde68a] text-xs">📝 Xem note</button>
    <button className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded text-xs">⚙️ Cài đặt</button>
    <button className="px-3 py-1.5 bg-[#5a8c5a] text-white rounded hover:bg-[#4a7c4a] text-xs">🔗 Chia sẻ bài làm</button>
  </div>
</div>
```

### 3. TOOL RAIL (cột trái 64px)

- Header: "Công cụ" (small text gray)
- Big green play button (tròn, bg green, icon ▶)
- 3 buttons stacked: Highlight / Notes / Tra từ vựng
- Mỗi button: icon trên + tên + phím tắt nhỏ
- Active state: bg vàng nhạt + viền cam
- **YouPass thật:** các button NÀY thực sự có chức năng (highlight, ghi note, tra từ). Ở dự án mình, scope này CHƯA cần làm chức năng, chỉ cần button UI:
  - **Highlight**: TODO — sẽ làm sau bằng `<HighlightLayer>` đã có
  - **Notes**: TODO — đã có `<NotesPanel>` trong exam, kết nối lại
  - **Tra từ vựng**: skip, không có data từ vựng phù hợp

```tsx
<aside className="w-16 border-r border-gray-200 bg-white flex flex-col items-center py-3 gap-2 shrink-0">
  <div className="text-[9px] font-semibold text-gray-500 uppercase mb-1">Công cụ</div>
  <button className="w-11 h-11 rounded bg-[#20a34a] text-white flex items-center justify-center hover:bg-[#178435]">
    <svg className="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
  </button>
  <ToolItem icon="✏️" label="Highlight" shortcut="H" onClick={() => setTool("highlight")} active={tool==="highlight"} />
  <ToolItem icon="📝" label="Notes" shortcut="N" onClick={() => setNotesOpen(o=>!o)} active={notesOpen} />
  <ToolItem icon="🔤" label="Tra từ vựng" shortcut="T" onClick={() => {}} disabled />
</aside>

function ToolItem({ icon, label, shortcut, onClick, active, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex flex-col items-center gap-0.5 p-1.5 rounded text-[10px] w-14 ${
        active ? "bg-[#fef3c7] text-[#ff7c2b]" : disabled ? "text-gray-300" : "text-gray-600 hover:bg-gray-100"
      }`}>
      <span className="text-base">{icon}</span>
      <span className="font-semibold leading-none">{label}</span>
      <span className="text-[9px] text-gray-400">Phím ({shortcut})</span>
    </button>
  );
}
```

### 4. TRANSCRIPT (cột giữa)

- Top-right có toggle `Focus theo từ`
- Speaker label: căn phải, width 96px, xanh `#5a8c5a` semibold
- Sentences: clickable nếu có timing, highlight active xanh nhạt
- Auto-scroll active sentence vào view
- Padding: `p-6`, font-size `text-sm`, line-height `leading-relaxed`

Đã có `<TranscriptPlayer>` rồi — giữ nguyên, chỉ cần thêm toggle "Focus theo từ" và đảm bảo speaker label đúng style.

### 5. FORM/QUESTIONS (cột phải) — ⚠️ **CHỖ CẦN FIX DUPLICATE**

**❌ Hiện tại (lỗi):**
- Page header "Questions 31-40" + instruction
- Block với `qs.title` = "Questions 31-40" (TRÙNG)
- Block với `qs.instructionHtml` (TRÙNG)
- `<QSetRenderer>` render form (input + AnswerStatus)
- `<ReviewAnswerRow>` list bên dưới (TRÙNG với AnswerStatus)

**✅ Đích (theo ảnh):**
- CHỈ MỘT page header "Questions 31-40" + instruction
- Form gốc với cấu trúc layout giữ nguyên (bullet list, table, headings như "Roger Bacon (1200s)")
- Tại VỊ TRÍ MỖI INPUT: render `▶N ✕ → correct 📍` inline (KHÔNG còn input rỗng)
- KHÔNG có list ReviewAnswerRow rời bên dưới

**Cách làm:**
1. Bỏ outer page header → dùng `qs.title` + `qs.instructionHtml`
2. Cho `QSetRenderer` chế độ `mode="review"` mới: thay vì render `<input>` thì render component `<InlineReview>` chứa `▶N ✕ → correct 📍`
3. Xóa `<ReviewAnswerRow>` list

### 6. AUDIO BAR

- `00:00 / 06:34` mono time (góc trái)
- Volume slider (mute icon + thin slider)
- `⟲5 ▶ 5⟳` group ở giữa hoặc kế bên thời gian
- Progress bar cam dài full width
- `1x` speed dropdown bên phải

(Đã có `<ReviewAudioPlayer>` — chỉ cần điều chỉnh thứ tự + đảm bảo có volume slider)

### 7. PAGINATION + ACTIONS

- Hàng nhỏ dưới audio bar
- Trái: `31 32 33 34 35 36 37 38 39 40` các số pill nhỏ
- Phải: `[Xem lịch sử làm bài]` outline + `[Làm bài khác]` filled cam
- Mỗi số pill: click scroll đến câu đó
- Trạng thái pill:
  - Đúng: bg xanh `#5a8c5a` text trắng
  - Sai: bg đỏ `#ef4444` text trắng
  - Bỏ qua: bg trắng border xám text xám

```tsx
<div className="border-t border-gray-200 bg-white px-4 py-2 flex items-center gap-2">
  <div className="flex gap-1.5">
    {partQuestions.map(q => {
      const status = getStatus(q, answers);  // 'ok' | 'wrong' | 'skip'
      const cls = status==='ok' ? 'bg-[#5a8c5a] text-white border-[#5a8c5a]'
        : status==='wrong' ? 'bg-[#ef4444] text-white border-[#ef4444]'
        : 'bg-white text-gray-500 border-gray-300';
      return <button key={q.id} onClick={()=>scrollToQ(q.id)}
        className={`w-7 h-7 rounded text-xs font-bold border ${cls}`}>{q.order}</button>;
    })}
  </div>
  <div className="ml-auto flex gap-2">
    <Link href={`/practice/listening/${quiz.id}/result`} className="px-4 py-1.5 border border-[#ff7c2b] text-[#ff7c2b] rounded-full text-sm hover:bg-[#fef3c7]">
      Xem lịch sử làm bài
    </Link>
    <Link href={`/luyen-thi/ielts/listening`} className="px-4 py-1.5 bg-[#ff7c2b] text-white rounded-full text-sm hover:bg-[#e96a18]">
      Làm bài khác
    </Link>
  </div>
</div>
```

---

## ❌ Những lỗi cụ thể trong ảnh 1 (current impl)

| # | Lỗi | Đoạn code | Fix |
|---|-----|-----------|-----|
| 1 | "Questions 31-40" hiển thị 2 lần | `ListeningReviewClient.tsx` line 201-204 + qs.title block line 209 | Bỏ outer page header, giữ `qs.title` |
| 2 | "Complete the notes below" hiển thị 2 lần | Instruction text ở page header VÀ qs.instructionHtml | Bỏ instruction outer |
| 3 | ReviewAnswerRow list bên dưới form | line 220-242 | Xóa hẳn block này |
| 4 | Form vẫn có `<input>` rỗng trong review mode | QSetRenderer xài GapFilling cho NOTE_COMPLETION | Patch GapFilling/TableSelection: review mode swap input → InlineReview |
| 5 | Tool rail có Translate (không có chức năng) | line 150 | Đổi thành Highlight + giữ Notes + Tra từ vựng |
| 6 | Top nav band thiếu các tab YouPass | line 125-133 | Mở rộng theo spec section 1 |
| 7 | Thiếu "Focus theo từ" toggle | Transcript area | Thêm toggle ở top-right transcript |
| 8 | Bottom thiếu "Xem lịch sử / Làm bài khác" | line 249-261 | Thêm row pagination + actions theo section 7 |

---

## 📝 Notes

- **Focus theo từ toggle:** Theo YouPass nó bật chế độ word-level highlight (từng từ một). Hiện data chỉ có sentence-level → toggle này có thể skip hoặc làm fake (highlight cả câu vẫn vậy).
- **Tool rail buttons functional:** Highlight + Notes là tính năng tách rời, scope sau. Hiện chỉ cần UI đúng + button không-disabled, click không vỡ.
- **Tab Part:** YouPass chỉ có 1 quiz = 1 Part nên KHÔNG có Part tabs. Mình có thể giữ tabs (vì code đang là 1 quiz = 1 part) nhưng nếu chỉ 1 Part thì ẩn.

---

## 🖼 Lưu ảnh tham chiếu

User cần lưu screenshot YouPass thật vào:
```
docs/assets/youpass-review-reference.png    ← Image 2 (đúng - đích)
docs/assets/current-impl-screenshot.png      ← Image 1 (sai - hiện tại)
```

Để session sau mở md này thấy ảnh inline:
```markdown
![Target UI](./assets/youpass-review-reference.png)
```
