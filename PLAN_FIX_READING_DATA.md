# 📘 PLAN A — SỬA DỮ LIỆU READING (Hướng dẫn từng bước cho người mới)

> **Ngày tạo:** 2026-05-13
> **Mục tiêu:** Sửa 191/510 đề Reading bị thiếu câu hỏi (không cần crawl lại)
> **Đối tượng:** Người không có kinh nghiệm code — chỉ cần copy-paste
> **Tổng thời gian:** ~30 phút

---

## 🧠 BẠN CẦN BIẾT TRƯỚC

### Vấn đề là gì?
- Có **510 đề Reading** đã được tải về máy → lưu trong `data/exams/{id}.json`
- Sau khi "chuẩn hoá" (normalize), kết quả ra `data/normalized/{id}.json` → dùng để hiển thị trên web
- Bug: Script chuẩn hoá cũ chỉ hiểu **1 trong 2 định dạng** API trả về → **191 đề bị mất câu hỏi**
- Giải pháp: Viết thêm logic xử lý định dạng cũ → chạy lại chuẩn hoá → xong

### Bạn sẽ làm gì?
Tất cả các bước đều là **copy-paste command vào terminal** và **copy-paste code vào file**. Không cần hiểu code.

### Terminal là gì?
- Bấm `Win + R` → gõ `powershell` → Enter
- Hoặc trong VS Code: bấm `Ctrl + ~` (dấu ngã, dưới phím Esc)
- Bất kỳ dòng nào trong plan này có nền xám và bắt đầu bằng `>` hoặc lệnh → copy nó → paste vào terminal → Enter

### Bạn đang ở đâu?
Mọi lệnh dưới đây giả định bạn đang ở thư mục `D:\YouPassClone`. Để chuyển vào đó:

```powershell
cd D:\YouPassClone
```

---

## 📋 CHECKLIST TRƯỚC KHI BẮT ĐẦU

Đánh dấu ✅ khi đã xong:

- [ ] Bạn đã mở PowerShell hoặc terminal trong VS Code
- [ ] Bạn đang ở thư mục `D:\YouPassClone` (gõ `pwd` để kiểm tra)
- [ ] Server `npm run dev` đang chạy ở http://localhost:3000 (mở Chrome thử xem)
- [ ] Bạn có thể mở các file `.js`, `.md` bằng VS Code hoặc Notepad

> ⚠️ Nếu server chưa chạy: mở 1 terminal khác → `cd D:\YouPassClone\web` → `npm run dev` → để nó chạy nền.

---

# 🚀 BẮT ĐẦU THỰC HIỆN

---

## BƯỚC 1 — BACKUP DỮ LIỆU (2 phút) 🛡️

### Tại sao?
Phòng khi script mới làm hỏng → có bản gốc để restore.

### Lệnh:

```powershell
Copy-Item -Recurse -Path "data\normalized" -Destination "data\normalized.backup-2026-05-13"
```

### Kiểm tra:

```powershell
(Get-ChildItem "data\normalized.backup-2026-05-13\*.json").Count
```

**Kết quả mong đợi:** `510`

> ✅ Nếu ra `510` → tiếp BƯỚC 2.
> ❌ Nếu lỗi: chụp màn hình terminal gửi tôi.

---

## BƯỚC 2 — TẠO SCRIPT AUDIT (5 phút) 📊

### Tại sao?
Script này quét toàn bộ 510 đề, báo cáo đề nào OK / đề nào hỏng. Bạn sẽ chạy trước và sau khi fix để so sánh.

### Cách làm:

1. Mở VS Code (hoặc Notepad).
2. Tạo file mới tại đường dẫn: `D:\YouPassClone\src\audit-reading-data.js`
3. Copy **TOÀN BỘ** code dưới đây paste vào file đó → Save.

