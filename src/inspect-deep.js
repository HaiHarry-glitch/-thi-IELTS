const fs = require('fs-extra');
const path = require('path');

const NORMALIZED_DIR = path.join(__dirname, '../data/normalized');
const REPORT_DIR = path.join(__dirname, '../data/inspection');

async function main() {
  await fs.ensureDir(REPORT_DIR);
  const files = (await fs.readdir(NORMALIZED_DIR))
    .filter(f => f.endsWith('.json') && !f.startsWith('_'));

  // Distribution of qsetType × questionType combinations
  const combos = {};
  const qsetCount = {};
  const qCount = {};
  const passageMarkup = { withCurly: 0, withSquare: 0, withSection: 0, plain: 0, withImg: 0, withTable: 0 };
  const qsetByType = {};        // pick one per qsType for full inspection
  const fieldUsage = {};
  const imageFiles = new Set();

  for (const file of files) {
    const quiz = await fs.readJson(path.join(NORMALIZED_DIR, file));
    for (const part of quiz.parts) {
      const passage = part.passageHtml || '';
      if (passage.includes('{[')) passageMarkup.withCurly++;
      else if (/\[\d+\]/.test(passage)) passageMarkup.withSquare++;
      if (/<p>[A-Z]\.\s/.test(passage) || /^\s*[A-Z]\s*\./m.test(passage)) passageMarkup.withSection++;
      if (passage.includes('<img')) passageMarkup.withImg++;
      if (passage.includes('<table')) passageMarkup.withTable++;
      if (!passage.includes('{[') && !/\[\d+\]/.test(passage)) passageMarkup.plain++;

      for (const qs of part.questionSets) {
        qsetCount[qs.type] = (qsetCount[qs.type] || 0) + 1;
        if (!qsetByType[qs.type]) {
          qsetByType[qs.type] = {
            quizId: quiz.id,
            qsetId: qs.id,
            allFields: {},
            sample: qs,
          };
        }
        for (const k in qs) {
          if (qs[k] !== null && qs[k] !== '' && qs[k] !== undefined &&
              !(Array.isArray(qs[k]) && qs[k].length === 0)) {
            qsetByType[qs.type].allFields[k] = (qsetByType[qs.type].allFields[k] || 0) + 1;
          }
        }
        if (qs.image) imageFiles.add(qs.image);

        for (const q of qs.questions) {
          qCount[q.type] = (qCount[q.type] || 0) + 1;
          const key = `${qs.type} || ${q.type}`;
          combos[key] = (combos[key] || 0) + 1;

          for (const k in q) {
            if (q[k] !== null && q[k] !== '' && q[k] !== undefined &&
                !(Array.isArray(q[k]) && q[k].length === 0)) {
              fieldUsage[k] = (fieldUsage[k] || 0) + 1;
            }
          }
        }
      }
    }
  }

  // Print concise reports
  console.log('=== QSet types (rendering layer) ===');
  Object.entries(qsetCount).sort((a, b) => b[1] - a[1]).forEach(([t, n]) =>
    console.log(`  ${t.padEnd(30)} ${n}`));

  console.log('\n=== Question types (IELTS taxonomy) ===');
  Object.entries(qCount).sort((a, b) => b[1] - a[1]).forEach(([t, n]) =>
    console.log(`  ${t.padEnd(30)} ${n}`));

  console.log('\n=== qsetType × questionType combinations ===');
  Object.entries(combos).sort((a, b) => b[1] - a[1]).forEach(([k, n]) =>
    console.log(`  ${k.padEnd(60)} ${n}`));

  console.log('\n=== Passage markup variety ===');
  Object.entries(passageMarkup).forEach(([k, n]) => console.log(`  ${k}: ${n}`));

  console.log(`\n=== Image references in question_sets: ${imageFiles.size} unique ===`);

  // Save full samples
  await fs.writeJson(path.join(REPORT_DIR, 'qset-types-detailed.json'), qsetByType, { spaces: 2 });
  await fs.writeJson(path.join(REPORT_DIR, 'combos.json'), combos, { spaces: 2 });
  console.log('\nSaved: data/inspection/qset-types-detailed.json (xem chi tiet sample mỗi loại)');
}

main();
