# PLAN: Rebrand YouPass → HIN + Áp dụng style NEO toàn site

> Mục tiêu: xoá sạch nhãn hiệu YouPass khỏi UI, đưa **TẤT CẢ** trang về cùng design system "HIN Neo Brutalism" như `app/page.tsx` và `LibraryClient.tsx` đã làm.

---

## PHẦN A — DESIGN SYSTEM (baseline)

**Đã có sẵn trong `web/app/globals.css`** — KHÔNG sửa, chỉ tái sử dụng:

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--color-bg` | `#F5F1E9` | Nền chính (cream) |
| `--color-ink` | `#1a1a1a` | Chữ + border + shadow |
| `--color-card` | `#FDFCF9` | Nền card |
| `--color-red` | `#d9381e` | Accent (hover, focus, badge nhấn) |
| `--color-yellow` | `#FFD700` | Active tag, badge ID, highlight |
| `--font-display` | Fraunces | Heading lớn (h1, h2, hero) |
| `--font-sans` | Inter | Body text |
| `--font-mono` | JetBrains Mono | Tag, label `// kiểu code-comment`, badge ID |

**Class utility có sẵn:**
- `.shadow-neo-sm` = `4px 4px 0 0 #1a1a1a`
- `.shadow-neo` = `8px 8px 0 0 #1a1a1a`
- `.shadow-neo-lg` = `12px 12px 0 0 #1a1a1a`
- `.btn-press` = hover/active translate + shadow giảm

**Quy tắc NEO:**
- ✅ Border 2px solid `#1a1a1a` cho mọi card / input / button quan trọng
- ✅ Shadow offset (4/8/12px), KHÔNG dùng blur shadow
- ✅ Hover: translate-y nhẹ + giảm shadow (không opacity)
- ✅ Label phụ: monospace, prefix `// `
- ❌ Không dùng gradient
- ❌ Không dùng rounded-full quá nhiều (ưu tiên rounded-md hoặc vuông)
- ❌ Không dùng màu xanh lá YouPass (`#168b32`, `#dcfce7`) hay cam YouPass (`#ff7c2b`, `#f97316`)

---

## PHẦN B — INVENTORY: trang nào đã HIN, trang nào chưa

| # | Route | File | Trạng thái | Việc cần làm |
|---|---|---|---|---|
| 1 | `/` | `app/page.tsx` | ✅ HIN | Giữ nguyên |
| 2 | `/luyen-thi/ielts/reading` | `LibraryClient.tsx` | ✅ HIN | Giữ nguyên |
| 3 | `/practice/reading/[id]/result` | `ResultClient.tsx` | ✅ HIN | Giữ nguyên |
| 4 | `/luyen-thi/ielts/listening` | `app/luyen-thi/ielts/listening/page.tsx` | ⚠️ Cần kiểm tra | **Đồng bộ y hệt** reading library |
| 5 | `/thi-thu/reading/[id]` (prep) | `PrepClient.tsx` | ❌ Có "YouPass" logo cam | **Rebrand toàn bộ** |
| 6 | `/thi-thu/reading/[id]` (exam) | `ExamClient.tsx` | ❌ Style cũ | **Rebrand toàn bộ** |
| 7 | `/thi-thu/listening/[id]` (exam + review) | `ListeningClient.tsx` + `ListeningReviewClient.tsx` | ❌ Header YouPass xanh lá | **Rebrand mạnh nhất** (ảnh user gửi) |
| 8 | `/practice/reading/[id]` | `PracticeClient.tsx` | ❌ Cần kiểm tra | **Rebrand** |
| 9 | `/practice/listening/[id]/result` | `app/practice/listening/[id]/result/page.tsx` | ❌ Orphan (xem Phần D) | Xoá hoặc rebrand sau khi user quyết |

---

## PHẦN C — KẾ HOẠCH REBRAND CHI TIẾT (5 giai đoạn)

### GĐ 1 — Tạo component shared `HinTopNav` (1 lần, dùng mọi nơi)

**Vấn đề**: Mỗi trang đang tự render top nav riêng → khó đồng bộ. Trang review listening (ảnh user gửi) có **2 header chồng nhau** (HIN nav + YouPass nav xanh lá).

**Việc**: Tạo file mới `web/components/shared/HinTopNav.tsx`:
- Tái dùng đúng cấu trúc nav của `app/page.tsx` (logo HIN NAVIGATOR + 2 link "READING" / "LISTENING")
- Prop `variant`: `"full"` (homepage) | `"compact"` (trong exam, ngắn hơn) | `"minimal"` (trong review, chỉ logo + back button)
- Prop `onBack?: () => void` cho nút quay lại
- Border-bottom 2px ink, sticky top-0 z-50

**Lợi**: thay tất cả top nav cũ bằng 1 dòng `<HinTopNav variant="..." />`.

