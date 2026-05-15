// Verify raw letter-bank listening groups are preserved in normalized qsets.
const fs = require('fs');
const path = require('path');

const EXAMS_DIR = path.join(__dirname, '../data/listening-exams');
const NORMALIZED_DIR = path.join(__dirname, '../data/normalized-listening');
const TARGET_TYPES = new Set([
  'MAP_DIAGRAM_LABEL',
  'MATCHING_INFO',
  'MATCHING',
  'MATCHING_NAMES',
  'MATCHING_FEATURES',
  'MATCHING_ENDINGS',
]);

function groupConsecutive(questions) {
  const groups = [];
  let current = null;
  for (const q of questions || []) {
    const type = q.question_type || q.type;
    if (!current || current.type !== type) {
      current = { type, items: [q] };
      groups.push(current);
    } else {
      current.items.push(q);
    }
  }
  return groups;
}

let expected = 0;
let actual = 0;
let underCovered = 0;
const byType = {};
const samples = [];

for (const file of fs.readdirSync(EXAMS_DIR).filter((f) => f.endsWith('.json'))) {
  const raw = JSON.parse(fs.readFileSync(path.join(EXAMS_DIR, file), 'utf8'));
  const normPath = path.join(NORMALIZED_DIR, file);
  if (!fs.existsSync(normPath)) continue;
  const norm = JSON.parse(fs.readFileSync(normPath, 'utf8'));
  if (norm.unavailable) continue;

  for (let pi = 0; pi < (raw.parts || []).length; pi++) {
    const rawPart = raw.parts[pi];
    if (rawPart.question_sets && rawPart.question_sets.length) continue;

    const groups = groupConsecutive(rawPart.questions || []);
    const normPart = (norm.parts || [])[pi] || { questionSets: [] };

    groups.forEach((group, gi) => {
      if (!TARGET_TYPES.has(group.type)) return;

      const rawOptions = group.items.find((q) => Array.isArray(q.selection_option) && q.selection_option.length)?.selection_option || [];
      if (!rawOptions.length) return;

      expected++;
      byType[group.type] = byType[group.type] || { expected: 0, ok: 0, broken: 0 };
      byType[group.type].expected++;

      const rawOrders = group.items.map((q) => q.order).filter((order) => order !== undefined);
      const offset = ((normPart.index || pi + 1) - 1) * 10;
      const shiftedOrders = rawOrders.map((order) => order + offset);
      const normQset = (normPart.questionSets || []).find((qs) => {
        if (qs.type !== group.type) return false;
        const normOrders = new Set((qs.questions || []).map((q) => q.order));
        return (
          rawOrders.every((order) => normOrders.has(order)) ||
          shiftedOrders.every((order) => normOrders.has(order))
        );
      }) || normPart.questionSets[gi];

      const optionCount = normQset && Array.isArray(normQset.options) ? normQset.options.length : 0;
      const rawTextByOrder = new Map();
      for (const q of group.items) {
        const text = String((Array.isArray(q.selection) && q.selection[0] && q.selection[0].text) || q.title || q.text || '').trim();
        rawTextByOrder.set(q.order, text);
        rawTextByOrder.set(q.order + offset, text);
      }
      const textOk = Boolean(normQset) && (normQset.questions || []).every((q) => {
        const expectedText = rawTextByOrder.get(q.order);
        return !expectedText || String(q.text || '').trim() === expectedText;
      });
      const answerOk = Boolean(normQset) && (normQset.questions || []).every((q) => q.correctAnswer || (q.correctAnswers || []).length);
      const mapImageOk =
        group.type !== 'MAP_DIAGRAM_LABEL' ||
        Boolean(normQset && (normQset.image || /<img/i.test(normQset.instructionHtml || normQset.contentHtml || '')));
      const ok = optionCount === rawOptions.length && textOk && answerOk && mapImageOk;

      if (ok) {
        actual++;
        byType[group.type].ok++;
      } else {
        underCovered++;
        byType[group.type].broken++;
        if (samples.length < 10) {
          samples.push({
            id: raw.id || file.replace('.json', ''),
            part: pi,
            group: gi,
            type: group.type,
            expectedOptions: rawOptions.length,
            actualOptions: optionCount,
            questions: normQset ? normQset.questions.length : 0,
            missingText: normQset
              ? normQset.questions
                  .filter((q) => {
                    const expectedText = rawTextByOrder.get(q.order);
                    return expectedText && String(q.text || '').trim() !== expectedText;
                  })
                  .map((q) => q.order)
              : [],
            missingAnswer: normQset ? normQset.questions.filter((q) => !q.correctAnswer && !(q.correctAnswers || []).length).map((q) => q.order) : [],
            image: Boolean(normQset && normQset.image),
          });
        }
      }
    });
  }
}

console.log('========================================');
console.log('  Listening letter-bank verify');
console.log('========================================');
console.log('Expected qsets:', expected);
console.log('Actual OK:     ', actual);
console.log('Under-covered: ', underCovered);
console.log('By type:', byType);
if (samples.length) {
  console.log('Samples:');
  for (const sample of samples) console.log(' ', sample);
}