```javascript
// src/audit-reading-data.js
// Quét data/normalized/*.json — báo cáo đề OK vs broken
const fs = require('fs');
const path = require('path');

const NORM_DIR = path.join(__dirname, '../data/normalized');

function audit() {
  const files = fs.readdirSync(NORM_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'));

  let ok = 0;
  const broken = [];

  for (const f of files) {
    const id = f.replace('.json', '');
    try {
      const d = JSON.parse(fs.readFileSync(path.join(NORM_DIR, f), 'utf8'));
      const parts = d.parts || [];
      let totalQsets = 0;
      let totalQuestions = 0;
      for (const p of parts) {
        const qsets = p.questionSets || [];
        totalQsets += qsets.length;
        for (const qs of qsets) totalQuestions += (qs.questions || []).length;
      }
      if (totalQsets === 0 || totalQuestions === 0) {
        broken.push({ id, title: d.title, qsets: totalQsets, q: totalQuestions });
      } else {
        ok++;
      }
    } catch (e) {
      broken.push({ id, error: e.message });
    }
  }

  console.log('═══════════════════════════════════════');
  console.log(`  Tổng số đề:     ${files.length}`);
  console.log(`  ✅ OK:           ${ok}`);
  console.log(`  ❌ Broken:       ${broken.length}`);
  console.log('═══════════════════════════════════════');

  if (broken.length) {
    console.log('\n10 đề broken đầu tiên:');
    for (const b of broken.slice(0, 10)) {
      console.log(`  ID ${b.id}: ${b.title || b.error}`);
    }
    fs.writeFileSync(
      path.join(__dirname, '../data/broken-reading-ids.json'),
      JSON.stringify(broken.map(b => b.id), null, 2)
    );
    console.log(`\n→ Danh sách đầy đủ saved: data/broken-reading-ids.json`);
  }
}

audit();
```

### Chạy thử:

```powershell
node src\audit-reading-data.js
```

**Kết quả mong đợi (TRƯỚC khi fix):**
```
═══════════════════════════════════════
  Tổng số đề:     510
  ✅ OK:           319
  ❌ Broken:       191
═══════════════════════════════════════

10 đề broken đầu tiên:
  ID 1000: [Trainer] - The Pursuit of Happiness
  ID 1001: ...
  ...
→ Danh sách đầy đủ saved: data/broken-reading-ids.json
```

> ✅ Nếu thấy số `191` broken → đúng. Sang BƯỚC 3.
> ❌ Nếu số khác → báo tôi.

---

## BƯỚC 3 — TẠO MODULE NORMALIZE LEGACY (10 phút) 🛠️

### Đây là phần CORE — bạn cẩn thận copy-paste.

### Cách làm:

1. Tạo file mới: `D:\YouPassClone\src\normalize-legacy.js`
2. Copy **TOÀN BỘ** code dưới đây paste vào → Save.