---

### GĐ 2 — Xoá nhãn YouPass khỏi UI (3 vị trí)

| Vị trí | File:line | Action |
|---|---|---|
| Listening review header xanh lá | `ListeningReviewClient.tsx:212-234` | **Xoá toàn bộ block** `<header>` cũ (My Homepage / Sổ Từ vựng / Nâng cấp PRO / YouPass…). Thay bằng `<HinTopNav variant="minimal" onBack={...} />` |
| Reading prep breadcrumb | `PrepClient.tsx:42-44` | **Xoá** `<div Y>` + `<span>YouPass</span>`. Thay bằng `<HinTopNav variant="compact" />` |
| Reading exam header (nếu có) | `ExamClient.tsx` | Tương tự, thay bằng `HinTopNav` |
| API Referer header | `web/app/api/vocab/route.ts:82-83` | **GIỮ NGUYÊN** — đây là HTTP header gọi upstream, không phải UI text |

---

### GĐ 3 — Rebrand các trang exam/review (việc lớn nhất)

#### 3.1 `PrepClient.tsx` (`/thi-thu/reading/[id]`)
- Bỏ gradient cam, gray-50, gray-800
- Nền `#F5F1E9`, card `#FDFCF9` + `border-2 border-[#1a1a1a]` + `shadow-neo-sm`
- Heading bài thi: `font-display` (Fraunces), text-4xl
- Tag part/thời gian: mono `// PART 1 - 20 MIN`
- Nút "Bắt đầu" / "Xem lại": dùng class `.btn-press shadow-neo` (đen text cream / cream text đen)
- 2 nút side-by-side hoặc stack (xem ảnh homepage làm mẫu)

#### 3.2 `ExamClient.tsx` (`/practice/reading/[id]`)
- Timer pill: bg đen text cream + border 2px + shadow-neo-sm
- Bottom navigator (1-40 nút câu): nút vuông 2px border, đáp án đã làm fill gold `#FFD700`, câu hiện hành fill red `#d9381e` text trắng
- Passage panel: card cream off-white + border, `passage-html` giữ nguyên typography
- Question panel: stack với divider 2px ink

#### 3.3 `ListeningClient.tsx` + `ListeningReviewClient.tsx` (lớn nhất)
**Review mode (trang trong ảnh)**:
- **XOÁ** header xanh lá (My Homepage, Khoá học, Sổ Từ vựng, IELTS 1984, Nâng cấp PRO, YouPass)
- **XOÁ** sidebar cũ "CÔNG CỤ" nếu redesign sang dạng top-bar
- Thay bằng:
  - `HinTopNav variant="minimal"` ở trên (chỉ logo HIN + back về library)
  - Sub-bar mảnh chứa: timer/score "00:30 / 0/10 câu đúng" (font mono), nút "Xem note", "Cài đặt", "Chia sẻ" — tất cả border 2px ink + bg cream + btn-press
  - Tool sidebar (Highlight H / Notes N / Tra từ T): card nhỏ vuông, gold khi active
- Transcript area: bg `#FDFCF9`, border 2px, padding rộng, font 15px Inter
- Vocab popup (`VocabPopup.tsx`):
  - Border 2px ink, shadow-neo-sm, bg cream
  - Header: từ + IPA mono + POS tag (mono)
  - "+ Lưu từ vựng" → button neo
  - "Sao chép" → button neo
- Audio player bottom: bg ink (`#1a1a1a`), text cream, controls red `#d9381e`, progress gold `#FFD700`
- Question panel bên phải: card border 2px, options dạng pill border 2px (selected → fill gold)

#### 3.4 `PracticeClient.tsx` (`/practice/reading/[id]`)
- Tương tự ExamClient nhưng với mode review (highlight đáp án đúng/sai bằng red/gold)
- Reuse `AnswerStatus.tsx` đã có, restyle border + shadow

---

### GĐ 4 — Rebrand `qset/*` (component nội bộ câu hỏi)

12 file trong `web/components/qset/`. Mỗi file cần:

| File | Sửa gì |
|---|---|
| `MultipleChoice.tsx`, `SingleChoice.tsx` | Option = button border-2 ink, hover translate-y, selected = bg gold `#FFD700`, đúng = bg `#16a34a`→ đổi sang gold viền red, sai = bg red `#d9381e` |
| `GapFilling.tsx` | Input border-2 ink + focus shadow red, font mono cho chỗ điền |
| `TableSelection.tsx` | Bảng: th border-2 ink bg ink text cream, td border ink, ô chọn = gold |
| `MatchingHeadings.tsx`, `MatchingInfo.tsx` | Drag handle border-2 ink, drop zone dashed-2 ink |
| `ShortAnswer.tsx` | Input neo + nút "Kiểm tra" btn-press |
| `LabelDiagram.tsx` | Pin/marker red, label border-2 |
| `QSetHeader.tsx` | Title font-display, instruction font-sans, code-comment cho metadata |
| `QSetRenderer.tsx` | Wrapper card neo + padding |
| `AnswerStatus.tsx` | Badge: đúng = gold, sai = red, chưa làm = trống border-2 |

