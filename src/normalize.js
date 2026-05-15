const fs = require('fs-extra');
const path = require('path');
const { normalizeLegacyQuestions } = require('./normalize-legacy');

const EXAMS_DIR = path.join(__dirname, '../data/exams');
const NORMALIZED_DIR = path.join(__dirname, '../data/normalized');
const INDEX_PATH = path.join(__dirname, '../data/index/reading.json');

/**
 * Reconstruct passage text from vocabs tree.
 * Each vocabs[].children[].value is a sentence/segment.
 * Top-level vocabs are paragraphs (level 1, value usually empty).
 *
 * When vocabs are present, embed {[sentence][child_id]} markup so that
 * ReadingPassageReview can render clickable vocab spans.
 */
function reconstructPassage(part) {
  // Prefer vocabs tree when available — gives full {[text][id]} markup coverage
  // for every sentence, enabling click-to-define in review mode.
  if (part.vocabs && part.vocabs.length > 0) {
    const paragraphs = [];
    for (const vocab of part.vocabs) {
      const segments = [];
      if (vocab.children && vocab.children.length) {
        for (const child of vocab.children) {
          if (child.value) segments.push(`{[${child.value}][${child.id}]}`);
          // 3rd-level if any
          if (child.children) {
            for (const grand of child.children) {
              if (grand.value) segments.push(`{[${grand.value}][${grand.id}]}`);
            }
          }
        }
      } else if (vocab.value) {
        segments.push(`{[${vocab.value}][${vocab.id}]}`);
      }
      if (segments.length) paragraphs.push(segments.join(' '));
    }
    if (paragraphs.length) return paragraphs.map(p => `<p>${p}</p>`).join('\n');
  }

  // Fallback: use raw content HTML as-is (may already contain partial markup)
  if (part.content) return part.content;

  return '';
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getVisibleText(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeQuestion(q) {
  return {
    id: q.id,
    order: q.order,
    type: q.question_type,
    text: q.text || '',
    content: q.content || '',
    options: q.options || null,
    correctAnswer: q.correct_answer || null,
    correctAnswers: q.correct_answers || null,
    explanationHtml: q.explain || '',
    locateInfo: q.locate_info || null,
    matchingHeadingParagraph: q.matching_heading_paragraph || null,
    mapPosition: q.map_position || null,
    audioUrl: q.audio_url || null,
    sampleAnswers: q.sample_answers || null,
  };
}

function normalizeQuestionSet(qs) {
  return {
    id: qs.id,
    type: qs.question_type,
    title: qs.title || '',
    instructionHtml: qs.description || '',
    contentHtml: qs.content || '',
    options: qs.options || null,
    optionTitle: qs.option_title || null,
    allowReuse: qs.allow_reuse,
    maxSelections: qs.max_selections,
    image: qs.image || null,
    sort: qs.sort,
    questions: (qs.questions || []).map(normalizeQuestion),
  };
}

function normalizePart(part) {
  let questionSets = [];

  if (part.question_sets && part.question_sets.length > 0) {
    questionSets = part.question_sets.map(normalizeQuestionSet);
  } else if (part.questions && part.questions.length > 0) {
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

function normalizeQuiz(quiz, indexMeta) {
  return {
    id: quiz.id,
    skill: 'reading',
    title: quiz.title,
    type: quiz.type,
    quizType: quiz.quiz_type,
    durationMin: quiz.time,
    thumbnail: quiz.thumbnail,
    thumbnailUrl: `/assets/thumbs/${quiz.id}.jpg`,
    totalSubmitted: quiz.total_submitted || 0,
    voteCount: quiz.vote_count || 0,
    isPublic: quiz.is_public,
    quizCode: quiz.quiz_code || '',
    dateUpdated: quiz.date_updated,
    tags: indexMeta?.tags || [],
    parts: (quiz.parts || []).map(normalizePart),
  };
}

async function main() {
  const idx = await fs.readJson(INDEX_PATH);
  const indexMap = new Map(idx.items.map(it => [it.id, it]));

  await fs.ensureDir(NORMALIZED_DIR);
  const files = await fs.readdir(EXAMS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  console.log(`Normalizing ${jsonFiles.length} quizzes...`);

  const stats = {
    total: jsonFiles.length,
    withPassage: 0,
    emptyPassage: 0,
    questionTypes: {},
    avgQuestions: 0,
    totalQuestions: 0,
    parts1: 0, parts2: 0, parts3: 0, partsOther: 0,
  };

  const summary = [];

  for (const file of jsonFiles) {
    const id = parseInt(file.replace('.json', ''));
    const raw = await fs.readJson(path.join(EXAMS_DIR, file));
    const norm = normalizeQuiz(raw, indexMap.get(id));

    await fs.writeJson(path.join(NORMALIZED_DIR, file), norm, { spaces: 0 });

    // Stats
    const partCount = norm.parts.length;
    if (partCount === 1) stats.parts1++;
    else if (partCount === 2) stats.parts2++;
    else if (partCount === 3) stats.parts3++;
    else stats.partsOther++;

    let qCount = 0;
    let hasContent = false;
    for (const p of norm.parts) {
      if (p.passageHtml && p.passageHtml.length > 100) hasContent = true;
      for (const qs of p.questionSets) {
        for (const q of qs.questions) {
          qCount++;
          stats.questionTypes[q.type] = (stats.questionTypes[q.type] || 0) + 1;
        }
      }
    }
    stats.totalQuestions += qCount;
    if (hasContent) stats.withPassage++; else stats.emptyPassage++;

    summary.push({
      id,
      title: norm.title,
      parts: partCount,
      questions: qCount,
      hasPassage: hasContent,
    });
  }

  stats.avgQuestions = (stats.totalQuestions / stats.total).toFixed(1);

  await fs.writeJson(path.join(NORMALIZED_DIR, '_index.json'), summary, { spaces: 2 });
  await fs.writeJson(path.join(NORMALIZED_DIR, '_stats.json'), stats, { spaces: 2 });

  console.log('\n=== Stats ===');
  console.log(`Total quizzes: ${stats.total}`);
  console.log(`With passage: ${stats.withPassage}`);
  console.log(`Empty passage: ${stats.emptyPassage}`);
  console.log(`Total questions: ${stats.totalQuestions} (avg ${stats.avgQuestions} per quiz)`);
  console.log(`Parts: 1=${stats.parts1}, 2=${stats.parts2}, 3=${stats.parts3}, other=${stats.partsOther}`);
  console.log('\nQuestion types:');
  Object.entries(stats.questionTypes).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => {
    console.log(`  ${t}: ${n}`);
  });
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { normalizeQuiz, reconstructPassage };
