# PLAN — Listening QA: Kiểm tra lỗi render

> **Ngày:** 2026-05-13  
> **Đã fix trước plan này:**
> - FILL-IN-THE-BLANK không expand gaps (3 quiz)
> - Part order shift (Part 2→11-20, Part 3→21-30, Part 4→31-40)
> - qs.title stale ("Questions 1-5" khi orders là 21-25)
> - NOTE_COMPLETION có options → TableSelection (30 qsets)
> - gap-placeholder IDs không khớp orders sau shift (246→0 mismatch)
> - TableSelection header chữ chồng nhau
>
> **Trạng thái sau fix:** 0 gap_id_mismatch | 0 missing_options broken

---

## Mục tiêu

Phát hiện và sửa các lỗi render còn lại trên listening quizzes.
Mỗi bước chạy script audit → ghi nhận output → mở URL test → fix nếu cần.

---

## BƯỚC 1 — Audit script tổng (5')

```powershell
node -e "
const fs=require('fs');
const files=fs.readdirSync('./data/normalized-listening').filter(x=>x.endsWith('.json')&&!x.startsWith('_'));
const issues=[];
let totalQs=0;

for(const f of files){
  const d=JSON.parse(fs.readFileSync('./data/normalized-listening/'+f,'utf8'));
  if(d.unavailable)continue;
  const id=d.id;
  for(const p of d.parts||[])for(const qs of p.questionSets||[]){
    const type=qs.type;
    const orders=qs.questions.map(q=>q.order);
    totalQs+=orders.length;

    // A. Gap ID mismatch (inputs sẽ không render)
    if(qs.contentHtml&&qs.contentHtml.includes('gap-placeholder')&&!qs.options?.length){
      const ids=[...qs.contentHtml.matchAll(/data-question-id=.([^'\"]+)/g)]
        .map(m=>{const n=m[1].match(/(\d+)/);return n?parseInt(n[1]):null;}).filter(Boolean);
      const bad=ids.filter(n=>!orders.includes(n));
      if(bad.length)issues.push({id,type,bug:'gap_id_mismatch',orders:orders.join(','),ids:ids.join(',')});
    }

    // B. Questions không có order
    if(orders.some(o=>!o||o===0))issues.push({id,type,bug:'zero_order'});

    // C. Duplicate orders trong cùng quiz
    if(new Set(orders).size!==orders.length)issues.push({id,type,bug:'dup_orders',orders:orders.join(',')});

    // D. MAP_DIAGRAM_LABEL / MATCHING_INFO không có options VÀ không có contentHtml gap
    if(['MAP_DIAGRAM_LABEL','MATCHING_INFO'].includes(type)&&!qs.options?.length&&
       !(qs.contentHtml&&qs.contentHtml.includes('gap-placeholder')))
      issues.push({id,type,bug:'no_options_no_gaps'});

    // E. Type không xử lý được (ngoài danh sách QSetRenderer)
    const KNOWN=['SINGLE_SELECTION','SINGLE_CHOICE','MULTIPLE_CHOICE_ONE','GAP_FILLING',
      'FILL_BLANK','FILL-IN-THE-BLANK','NOTE_COMPLETION','TABLE_SELECTION','MATCHING_HEADINGS',
      'MATCHING_INFORMATION','MATCHING_INFO','MATCHING_FEATURES','MATCHING_ENDINGS','MATCHING_NAMES',
      'MATCHING','MULTIPLE_CHOICE','MULTIPLE_CHOICE_MANY','SHORT_ANSWER','SHORT_ANSWERS',
      'SENTENCE_COMPLETION','SUMMARY_COMPLETION','LABEL_DIAGRAM','MAP_LABELLING','MAP_DIAGRAM_LABEL','OTHERS'];
    if(!KNOWN.includes(type))issues.push({id,type,bug:'unknown_type'});
  }
}

const byBug={};
for(const i of issues)byBug[i.bug]=(byBug[i.bug]||0)+1;
console.log('=== LISTENING QA AUDIT ===');
console.log('Total questions:', totalQs);
console.log('Issues found:', issues.length);
console.log('By type:', JSON.stringify(byBug,null,2));
if(issues.filter(i=>i.bug==='gap_id_mismatch').length)
  issues.filter(i=>i.bug==='gap_id_mismatch').slice(0,5).forEach(i=>console.log('  ',JSON.stringify(i)));
if(issues.filter(i=>i.bug==='unknown_type').length)
  issues.filter(i=>i.bug==='unknown_type').forEach(i=>console.log('  unknown:',JSON.stringify(i)));
"
```

**Mong đợi:** Issues found: 0

---