---

### GĐ 5 — Listening library `/luyen-thi/ielts/listening`

Đồng bộ y hệt `LibraryClient.tsx` của reading:
- Hero + search bar focus red
- Tag filter gold/cream
- Exam card 16:10 + meta footer
- Pagination neo

(Có thể tách `LibraryClient.tsx` thành component dùng chung `LibraryShell` nhận prop `mode="reading" | "listening"` để tránh trùng code.)

---

### GĐ 6 — Dọn dẹp CSS legacy

`web/app/globals.css` còn các biến cũ KHÔNG còn ai dùng (sau khi rebrand xong):
```css
--yp-orange, --yp-orange-light, --yp-green, --yp-green-active,
--yp-navy, --yp-gray-bg
```
→ **Xoá** sau khi đã rebrand xong tất cả page (grep `var(--yp-` không còn match nào).

---

## PHẦN D — TRANG / FILE NGHI NGỜ KHÔNG DÙNG (chờ xác nhận)

> Đây là danh sách **đề xuất xoá** — KHÔNG xoá đến khi user duyệt từng dòng.

### D.1 Page route nghi ngờ dead

| # | Đường dẫn | Lý do nghi ngờ | Xoá? (đợi user) |
|---|---|---|---|
| 1 | `web/app/practice/listening/[id]/result/page.tsx` | **Orphan**: không có trang `/practice/listening/[id]` (chỉ có result). Không trang nào link tới `/practice/listening/[id]/result` đúng cách. Flow listening hiện đi thẳng từ exam → review trong cùng `/thi-thu/listening/[id]?type=review`. | ⬜ |
| 2 | `web/app/practice/listening/[id]/` (thư mục) | Chỉ chứa `result/` → nếu xoá #1 thì xoá luôn cây thư mục | ⬜ |
| 3 | `web/app/practice/reading/[id]/page.tsx` (PracticeClient) | Trùng chức năng với `/thi-thu/reading/[id]` (cả 2 đều dẫn ExamClient). Cần xác nhận flow thực tế: user vào đâu? | ⬜ |

### D.2 Scripts trong `src/` có vẻ một lần dùng rồi bỏ

Đây là Node scripts dò/crawl, không phải code chạy của app. Nhiều file `test-*.js`, `snap-*.js`, `firecrawl-*.js`, `inspect-*.js`, `probe-*.js` chỉ chạy 1 lần trong giai đoạn dò API. Có thể move sang `src/_archive/`:

| Group | File ví dụ | Đề xuất |
|---|---|---|
| Firecrawl thử nghiệm | `firecrawl-7926.js`, `firecrawl-explore.js`, `firecrawl-samples.js`, `firecrawl-listening-10501.js`, `firecrawl-all-quizzes.js`, `crawl-firecrawl.js` | ⬜ Archive |
| Inspect/Probe 1 lần | `inspect-deep.js`, `inspect-types.js`, `probe-listening-audio.js`, `probe-listening-types.js`, `portal-scan.js`, `explore.js` | ⬜ Archive |
| Test quick scripts | `test-known-id.js`, `test-gap-review.js`, `test-gapfill-review.js`, `test-gapfill-zoom.js`, `test-notes-panel.js`, `test-review-mode.js`, `test-listening.js`, `test-listening-all-pages.js`, `test-listening-crawl.js`, `test-listening-lib.js`, `test-listening-multi.js`, `test-listening-types.js` | ⬜ Archive |
| Screenshot crawl | `local-screenshots.js`, `local-screenshots2.js`, `download-screenshots.js`, `crop-screenshots.js`, `screenshot-final.js`, `screenshot-missing.js`, `snap-clone.js`, `snap-exam-page.js`, `snap-portal-listening.js`, `snap-portal-review.js`, `snap-types-clean.js`, `pick-and-snap-types.js` | ⬜ Archive |
| Login đa phiên bản | `login-fresh.js`, `login-portal.js`, `login-real-chrome.js`, `crawl-with-real-chrome.js` | ⬜ **Giữ** `login-and-sniff-vocab.js` + `extract-session.js`, **archive** phần còn lại |
| Show/inspect/audit | `show-exam.js`, `show-3-exams.js`, `count-totals.js`, `check-10501.js`, `check-types-distribution.js`, `verify-*.js`, `audit-*.js` | ⬜ Archive |
| Sniffer cũ | `api-sniffer.js`, `sniff-vocab.js` | ⬜ Archive (đã có `login-and-sniff-vocab.js` thay thế) |
| Normalize backup | `normalize-legacy.js.bak`, `normalize-legacy.js` | ⬜ Xoá `.bak` luôn, archive `normalize-legacy.js` (đã có `normalize-listening.js` + `normalize.js`) |