```javascript
// src/normalize-legacy.js
// Xử lý format CŨ của YouPass API: part.questions[] (flat) → part.question_sets[] (grouped)

/**
 * Map old question_type → new question_type
 */
const TYPE_MAP = {
  MULTIPLE_CHOICE_ONE: 'SINGLE_CHOICE',
  MULTIPLE_CHOICE_MANY: 'MULTIPLE_CHOICE_MANY',
  TRUE_FALSE: 'SINGLE_SELECTION',
  YES_NO: 'SINGLE_SELECTION',
  MATCHING_HEADING: 'MATCHING_HEADINGS',
  MATCHING_INFO: 'MATCHING_FEATURES',
  MATCHING_NAMES: 'MATCHING_FEATURES',
  FILL_BLANK: 'GAP_FILLING',
  MAP_DIAGRAM_LABEL: 'GAP_FILLING',
  OTHERS: 'GAP_FILLING', // fallback — sẽ refine sau
};

/**
 * Hardcoded option sets (cho TRUE_FALSE / YES_NO)
 */
const TFNG = [
  { option: 'TRUE', text: 'TRUE' },
  { option: 'FALSE', text: 'FALSE' },
  { option: 'NOT GIVEN', text: 'NOT GIVEN' },
];
const YNNG = [
  { option: 'YES', text: 'YES' },
  { option: 'NO', text: 'NO' },
  { option: 'NOT GIVEN', text: 'NOT GIVEN' },
];

/**
 * Tách `gap_fill_in_blank` HTML → trích các pattern {[answer][order]}
 * Trả về: { html (đã thay placeholder), pairs: [{order, answer}] }
 */
function extractGapPattern(html) {
  if (!html) return { html: '', pairs: [] };
  const pairs = [];
  const replaced = html.replace(
    /\{\[([^\]]*)\]\[(\d+)\]\}/g,
    (_m, answer, order) => {
      const ord = parseInt(order, 10);
      pairs.push({ order: ord, answer: answer.trim() });
      return `<span class="gap-placeholder" data-question-id="gf_${ord}">${ord}</span>`;
    }
  );
  return { html: replaced, pairs };
}

/**
 * Group các câu liên tục cùng question_type → 1 question_set
 */
function groupConsecutiveByType(questions) {
  const groups = [];
  let current = null;
  for (const q of questions) {
    const t = q.question_type || 'OTHERS';
    if (!current || current.type !== t) {
      current = { type: t, items: [q] };
      groups.push(current);
    } else {
      current.items.push(q);
    }
  }
  return groups;
}

/**
 * Trích options chung từ câu đầu tiên của group
 * (MATCHING_HEADING table có thể nằm trong gap_fill_in_blank — nâng cấp sau)
 */
function buildOptions(firstQuestion) {
  if (firstQuestion.selection_option && firstQuestion.selection_option.length) {
    return firstQuestion.selection_option.map(o => ({
      option: o.option,
      text: o.text || o.option,
    }));
  }
  return null;
}

/**
 * Normalize một question từ format CŨ → format mới (dùng cho UI render)
 */
function normalizeLegacyQuestion(q, order) {
  const base = {
    id: q.id,
    order: q.order || order,
    type: TYPE_MAP[q.question_type] || 'GAP_FILLING',
    text: '',
    content: '',
    options: null,
    correctAnswer: null,
    correctAnswers: null,
    explanationHtml: q.explain || '',
    locateInfo: q.locate_info || null,
    matchingHeadingParagraph: q.matching_heading_paragraph || null,
    mapPosition: q.map_position || null,
    audioUrl: q.audio_url || null,
    sampleAnswers: q.sample_answers || null,
  };

  const ot = q.question_type;

  // MCQ ONE: text từ selection[0] hoặc gap_fill, options từ single_choice_radio
  if (ot === 'MULTIPLE_CHOICE_ONE' && q.single_choice_radio) {
    const opts = q.single_choice_radio;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    base.options = opts.map((o, i) => ({ option: letters[i], text: o.text }));
    const correctIdx = opts.findIndex(o => o.correct);
    if (correctIdx >= 0) base.correctAnswer = letters[correctIdx];
    base.text = (q.gap_fill_in_blank || '').replace(/<[^>]+>/g, '').trim() ||
                q.content || '';
    return base;
  }

  // MCQ MANY: từ mutilple_choice (typo gốc)
  if (ot === 'MULTIPLE_CHOICE_MANY' && q.mutilple_choice) {
    const opts = q.mutilple_choice;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    base.options = opts.map((o, i) => ({ option: letters[i], text: o.text }));
    base.correctAnswers = opts
      .map((o, i) => (o.correct ? letters[i] : null))
      .filter(Boolean);
    base.text = (q.description || '').replace(/<[^>]+>/g, '').trim().slice(0, 200);
    return base;
  }

  // TRUE_FALSE / YES_NO / MATCHING_*: dùng selection[0]
  if (q.selection && q.selection.length) {
    const sel = q.selection[0];
    base.text = sel.text || '';
    base.correctAnswer = sel.answer || '';
  }

  // MATCHING_HEADING: paragraph letter là phần "text", answer là roman
  if (ot === 'MATCHING_HEADING' && q.selection && q.selection[0]) {
    const m = q.selection[0].text.match(/Paragraph\s+([A-Z])/i);
    if (m) base.matchingHeadingParagraph = m[1];
  }

  // FILL_BLANK / MAP_DIAGRAM / OTHERS: nội dung từ gap_fill_in_blank
  if (
    (ot === 'FILL_BLANK' || ot === 'MAP_DIAGRAM_LABEL' || ot === 'OTHERS') &&
    !base.text
  ) {
    const { pairs } = extractGapPattern(q.gap_fill_in_blank || '');
    const match = pairs.find(p => p.order === q.order);
    if (match) {
      // first answer (split by |)
      base.correctAnswer = match.answer.split('|')[0].trim();
      base.correctAnswers = match.answer.split('|').map(s => s.trim());
    }
  }

  return base;
}

/**
 * Xây question_set từ 1 group
 */
function buildQuestionSet(group, groupIndex, passageHtmlRef) {
  const firstQ = group.items[0];
  const newType = TYPE_MAP[group.type] || 'GAP_FILLING';

  // Options
  let options = buildOptions(firstQ);
  if (newType === 'SINGLE_SELECTION' && !options) {
    options = group.type === 'YES_NO' ? YNNG : TFNG;
  }

  // Content (passage chung): với FILL_BLANK/MAP, gap_fill_in_blank chứa nội dung
  let contentHtml = '';
  if (
    group.type === 'FILL_BLANK' ||
    group.type === 'MAP_DIAGRAM_LABEL' ||
    group.type === 'OTHERS'
  ) {
    // Lấy gap HTML từ câu đầu của group (thường tất cả câu cùng group share 1 gap_fill_in_blank)
    const fullGap = firstQ.gap_fill_in_blank || '';
    const { html } = extractGapPattern(fullGap);
    contentHtml = html;
  }

  return {
    id: firstQ.id * 1000 + groupIndex, // synthesized
    type: newType,
    title: '',
    instructionHtml: firstQ.description || '',
    contentHtml,
    options,
    optionTitle: null,
    allowReuse:
      group.type === 'MATCHING_INFO' ||
      /more than once/i.test(firstQ.description || ''),
    maxSelections: group.type === 'MULTIPLE_CHOICE_MANY' ? 2 : null,
    image: null,
    sort: groupIndex,
    questions: group.items.map((q, i) =>
      normalizeLegacyQuestion(q, q.order || i + 1)
    ),
  };
}

/**
 * MAIN: chuyển flat questions → question_sets
 */
function normalizeLegacyQuestions(flatQuestions, passageHtml) {
  if (!flatQuestions || !flatQuestions.length) return { questionSets: [], passageHtml };

  const groups = groupConsecutiveByType(flatQuestions);
  const questionSets = groups.map((g, i) => buildQuestionSet(g, i, { passageHtml }));

  // Cập nhật passage: nếu có FILL_BLANK group → đảm bảo passage chứa gap-placeholder
  // (đã xử lý ở contentHtml của từng group, nên passage giữ nguyên)
  return { questionSets, passageHtml };
}

module.exports = { normalizeLegacyQuestions };
```

