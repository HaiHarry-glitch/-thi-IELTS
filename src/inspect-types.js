const fs = require('fs-extra');
const path = require('path');

const NORMALIZED_DIR = path.join(__dirname, '../data/normalized');
const REPORT_DIR = path.join(__dirname, '../data/inspection');

async function main() {
  await fs.ensureDir(REPORT_DIR);
  const files = (await fs.readdir(NORMALIZED_DIR))
    .filter(f => f.endsWith('.json') && !f.startsWith('_'));

  // Find one example quiz per question type
  const samplesByType = {};
  const fieldsByType = {};
  const optionShapesByType = {};

  for (const file of files) {
    const quiz = await fs.readJson(path.join(NORMALIZED_DIR, file));
    for (const part of quiz.parts) {
      for (const qs of part.questionSets) {
        const qsType = qs.type;
        if (!samplesByType[qsType]) {
          samplesByType[qsType] = {
            quizId: quiz.id,
            quizTitle: quiz.title,
            qsetId: qs.id,
            qsetType: qsType,
            qsetInstruction: (qs.instructionHtml || '').slice(0, 300),
            qsetContent: (qs.contentHtml || '').slice(0, 400),
            qsetOptions: qs.options,
            qsetOptionTitle: qs.optionTitle,
            qsetAllowReuse: qs.allowReuse,
            qsetMaxSelections: qs.maxSelections,
            qsetImage: qs.image,
            sampleQuestions: qs.questions.slice(0, 3).map(q => ({
              order: q.order,
              type: q.type,
              text: q.text,
              content: (q.content || '').slice(0, 200),
              options: q.options,
              correctAnswer: q.correctAnswer,
              correctAnswers: q.correctAnswers,
              hasExplanation: !!q.explanationHtml,
              explanationPreview: (q.explanationHtml || '').slice(0, 200),
              locateInfo: q.locateInfo,
              matchingHeadingParagraph: q.matchingHeadingParagraph,
              mapPosition: q.mapPosition,
            })),
          };
        }

        // Track all fields used per type
        if (!fieldsByType[qsType]) fieldsByType[qsType] = new Set();
        for (const q of qs.questions) {
          for (const k of Object.keys(q)) {
            if (q[k] !== null && q[k] !== '' && q[k] !== undefined) {
              fieldsByType[qsType].add(k);
            }
          }
        }

        // Track shape variety of options
        if (!optionShapesByType[qsType]) optionShapesByType[qsType] = new Set();
        const shape = JSON.stringify(qs.options ? Object.keys(qs.options[0] || {}) : []);
        optionShapesByType[qsType].add(shape);
      }
    }
  }

  // Convert sets to arrays
  const fieldsReport = Object.fromEntries(
    Object.entries(fieldsByType).map(([t, s]) => [t, [...s].sort()])
  );
  const shapesReport = Object.fromEntries(
    Object.entries(optionShapesByType).map(([t, s]) => [t, [...s]])
  );

  await fs.writeJson(path.join(REPORT_DIR, 'samples-by-type.json'), samplesByType, { spaces: 2 });
  await fs.writeJson(path.join(REPORT_DIR, 'fields-by-type.json'), fieldsReport, { spaces: 2 });
  await fs.writeJson(path.join(REPORT_DIR, 'option-shapes.json'), shapesReport, { spaces: 2 });

  // Print summary
  console.log('\n=== Question Type Inventory ===\n');
  for (const [type, sample] of Object.entries(samplesByType)) {
    console.log(`\n--- ${type} (sample quiz #${sample.quizId}) ---`);
    console.log('  Instruction:', sample.qsetInstruction.replace(/<[^>]+>/g, '').slice(0, 120));
    console.log('  Content:', sample.qsetContent ? '(has HTML, ' + sample.qsetContent.length + ' chars)' : '(empty)');
    console.log('  Options:', sample.qsetOptions ? `${sample.qsetOptions.length} items, shape: ${JSON.stringify(Object.keys(sample.qsetOptions[0] || {}))}` : 'null');
    console.log('  Allow reuse:', sample.qsetAllowReuse, '| Max selections:', sample.qsetMaxSelections);
    if (sample.qsetImage) console.log('  Image file_id:', sample.qsetImage);
    const q1 = sample.sampleQuestions[0];
    console.log('  Q1 text:', (q1?.text || '').slice(0, 100));
    console.log('  Q1 options:', q1?.options ? `array of ${q1.options.length}` : 'null');
    console.log('  Q1 correct:', JSON.stringify(q1?.correctAnswer || q1?.correctAnswers).slice(0, 100));
    console.log('  Fields used:', fieldsReport[type].join(', '));
  }

  // Compare passage rendering
  console.log('\n\n=== Passage variety (checking 5 samples) ===\n');
  const sampleFiles = files.slice(0, 5);
  for (const f of sampleFiles) {
    const quiz = await fs.readJson(path.join(NORMALIZED_DIR, f));
    const part = quiz.parts[0];
    const passageHtml = part.passageHtml || '';
    console.log(`Quiz ${quiz.id} | ${quiz.title}`);
    console.log(`  Passage HTML length: ${passageHtml.length}`);
    console.log(`  Has <p>: ${passageHtml.includes('<p>')}`);
    console.log(`  Has <strong>: ${passageHtml.includes('<strong>')}`);
    console.log(`  Has [number]: ${/\[\d+\]/.test(passageHtml)}`);
    console.log(`  Has {[ markup: ${passageHtml.includes('{[')}`);
    console.log(`  Preview: ${passageHtml.replace(/<[^>]+>/g, ' ').slice(0, 150).trim()}...`);
  }
}

main();