**Scripts GIỮ LẠI (active)**:
- `normalize.js`, `normalize-listening.js` — pipeline normalize đang dùng
- `login-and-sniff-vocab.js` — refresh session
- `extract-session.js` — extract storage state (mới tạo)
- `verify-session.js` — kiểm tra session
- `download-listening-audio.js` — tải audio
- `harvest-*.js`, `crawl-listening-quiz.js`, `crawl-reading-quiz.js`, `crawl-reading-type.js`, `playwright-crawl-all.js`, `playwright-crawl-listening.js` — crawl chính (xác nhận lại với user)

### D.3 File markdown plan/doc dư

Trong root project có nhiều `PLAN_*.md` và `docs/*.md`. Tuỳ user muốn giữ làm reference hay archive:

| File | Đề xuất |
|---|---|
| `PLAN_VOCAB_IMPLEMENTATION.md` | ⬜ Giữ (đã hoàn thành, làm tài liệu) |
| `PLAN_FIX_VOCAB_401.md` | ⬜ Có thể xoá sau khi đã refresh session ổn định |
| `PLAN_FIX_LISTENING_REVIEW_UI.md` | ⬜ Merge vào plan này hoặc xoá |
| `PLAN_LISTENING_QA.md` | ⬜ Kiểm tra còn task hở không |
| `PLAN_UI_HIN_REDUCED.md` | ⬜ Đã hoàn thành → archive |
| `PLAN_LISTENING_REVIEW_UI.md` | ⬜ Merge vào plan này |

### D.4 Data folder lớn cần dọn

| Path | Note |
|---|---|
| `data/sessions/chrome-profile/` | Profile cũ (Chromium), không còn dùng vì đã chuyển sang `chrome-profile-real`. ⬜ Xoá |
| `data/api/vocab/all-calls.json`, `vocab-only.json` | Output của sniff, file phân tích — ⬜ archive vào `_research/` |
| `data/sessions/session.json` | Readable summary, code app không đọc — ⬜ giữ làm reference hoặc xoá |

---

## PHẦN E — THỨ TỰ THỰC THI ĐỀ XUẤT

1. **User duyệt mục D** (xác nhận file nào xoá / archive / giữ) — quan trọng làm trước để khỏi đụng vào code chuẩn bị xoá
2. **GĐ 1**: Tạo `HinTopNav` component shared
3. **GĐ 2**: Xoá nhãn YouPass khỏi 3 vị trí UI (PrepClient, ListeningReviewClient, ExamClient header)
4. **GĐ 5**: Listening library (việc nhỏ, copy reading library)
5. **GĐ 3.3**: Listening review (việc lớn nhất, có ảnh user gửi → ưu tiên)
6. **GĐ 3.1, 3.2**: Reading prep + exam
7. **GĐ 3.4**: Practice listening result (nếu user quyết giữ)
8. **GĐ 4**: Rebrand `qset/*` 12 file
9. **GĐ 6**: Xoá `--yp-*` legacy vars khỏi `globals.css`
10. **Verify**: `grep -ri "YouPass\|youpass\|#168b32\|#dcfce7\|#ff7c2b\|--yp-" web/` → phải không còn kết quả nào (trừ URL upstream API)

---

## PHẦN F — CHECKLIST CHO USER DUYỆT

### Trước khi rebrand UI:
- [ ] Duyệt **D.1** — xoá `/practice/listening/[id]/result` (orphan)?
- [ ] Duyệt **D.1** — gộp `/practice/reading/[id]` và `/thi-thu/reading/[id]` thành 1 route?
- [ ] Duyệt **D.2** — danh sách Node scripts archive (~50 file)
- [ ] Duyệt **D.3** — markdown PLAN files cần dọn
- [ ] Duyệt **D.4** — folder data dọn

### Rebrand UI (sau khi xác nhận xoá):
- [ ] GĐ 1 — `HinTopNav` shared
- [ ] GĐ 2 — Xoá nhãn YouPass UI (3 chỗ)
- [ ] GĐ 3.3 — Listening review (ảnh user gửi)
- [ ] GĐ 3.1 — Reading prep
- [ ] GĐ 3.2 — Reading exam
- [ ] GĐ 3.4 — Practice reading
- [ ] GĐ 4 — `qset/*` 12 component
- [ ] GĐ 5 — Listening library
- [ ] GĐ 6 — Xoá `--yp-*` CSS vars

---

> **Note**: Plan này CHƯA SỬA code. Đợi user duyệt mục D + xác nhận thứ tự GĐ trước khi triển khai.