> 💡 **Mẹo:** Trong VS Code, sau khi paste, bấm `Shift+Alt+F` để format đẹp file.

---

## BƯỚC 4 — CHỈNH SỬA NORMALIZE.JS (5 phút) 🔧

### Tại sao?
File gốc `src/normalize.js` chỉ xử lý format mới. Ta sửa nó dùng module legacy khi cần.

### Cách làm:

1. Mở file `D:\YouPassClone\src\normalize.js`
2. Tìm dòng đầu file → **thêm dòng require** sau dòng require đầu tiên:

```javascript
const { normalizeLegacyQuestions } = require('./normalize-legacy');
```

> Vị trí: ngay dưới `const path = require('path');` (dòng 2-3).

3. Tìm function `normalizePart` (khoảng dòng 75–90). Thay **TOÀN BỘ** function đó bằng:

```javascript
function normalizePart(part) {
  let questionSets = [];

  // Format MỚI: part.question_sets có data
  if (part.question_sets && part.question_sets.length > 0) {
    questionSets = part.question_sets.map(normalizeQuestionSet);
  }
  // Format CŨ: part.questions là flat array
  else if (part.questions && part.questions.length > 0) {
    const result = normalizeLegacyQuestions(part.questions, part.content);
    questionSets = result.questionSets;
  }

  return {
    id: part.id,
    index: part.passage || part.sort || 1,
    title: part.title || '',
    passageHtml: reconstructPassage(part),
    transcriptHtml: part.transcription || null,
    fileId: part.file_id || null,
    listenFrom: part.listen_from || null,
    listenTo: part.listen_to || null,
    instruction: part.instruction || null,
    taskInstruction: part.task_instruction || null,
    questionSets,
    explanations: part.explanations || [],
  };
}
```

4. Save file (`Ctrl+S`).

### Kiểm tra cú pháp (không chạy gì cả):

```powershell
node -c src\normalize.js
```

**Kết quả mong đợi:** **không in gì cả** (nghĩa là file hợp lệ).
> ❌ Nếu có lỗi `SyntaxError` → chụp gửi tôi.

---

## BƯỚC 5 — CHẠY NORMALIZE LẠI (1 phút) ⚙️

### Lệnh:

```powershell
node src\normalize.js
```

**Bạn sẽ thấy:** console in ra danh sách 510 file đang được xử lý. Mất khoảng **10–30 giây**.

**Kết thúc thành công sẽ thấy:** dòng cuối kiểu `Normalized 510 quizzes` hoặc tương tự.

> ❌ Nếu lỗi `TypeError` / `Cannot read property` → chụp gửi tôi.

---

## BƯỚC 6 — AUDIT LẠI ĐỂ XEM KẾT QUẢ (1 phút) 🔍

### Lệnh:

```powershell
node src\audit-reading-data.js
```

**Kết quả mong đợi:**
```
═══════════════════════════════════════
  Tổng số đề:     510
  ✅ OK:           510      ← phải là 510!
  ❌ Broken:       0        ← phải là 0!
═══════════════════════════════════════
```

> ✅ Nếu OK = 510, Broken = 0 → 🎉 thành công! Sang BƯỚC 7.
> ⚠️ Nếu vẫn còn broken (nhưng ít hơn 191) → tiến bộ, nhưng có type chưa map. Báo tôi danh sách `data/broken-reading-ids.json`.

