// Audit normalized listening data health.
const fs = require('fs');
const path = require('path');

const NORMALIZED_DIR = path.join(__dirname, '../data/normalized-listening');

let total = 0;
let ok = 0;
let unavailable = 0;
let broken = 0;
let questionSets = 0;
let questions = 0;
const samples = [];

for (const file of fs.readdirSync(NORMALIZED_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
  total++;
  const fullPath = path.join(NORMALIZED_DIR, file);
  const quiz = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

  if (quiz.unavailable) {
    unavailable++;
    continue;
  }

  let qsetCount = 0;
  let qCount = 0;
  let hasAudio = false;

  for (const part of quiz.parts || []) {
    if (part.audioUrl) hasAudio = true;
    for (const qs of part.questionSets || []) {
      qsetCount++;
      qCount += (qs.questions || []).length;
    }
  }

  questionSets += qsetCount;
  questions += qCount;

  if ((quiz.parts || []).length && qsetCount && qCount && hasAudio) {
    ok++;
  } else {
    broken++;
    if (samples.length < 10) {
      samples.push({
        id: quiz.id || file.replace('.json', ''),
        parts: (quiz.parts || []).length,
        questionSets: qsetCount,
        questions: qCount,
        hasAudio,
      });
    }
  }
}

console.log('========================================');
console.log('  Listening audit');
console.log('========================================');
console.log('Total:', total);
console.log('OK:', ok);
console.log('Unavailable:', unavailable);
console.log('Broken:', broken);
console.log('Question sets:', questionSets);
console.log('Questions:', questions);
if (samples.length) {
  console.log('Samples:');
  for (const sample of samples) console.log(' ', sample);
}