## BƯỚC 2 — Smoke test 8 loại câu hỏi (15')

Mỗi type mở 1 URL đại diện. Checklist từng URL:

| URL | Type cần check | Checklist |
|-----|----------------|-----------|
| http://localhost:3000/thi-thu/listening/1369 | FILL-IN-THE-BLANK (Part 2 → 11-17, 18-20) | Inputs render trong text, số 11-20 |
| http://localhost:3000/thi-thu/listening/9967 | NOTE_COMPLETION (Part 3 → 21-30) | Bảng A/B/C, không có text+gạch phía trên |
| http://localhost:3000/thi-thu/listening/9969 | NOTE_COMPLETION + SINGLE_CHOICE | Questions 25-30: bảng radio, header chữ không chồng |
| http://localhost:3000/thi-thu/listening/8756 | SINGLE_CHOICE (Part 3 → 21-30) | Số đúng 21-25, 26-30 |
| http://localhost:3000/thi-thu/listening/1369 | MAP_DIAGRAM_LABEL (Part 2 → 18-20) | Ảnh trên, bảng A-I full-width phía dưới |
| http://localhost:3000/thi-thu/listening/1621 | MAP + TABLE_SELECTION | Map + radio table |
| http://localhost:3000/thi-thu/listening/8705 | MULTIPLE_CHOICE_ONE | Radio đơn, không row highlight |
| http://localhost:3000/thi-thu/listening/9703 | FILL_BLANK (Part 4 → 31-40) | Inputs render trong text, số 31-40 |

Tìm thêm URL cho các type khác:
```powershell
# Tìm 1 quiz có MATCHING_FEATURES
node -e "const fs=require('fs');for(const f of fs.readdirSync('./data/normalized-listening').filter(x=>x.endsWith('.json'))){const d=JSON.parse(fs.readFileSync('./data/normalized-listening/'+f,'utf8'));for(const p of d.parts||[])for(const qs of p.questionSets||[])if(qs.type==='MATCHING_FEATURES'){console.log(d.id,qs.type,qs.questions.map(q=>q.order).join(','));break;}}" | head -3

# Tìm 1 quiz có MATCHING_INFORMATION
node -e "const fs=require('fs');for(const f of fs.readdirSync('./data/normalized-listening').filter(x=>x.endsWith('.json'))){const d=JSON.parse(fs.readFileSync('./data/normalized-listening/'+f,'utf8'));for(const p of d.parts||[])for(const qs of p.questionSets||[])if(qs.type==='MATCHING_INFORMATION'){console.log(d.id,qs.type,qs.questions.map(q=>q.order).join(','));break;}}" | head -3
```

---

## BƯỚC 3 — Kiểm tra Part order đầy đủ (10')

Verify phân phối đúng:

```powershell
node -e "
const fs=require('fs');
const dist={};
for(const f of fs.readdirSync('./data/normalized-listening').filter(x=>x.endsWith('.json')&&!x.startsWith('_'))){
  const d=JSON.parse(fs.readFileSync('./data/normalized-listening/'+f,'utf8'));
  if(d.unavailable)continue;
  for(const p of d.parts||[]){
    const orders=p.questionSets.flatMap(qs=>qs.questions.map(q=>q.order)).filter(n=>n>0);
    if(!orders.length)continue;
    const min=Math.min(...orders),max=Math.max(...orders);
    const key=p.index+':'+min+'-'+max;
    dist[key]=(dist[key]||0)+1;
  }
}
// Group by part index
const byPart={1:[],2:[],3:[],4:[]};
for(const [k,v] of Object.entries(dist)){
  const idx=parseInt(k.split(':')[0]);
  byPart[idx]=byPart[idx]||[];
  byPart[idx].push(k.split(':')[1]+' ('+v+')');
}
for(const [idx,ranges] of Object.entries(byPart)){
  console.log('Part'+idx+' ranges:', ranges.slice(0,5).join(', '));
}
"
```

**Mong đợi:**
- Part 1: toàn bộ `1-X` (X ≤ 13)
- Part 2: toàn bộ `11-20` (hoặc subset như `11-14`, `15-20`)
- Part 3: toàn bộ `21-30` (hoặc subset)
- Part 4: toàn bộ `31-40` (hoặc subset)

---

## BƯỚC 4 — Test NOTE_COMPLETION sample (5')

NOTE_COMPLETION là type đã có nhiều lỗi nhất. Test thêm 3 quiz:

```powershell
# Tìm 3 NOTE_COMPLETION quiz
node -e "
const fs=require('fs');
let count=0;
for(const f of fs.readdirSync('./data/normalized-listening').filter(x=>x.endsWith('.json'))){
  const d=JSON.parse(fs.readFileSync('./data/normalized-listening/'+f,'utf8'));
  if(d.unavailable)continue;
  for(const p of d.parts||[])for(const qs of p.questionSets||[])
    if(qs.type==='NOTE_COMPLETION'&&count<5){
      console.log('id:'+d.id,'options:'+qs.options?.length,'orders:'+qs.questions.map(q=>q.order).join(','));
      count++;
    }
}
"
```

Mở 3 URL: checklist mỗi URL:
- [ ] Không có text + gạch phía trên bảng
- [ ] Header cột đọc được (không chồng chữ)
- [ ] Radio button đầy đủ cho mỗi hàng
- [ ] Số câu hỏi đúng (Part 3 → 21-30)

---

## BƯỚC 5 — Test FILL_BLANK Part 4 đặc biệt (5')

Part 4 shift +30 có nhiều edge case nhất. Kiểm tra 2 dạng:
1. contentHtml đã có global IDs (cần giữ nguyên)
2. contentHtml có local IDs (cần shift)

```powershell
node -e "
const fs=require('fs');
for(const f of fs.readdirSync('./data/normalized-listening').filter(x=>x.endsWith('.json'))){
  const d=JSON.parse(fs.readFileSync('./data/normalized-listening/'+f,'utf8'));
  if(d.unavailable)continue;
  for(const p of d.parts||[])for(const qs of p.questionSets||[])
    if(['FILL_BLANK','GAP_FILLING'].includes(qs.type)&&qs.contentHtml?.includes('gap-placeholder')&&p.index===4){
      const ids=[...qs.contentHtml.matchAll(/gf_(\d+)/g)].map(m=>parseInt(m[1]));
      const orders=qs.questions.map(q=>q.order);
      const match=ids.every(n=>orders.includes(n));
      console.log('id:'+d.id,'match:'+match,'ids:'+ids.slice(0,3).join(','),'orders:'+orders.slice(0,3).join(','));
    }
}" | head -10
```

Mong đợi: `match:true` cho tất cả.

---

## BƯỚC 6 — Test audio 3 quiz ngẫu nhiên (5')

Audio là issue còn chưa xác nhận. Test 3 quiz có audio:

```powershell
# Tìm 3 quiz có audio và type=10 (per-part audio)
node -e "
const fs=require('fs');
let c=0;
for(const f of fs.readdirSync('./data/normalized-listening').filter(x=>x.endsWith('.json'))){
  const d=JSON.parse(fs.readFileSync('./data/normalized-listening/'+f,'utf8'));
  if(d.unavailable||c>=3)continue;
  for(const p of d.parts||[])if(p.audioUrl){
    const fname=p.audioUrl.split('/').pop();
    const exists=fs.existsSync('./data/listening-audio/'+fname);
    console.log('id:'+d.id,'url:'+p.audioUrl,'file_exists:'+exists);
    c++;break;
  }
}"
```

Mở từng URL → click Play → xác nhận overlay xuất hiện → audio chạy.

---

## BƯỚC 7 — Audit cuối (2')

```powershell
node src/audit-listening-data.js
```

Mong đợi:
```
Total: 638
OK: 637
Unavailable: 1
Broken: 0
Questions: 6158
```

---

## SUCCESS CRITERIA

- [ ] Audit script (Bước 1): Issues found: 0
- [ ] 8 smoke test URLs: tất cả render đúng type
- [ ] Part distribution: Part 2 = 11-20, Part 3 = 21-30, Part 4 = 31-40
- [ ] NOTE_COMPLETION: bảng A/B/C, không text+gạch thừa
- [ ] FILL_BLANK Part 4: inputs render đúng vị trí trong text
- [ ] Audio: overlay hiện trước khi play
- [ ] Audit: 637 OK / 1 unavailable / 0 broken

---

## LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

| Triệu chứng | Nguyên nhân | Fix |
|-------------|-------------|-----|
| Input không hiện trong text (chỉ thấy `______`) | gap_id_mismatch | Re-normalize: `node src/normalize-listening.js` |
| Title "Questions 1-5" khi đề Part 3 | qs.title stale | Re-normalize |
| NOTE_COMPLETION hiện text+gạch phía trên bảng | `hideContentHtml` chưa pass | Check QSetRenderer routing |
| Header bảng chồng chữ | whitespace-nowrap + cột quá hẹp | Check TableSelection colgroup |
| Số câu hiển thị 1-10 thay vì 21-30 | part.index không shift | Re-normalize |
| Audio không có overlay (click to play) | audioUrl null | Check normalized file `parts[0].audioUrl` |