---

## BƯỚC 7 — MỞ TRÌNH DUYỆT KIỂM TRA TỪNG ĐỀ (10 phút) 👀

### Mở các đề sau trên http://localhost:3000 :

| URL | Loại đề | Bạn kỳ vọng thấy gì |
|---|---|---|
| http://localhost:3000/thi-thu/reading/1000 | MATCHING_INFO | Danh sách Questions 1-6 + List of options A-F + drag/select |
| http://localhost:3000/thi-thu/reading/1001 | MCQ + YES_NO | MCQ với 4 options + Yes/No/NG cho phần sau |
| http://localhost:3000/thi-thu/reading/1039 | MATCHING_HEADING | List of Headings i-ix + drop zone cho từng paragraph |
| http://localhost:3000/thi-thu/reading/1082 | TRUE_FALSE | Questions với 3 options TRUE/FALSE/NG |
| http://localhost:3000/thi-thu/reading/1096 | MAP_DIAGRAM | Có ảnh map + ô điền số |
| http://localhost:3000/thi-thu/reading/1027 | OTHERS (short ans) | Câu hỏi ngắn + ô điền text |
| http://localhost:3000/thi-thu/reading/1040 | MATCHING_ENDINGS | Câu mở đầu + danh sách kết câu A-F |
| http://localhost:3000/thi-thu/reading/7248 | (đã OK trước đó) | Vẫn render đúng như cũ ✅ |

### Checklist cho mỗi đề:
- [ ] Hiển thị tiêu đề + passage
- [ ] Hiển thị câu hỏi (không phải chỉ Part 1 trống)
- [ ] Options đầy đủ
- [ ] Click/drag/gõ được trong mode "Làm bài"
- [ ] Số thứ tự câu hỏi đúng thứ tự

### Nếu phát hiện đề nào sai UI:
1. Chụp màn hình
2. Ghi rõ URL + mô tả ngắn lỗi
3. Gửi lại → tôi sẽ refine từng type

---

## BƯỚC 8 — TỔNG KẾT (1 phút) 🎉

### Lệnh in báo cáo cuối:

```powershell
node src\audit-reading-data.js
```

**Mục tiêu:**
```
✅ OK: 510
❌ Broken: 0
```

### File quan trọng đã tạo / sửa:

| File | Trạng thái |
|---|---|
| `data/normalized.backup-2026-05-13/` | Backup (giữ lại) |
| `src/audit-reading-data.js` | MỚI |
| `src/normalize-legacy.js` | MỚI |
| `src/normalize.js` | ĐÃ SỬA |
| `data/normalized/*.json` | ĐÃ REGENERATE |
| `data/broken-reading-ids.json` | sinh ra bởi audit (giữ để debug) |

---

# 🆘 TROUBLESHOOTING

### Lỗi: `Cannot find module './normalize-legacy'`
→ File chưa save, hoặc save sai tên/sai chỗ. Đảm bảo file ở **đúng** `D:\YouPassClone\src\normalize-legacy.js`.

### Lỗi: `node: command not found`
→ Mở terminal mới (Node có thể chưa vào PATH). Hoặc cài lại Node từ https://nodejs.org

### Server localhost:3000 không lên / 404 mỗi đề
→ Vào thư mục `D:\YouPassClone\web` chạy `npm run dev` (KHÔNG phải ở `D:\YouPassClone` gốc).

### Sau khi fix, có đề render xấu (chữ chồng, mất số)
→ Đây là vấn đề UI riêng, không phải data. Báo URL → tôi fix component.

### Muốn ROLLBACK về trước khi fix:

```powershell
Remove-Item -Recurse -Force data\normalized
Rename-Item data\normalized.backup-2026-05-13 normalized
```

---

# 📞 CẦN HỖ TRỢ

Sau mỗi BƯỚC, nếu kết quả **không khớp** mong đợi:
1. Chụp màn hình terminal (full text)
2. Chụp màn hình browser (nếu liên quan UI)
3. Gửi tôi kèm tên BƯỚC (vd: "BƯỚC 5 lỗi")

Tôi sẽ xử lý ngay.

---

# ✅ HOÀN TẤT

Khi cả 8 BƯỚC đều xanh → 510 đề Reading hoạt động.

Sau đó nếu cần đi tiếp:
- **Listening** (cùng vấn đề có thể có)
- **UI polish** cho từng type
- **Crawl thêm đề mới** (nếu YouPass có cập nhật)

Cứ báo tôi khi sẵn sàng.
