// src/audit-reading-data.js
// Scan data/normalized/*.json and report quizzes with missing question sets/questions.
const fs = require('fs');
const path = require('path');

const NORM_DIR = path.join(__dirname, '../data/normalized');

function audit() {
  const files = fs.readdirSync(NORM_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'));

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

  console.log('========================================');
  console.log(`  Total quizzes: ${files.length}`);
  console.log(`  OK:           ${ok}`);
  console.log(`  Broken:       ${broken.length}`);
  console.log('========================================');

  if (broken.length) {
    console.log('\nFirst 10 broken quizzes:');
    for (const b of broken.slice(0, 10)) {
      console.log(`  ID ${b.id}: ${b.title || b.error}`);
    }

    fs.writeFileSync(
      path.join(__dirname, '../data/broken-reading-ids.json'),
      JSON.stringify(broken.map((b) => b.id), null, 2)
    );
    console.log('\nSaved full list: data/broken-reading-ids.json');
  }
}

audit();
