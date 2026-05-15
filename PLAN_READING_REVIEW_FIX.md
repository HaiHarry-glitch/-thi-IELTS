# PLAN: Fix Reading Review — UI vỡ + Explanation coverage

## PHẦN A — VẤN ĐỀ HIỆN TẠI (từ 3 ảnh user gửi)

### A.1 — Quiz 14-17 (MATCHING_INFO render dạng TABLE_SELECTION) bị vỡ
- Quiz 10427 có qset type `TABLE_SELECTION` nhưng question type là `MATCHING_INFO`
- 7 cột option (A-G) khiến cột câu hỏi bị ép → text vertical
- Trong khi YouPass render dạng **list** (mỗi câu 1 hàng + dropdown A-G)
- **Fix**: detect `MATCHING_INFO` trong TABLE_SELECTION → fallback sang MatchingInfo

### A.2 — AnswerStatus không match HIN/NEO style
- Hiện dùng `bg-green-50, bg-red-50, bg-amber-50` (màu youpass cam-xanh-lá)
- Phải đổi sang palette HIN: `#FFD700` (vàng), `#d9381e` (đỏ), `#F5F1E9` (kem), `#1a1a1a` (đen)
- 2px solid border + offset shadow

### A.3 — Duplicate answer info cho MULTIPLE_CHOICE_MANY
- Inline badge: `18 → C/E` ✓
- AnswerStatus dưới: "Chưa trả lời  Bạn chọn: (bỏ qua) • Đáp án: C / E ▼ Xem giải thích"
- → 2 thông tin trùng (user answer + correct)
- **Fix**: khi `reviewRender` provided, AnswerStatus chỉ hiện nút "Xem giải thích"

### A.4 — Locate button không mở giải thích (ảnh 3 YouPass)
- YouPass: bấm locate → highlight đoạn văn + **mở panel giải thích** bên dưới câu hỏi
- Hiện tại: chỉ highlight đoạn, không mở giải thích
- **Fix**: thêm callback `onLocateExpand(qId)` → expand explanation panel cho q đó

### A.5 — Vocab 401 "upstream error"
- Session lại hết hạn → cần refresh

---

## PHẦN B — KẾ HOẠCH FIX

### B.1 Fix TableSelection để fallback sang MatchingInfo khi cần (10 min)
- `QSetRenderer.tsx`: nếu `qs.type === "TABLE_SELECTION"` && first question type là `MATCHING_INFO` → render `<MatchingInfo>`
- Quiz 10427 sẽ render đúng dạng list

### B.2 Rebuild AnswerStatus theo NEO style + smart hide (20 min)
- Bỏ màu xanh lá / cam / amber
- Dùng border 2px ink, shadow offset
- Khi `reviewRender` provided ở component cha → AnswerStatus chỉ hiện nút expand + panel giải thích (không hiện "Bạn chọn / Đáp án" lines)
- Thêm prop `compactMode?: boolean` để control

### B.3 Wire locate → expand explanation (15 min)
- `ReadingReviewClient.tsx`: thêm state `expandedQuestionId: number | null`
- Khi click locate → set `expandedQuestionId = q.id` + highlight paragraph
- Truyền xuống QSetRenderer qua context hoặc prop ⇒ AnswerStatus expanded khi `q.id === expandedQuestionId`
- Approach: thay vì local state trong AnswerStatus, controlled từ ngoài

### B.4 Check explanation coverage cho 9 types (30 min)
Kiểm tra mỗi type render `explanationHtml` đúng:
| Type | Component | Có AnswerStatus? | OK? |
|---|---|---|---|
| GAP_FILLING | GapFilling | ✓ trong reviewRender | check |
| SHORT_ANSWER | ShortAnswer | ✓ | check |
| MULTIPLE_CHOICE_MANY | MultipleChoice | ✓ (duplicate) | fix B.2 |
| SINGLE_SELECTION (T/F/NG) | SingleSelection | ✓ | check |
| MATCHING_INFO | MatchingInfo | ✓ | check |
| MATCHING_HEADINGS | MatchingHeadings | ✓ | check |
| TABLE_SELECTION | TableSelection | dưới cùng | check |
| SINGLE_CHOICE | SingleChoice | ✓ | check |
| LABEL_DIAGRAM | LabelDiagram | ? | check |

### B.5 Refresh vocab session (user manual)
- `node src/login-and-sniff-vocab.js` → login YouPass → đóng Chrome
- `node src/extract-session.js` → save fresh cookies

---

## PHẦN C — THỨ TỰ ƯU TIÊN

1. **B.1** (TableSelection → MatchingInfo) — fix UI vỡ ngay
2. **B.2** (AnswerStatus NEO style + smart hide) — fix duplicate + look
3. **B.3** (locate → expand explanation) — match YouPass behavior
4. **B.4** (check 9 types) — verify hoàn chỉnh
5. **B.5** (vocab session) — user tự làm khi cần
