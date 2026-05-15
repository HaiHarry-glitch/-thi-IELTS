// Verify listening edge cases:
// A) MATCHING_INFO with embedded table letter bank.
// B) OTHERS gap containers with answers in {[...][N]} markers.
const fs = require('fs');
const path = require('path');

const EXAMS_DIR = path.join(__dirname, '../data/listening-exams');
const NORM_DIR = path.join(__dirname, '../data/normalized-listening');
const GAP_RE = /\{\[([^\]]*)\]\[(\d+)\]\}/g;

let matchingExpected = 0;
let matchingOk = 0;
let othersExpected = 0;
let othersOk = 0;
const samples = [];

for (const file of fs.readdirSync(EXAMS_DIR).filter((f) => f.endsWith('.json'))) {
  const raw = JSON.parse(fs.readFileSync(path.join(EXAMS_DIR, file), 'utf8'));
  const normPath = path.join(NORM_DIR, file);
  if (!fs.existsSync(normPath)) continue;
  const norm = JSON.parse(fs.readFileSync(normPath, 'utf8'));
  if (norm.unavailable) continue;

  for (let pi = 0; pi < (raw.parts || []).length; pi++) {
    const normPart = (norm.parts || [])[pi] || {};
    const normSets = normPart.questionSets || [];
    const offset = ((normPart.index || raw.parts[pi].passage || pi + 1) - 1) * 10;
    for (const q of (raw.parts[pi].questions || [])) {
      const html = q.gap_fill_in_blank || '';
      const markers = [...html.matchAll(GAP_RE)].map((m) => ({
        answers: m[1].split('|').map((s) => s.trim()).filter(Boolean),
        order: parseInt(m[2], 10),
      }));
      if (!markers.length) continue;

      if (q.question_type === 'MATCHING_INFO' && !q.selection_option && !q.selection) {
        matchingExpected++;
        const qs = normSets.find((set) =>
          set.type === 'MATCHING_INFO' &&
          markers.every((mk) => (set.questions || []).some((nq) => {
            const normalizedAnswers = nq.correctAnswers || (nq.correctAnswer ? [nq.correctAnswer] : []);
            return (nq.order === mk.order || nq.order === mk.order + offset) && mk.answers.every((answer) => normalizedAnswers.includes(answer));
          }))
        );
        const ok = Boolean(qs && Array.isArray(qs.options) && qs.options.length);
        if (ok) matchingOk++;
        else if (samples.length < 10) samples.push({ id: raw.id, type: 'MATCHING_INFO', orders: markers.map((m) => m.order), options: qs && qs.options && qs.options.length });
      }

      if (q.question_type === 'OTHERS') {
        othersExpected += markers.length;
        const normalizedQuestions = normSets.flatMap((set) => set.questions || []);
        const okCount = markers.filter((mk) =>
          normalizedQuestions.some((nq) => {
            const normalizedAnswers = nq.correctAnswers || (nq.correctAnswer ? [nq.correctAnswer] : []);
            return (nq.order === mk.order || nq.order === mk.order + offset) && mk.answers.every((answer) => normalizedAnswers.includes(answer));
          })
        ).length;
        othersOk += okCount;
        if (okCount !== markers.length && samples.length < 10) {
          samples.push({ id: raw.id, type: 'OTHERS', expected: markers.length, actual: okCount, orders: markers.map((m) => m.order) });
        }
      }
    }
  }
}

console.log('========================================');
console.log('  Listening edge-case verify');
console.log('========================================');
console.log('MATCHING table expected:', matchingExpected);
console.log('MATCHING table OK:      ', matchingOk);
console.log('OTHERS gaps expected:   ', othersExpected);
console.log('OTHERS gaps OK:         ', othersOk);
console.log('Under-covered:          ', (matchingExpected - matchingOk) + (othersExpected - othersOk));
if (samples.length) {
  console.log('Samples:');
  for (const sample of samples) console.log(' ', sample);
}
