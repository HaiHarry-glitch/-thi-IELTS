// Phase 1: scan all normalized quiz JSON, pick a minimal set of quiz IDs
// covering every distinct question type (qs.type).
const fs = require('fs-extra');
const path = require('path');

const DIR = path.join(__dirname, '../data/normalized');

(async () => {
  const files = (await fs.readdir(DIR)).filter(f => f.endsWith('.json'));
  console.log(`Scanning ${files.length} quiz files...`);

  // type -> [{ quizId, title, count }] (occurrences per quiz)
  const typeOccurrences = {};
  // quizId -> Set of types it has
  const quizTypes = {};
  // quizId -> title
  const quizTitle = {};

  for (const f of files) {
    const q = await fs.readJson(path.join(DIR, f));
    const id = q.id;
    quizTitle[id] = q.title;
    quizTypes[id] = new Set();

    for (const part of q.parts || []) {
      for (const qs of part.questionSets || []) {
        const t = qs.type;
        if (!t) continue;
        quizTypes[id].add(t);
        const count = (qs.questions || []).length;
        if (!typeOccurrences[t]) typeOccurrences[t] = [];
        typeOccurrences[t].push({ quizId: id, count, title: q.title });
      }
    }
  }

  console.log(`\n=== Question type distribution ===`);
  const allTypes = Object.keys(typeOccurrences).sort();
  for (const t of allTypes) {
    const occ = typeOccurrences[t];
    const distinctQuizzes = new Set(occ.map(o => o.quizId)).size;
    const totalQuestions = occ.reduce((a, b) => a + b.count, 0);
    console.log(`  ${t.padEnd(25)} -> ${distinctQuizzes} đề, ${totalQuestions} câu`);
  }

  // Greedy set cover: pick fewest quizzes covering all types
  const uncovered = new Set(allTypes);
  const picked = [];

  while (uncovered.size > 0) {
    let bestId = null;
    let bestCovered = new Set();
    for (const [id, types] of Object.entries(quizTypes)) {
      const intersection = [...types].filter(t => uncovered.has(t));
      if (intersection.length > bestCovered.size) {
        bestCovered = new Set(intersection);
        bestId = Number(id);
      }
    }
    if (!bestId) break;
    picked.push({
      id: bestId,
      title: quizTitle[bestId],
      types: [...bestCovered],
      url: `https://youpass.vn/thi-thu/reading/${bestId}`,
    });
    bestCovered.forEach(t => uncovered.delete(t));
  }

  console.log(`\n=== Minimal sample set (${picked.length} đề phủ ${allTypes.length} dạng) ===`);
  for (const p of picked) {
    console.log(`  [${p.id}] ${p.title.slice(0, 60)}`);
    console.log(`         covers: ${p.types.join(', ')}`);
    console.log(`         ${p.url}`);
  }

  await fs.writeJson(path.join(__dirname, '../data/sample-quizzes.json'), {
    pickedAt: new Date().toISOString(),
    totalQuizzes: files.length,
    typeStats: Object.fromEntries(
      allTypes.map(t => [t, {
        distinctQuizzes: new Set(typeOccurrences[t].map(o => o.quizId)).size,
        totalQuestions: typeOccurrences[t].reduce((a, b) => a + b.count, 0),
      }])
    ),
    picked,
  }, { spaces: 2 });

  console.log(`\nSaved -> data/sample-quizzes.json`);
})();
