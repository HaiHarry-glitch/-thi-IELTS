// src/verify-gap-expand.js
// Verify whether gap-style groups have enough normalized questions for all patterns.
const fs = require('fs');
const path = require('path');

const EXAMS = path.join(__dirname, '../data/exams');
const NORM = path.join(__dirname, '../data/normalized');

let expectedTotal = 0;
let actualTotal = 0;
let underCovered = 0;
const samples = [];

for (const f of fs.readdirSync(EXAMS).filter((x) => x.endsWith('.json'))) {
  const id = f.replace('.json', '');
  const raw = JSON.parse(fs.readFileSync(path.join(EXAMS, f), 'utf8'));
  const norm = JSON.parse(fs.readFileSync(path.join(NORM, f), 'utf8'));

  for (let pi = 0; pi < (raw.parts || []).length; pi++) {
    const rawPart = raw.parts[pi];
    if (rawPart.question_sets && rawPart.question_sets.length) continue;

    const groups = [];
    let cur = null;
    for (const q of rawPart.questions || []) {
      const t = q.question_type || 'OTHERS';
      if (!cur || cur.type !== t) {
        cur = { type: t, items: [q] };
        groups.push(cur);
      } else {
        cur.items.push(q);
      }
    }

    const normPart = norm.parts[pi] || { questionSets: [] };

    groups.forEach((g, gi) => {
      if (!['FILL_BLANK', 'OTHERS', 'MAP_DIAGRAM_LABEL'].includes(g.type)) return;

      const seenOrders = new Set();
      for (const it of g.items) {
        const re = /\{\[([^\]]*)\]\[(\d+)\]\}/g;
        let m;
        while ((m = re.exec(it.gap_fill_in_blank || '')) !== null) {
          seenOrders.add(parseInt(m[2], 10));
        }
      }

      const expected = seenOrders.size || g.items.length;
      const normQset = normPart.questionSets[gi];
      const actual = normQset ? normQset.questions.length : 0;

      expectedTotal += expected;
      actualTotal += actual;
      if (actual < expected) {
        underCovered++;
        if (samples.length < 5) {
          samples.push({ id, gi, type: g.type, expected, actual });
        }
      }
    });
  }
}

console.log('========================================');
console.log('  Expected gap questions:', expectedTotal);
console.log('  Actual gap questions:  ', actualTotal);
console.log('  Under-covered groups:  ', underCovered);
console.log('========================================');

if (samples.length) {
  console.log('Samples:');
  samples.forEach((s) => console.log(' ', s));
}
