// Normalize listening exam JSON files (data/listening-exams/*.json)
// into data/normalized-listening/*.json with audio paths resolved.
//
// Listening data shape differs from reading:
//  - Questions are stored FLAT at part level (part.questions[]) rather than
//    nested under part.question_sets[].
//  - Each question carries its own options under a type-specific field name
//    (single_choice_radio, mutilple_choice, gap_fill_in_blank, selection, etc.).
//  - Audio is one UUID per quiz at quiz.listening (not per part).
const fs = require('fs-extra');
const path = require('path');

const EXAMS_DIR = path.join(__dirname, '../data/listening-exams');
const NORMALIZED_DIR = path.join(__dirname, '../data/normalized-listening');
const INDEX_PATH = path.join(__dirname, '../data/index/listening.json');
const AUDIO_DIR = path.join(__dirname, '../data/listening-audio');

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function reconstructTranscript(part) {
  if (part.transcription && part.transcription.length > 50) return part.transcription;
  if (part.content && part.content.length > 50) return part.content;
  if (!part.vocabs || part.vocabs.length === 0) return '';
  const paragraphs = [];
  for (const vocab of part.vocabs) {
    const sentences = [];
    if (vocab.children && vocab.children.length) {
      for (const child of vocab.children) {
        if (child.value) sentences.push(child.value);
        if (child.children) for (const grand of child.children) if (grand.value) sentences.push(grand.value);
      }
    } else if (vocab.value) sentences.push(vocab.value);
    if (sentences.length) paragraphs.push(sentences.join(' '));
  }
  return paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('\n');
}

function reconstructTranscriptSegments(part) {
  if (!part.vocabs || part.vocabs.length === 0) return null;
  const segments = [];
  let paraIdx = 0;

  for (const vocab of part.vocabs) {
    const sentences = [];
    const children = vocab.children && vocab.children.length ? vocab.children : [vocab];

    for (const child of children) {
      const grandchildren = child.children && child.children.length ? child.children : [child];
      for (const sentence of grandchildren) {
        if (!sentence.value) continue;
        const speakerMatch = sentence.value.match(/^\s*([A-Z][A-Za-z .'-]{1,38}):\s*(.+)$/);
        const speakerFromText = speakerMatch ? speakerMatch[1].trim() : null;
        const text = speakerMatch ? speakerMatch[2].trim() : sentence.value;
        sentences.push({
          id: sentence.id,
          text,
          from: Number.isFinite(sentence.meta && sentence.meta.from) ? sentence.meta.from : null,
          to: Number.isFinite(sentence.meta && sentence.meta.to) ? sentence.meta.to : null,
          speaker: speakerFromText || (sentence.meta && sentence.meta.speaker ? sentence.meta.speaker : null),
        });
      }
    }

    if (sentences.length) {
      segments.push({ paragraph: paraIdx++, sentences });
    }
  }

  return segments.length ? segments : null;
}

// Pick the options array from whichever per-type field is populated.
function extractOptions(q) {
  const candidates = [
    q.single_choice_radio,    // SINGLE_CHOICE / MULTIPLE_CHOICE_ONE
    q.mutilple_choice,        // MULTIPLE_CHOICE_MANY (sic â€” original misspelling)
    q.options,                // generic
    q.selection,              // SINGLE_SELECTION
    q.selection_option,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length) return c;
  }
  return null;
}

function letter(i) {
  return String.fromCharCode("A".charCodeAt(0) + i);
}

function normalizeOptions(rawOpts) {
  if (!rawOpts) return null;
  return rawOpts.map((o, i) => {
    // Reading: { text, option } | Listening: { text, correct }
    if (o.option !== undefined) return { text: o.text || o.option, option: o.option };
    return { text: o.text, option: letter(i) };
  });
}

function findCorrectFromOptions(rawOpts) {
  if (!rawOpts) return null;
  const correctIdxs = rawOpts.map((o, i) => (o.correct ? letter(i) : null)).filter(Boolean);
  if (correctIdxs.length === 0) return null;
  if (correctIdxs.length === 1) return { single: correctIdxs[0], multi: null };
  return { single: null, multi: correctIdxs };
}

function normalizeQuestionFlat(q) {
  const rawOpts = extractOptions(q);
  const correctFromOpts = findCorrectFromOptions(rawOpts);

  // Reading-style fallbacks
  let correctAnswer = q.correct_answer || (correctFromOpts && correctFromOpts.single) || null;
  let correctAnswers = q.correct_answers || (correctFromOpts && correctFromOpts.multi) || null;

  // For SHORT_ANSWER / GAP_FILLING, options may not exist; correct answer is text
  if (!correctAnswer && !correctAnswers && q.gap_fill_in_blank) {
    // gap_fill_in_blank is usually an array of accepted answers
    if (Array.isArray(q.gap_fill_in_blank)) {
      correctAnswers = q.gap_fill_in_blank.map(g => (typeof g === 'string' ? g : g.text || g.value)).filter(Boolean);
    }
  }

  return {
    id: q.id,
    order: q.order,
    type: q.question_type || q.type,
    text: q.title || q.text || '',
    content: q.content || '',
    options: normalizeOptions(rawOpts),
    correctAnswer,
    correctAnswers,
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
    questions: (qs.questions || []).map(normalizeQuestionFlat),
  };
}

// Parse a single {[answer1|answer2][N]} marker, returning { texts: [...], order: N }
// Or expand a question whose gap_fill_in_blank contains multiple such markers.
const GAP_RE = /\{\[([^\]]*)\]\[(\d+)\]\}/g;
const LETTER_BANK_TYPES = new Set([
  'MAP_DIAGRAM_LABEL',
  'MATCHING_INFO',
  'MATCHING',
  'MATCHING_NAMES',
  'MATCHING_FEATURES',
  'MATCHING_ENDINGS',
]);

function extractImageSrc(html) {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

function stripGapPatterns(html) {
  if (!html) return '';
  return html.replace(GAP_RE, '').trim();
}

function parseEmbeddedLetterBank(html) {
  if (!html) return null;
  const firstGap = html.search(GAP_RE);
  const bankHtml = firstGap >= 0 ? html.slice(0, firstGap) : html;
  const options = [];
  const seen = new Set();
  const re = /<strong[^>]*>\s*([A-Z])\s*(?:&nbsp;)?\s*<\/strong>([\s\S]*?)(?=<strong[^>]*>\s*[A-Z]\s*(?:&nbsp;)?\s*<\/strong>|<\/td>|<\/p>|<\/li>|$)/gi;
  let m;
  while ((m = re.exec(bankHtml)) !== null) {
    const option = m[1].trim();
    if (seen.has(option)) continue;
    const text = stripHtml(m[2] || '');
    if (!text) continue;
    seen.add(option);
    options.push({ option, text });
  }
  return options.length ? options : null;
}

function textForGapOrder(html, order) {
  if (!html) return '';
  const markerRe = new RegExp(`\\{\\[[^\\]]*\\]\\[${order}\\]\\}`);
  const idx = html.search(markerRe);
  if (idx < 0) return '';

  const before = html.slice(0, idx);
  const after = html.slice(idx);
  const startCandidates = ['<li', '<td', '<p', '<div'];
  const starts = startCandidates.map((tag) => before.toLowerCase().lastIndexOf(tag)).filter((pos) => pos >= 0);
  const start = starts.length ? Math.max(...starts) : Math.max(0, before.lastIndexOf('\n'));
  const endMatch = after.search(/<\/(li|td|p|div)>/i);
  const end = endMatch >= 0 ? idx + endMatch : Math.min(html.length, idx + 240);
  return stripHtml(html.slice(start, end).replace(markerRe, '_____'));
}

function normalizeSelectionQuestion(q) {
  const sel = Array.isArray(q.selection) && q.selection.length ? q.selection[0] : null;
  return {
    id: q.id,
    order: q.order,
    type: q.question_type || q.type,
    text: (sel && sel.text) || q.title || q.text || '',
    content: q.content || '',
    options: null,
    correctAnswer: (sel && sel.answer) || q.correct_answer || null,
    correctAnswers: q.correct_answers || null,
    explanationHtml: q.explain || '',
    locateInfo: q.locate_info || null,
    matchingHeadingParagraph: q.matching_heading_paragraph || null,
    mapPosition: q.map_position || null,
    audioUrl: q.audio_url || null,
    sampleAnswers: q.sample_answers || null,
  };
}

// Expand a "container" question (whose gap_fill_in_blank holds multiple {[a|b][N]} markers)
// into one normalized question per marker. The original question's text becomes the
// instruction (kept on the synthesized question_set), and contentHtml is the rendered
// HTML where each marker becomes a <span class="gap-placeholder" data-question-id="gf_N">______</span>.
function expandGapContainer(rawQ, baseId) {
  const html = rawQ.gap_fill_in_blank || rawQ.content || '';
  if (!html) return null;
  const markers = [];
  let m;
  GAP_RE.lastIndex = 0;
  while ((m = GAP_RE.exec(html)) !== null) {
    const parts = m[1].split('|').map(s => s.trim()).filter(Boolean);
    const n = parseInt(m[2], 10);
    markers.push({ order: n, answers: parts });
  }
  if (markers.length === 0) return null;
  const renderedHtml = html.replace(GAP_RE, (_m, _opts, n) => `<span class="gap-placeholder" data-question-id="gf_${n}">______</span>`);
  // Build child questions
  const children = markers.map((mk, i) => ({
    id: baseId * 100 + mk.order, // synthetic stable id
    order: mk.order,
    type: rawQ.question_type || 'FILL_BLANK',
    text: textForGapOrder(html, mk.order),
    content: '',
    options: null,
    correctAnswer: mk.answers.length === 1 ? mk.answers[0] : null,
    correctAnswers: mk.answers.length > 1 ? mk.answers : null,
    explanationHtml: rawQ.explain || '',
    locateInfo: rawQ.locate_info || null,
    matchingHeadingParagraph: null,
    mapPosition: null,
    audioUrl: null,
    sampleAnswers: null,
  }));
  return {
    instructionHtml: rawQ.title || rawQ.description || '',
    contentHtml: renderedHtml,
    options: parseEmbeddedLetterBank(html),
    questions: children,
  };
}

// Group consecutive flat questions of the same type into synthetic question sets.
function groupFlatQuestions(rawQuestions) {
  if (!rawQuestions || !rawQuestions.length) return [];
  const sorted = [...rawQuestions].sort((a, b) => (a.order || 0) - (b.order || 0));
  const groups = [];
  let current = null;
  for (const q of sorted) {
    const t = q.question_type || q.type;

    // If this is a "container" question with embedded {[a|b][N]} markers, expand it
    if (
      (t === 'FILL_BLANK' ||
        t === 'FILL-IN-THE-BLANK' ||
        t === 'NOTE_COMPLETION' ||
        t === 'GAP_FILLING' ||
        t === 'OTHERS' ||
        (t === 'MATCHING_INFO' && !(Array.isArray(q.selection) && q.selection.length)) ||
        (t === 'MAP_DIAGRAM_LABEL' && !(Array.isArray(q.selection) && q.selection.length))) &&
      q.gap_fill_in_blank
    ) {
      const expanded = expandGapContainer(q, q.id);
      if (expanded && expanded.questions.length) {
        groups.push({
          id: q.id,
          type: t,
          title: '',
          instructionHtml: expanded.instructionHtml,
          contentHtml: expanded.contentHtml,
          options: expanded.options, optionTitle: null,
          allowReuse: false, maxSelections: expanded.options ? 1 : 0, image: extractImageSrc(expanded.contentHtml),
          sort: groups.length + 1,
          questions: expanded.questions,
        });
        current = null;
        continue;
      }
    }

    if (!current || current._type !== t) {
      const qsetOptions = normalizeOptions(q.selection_option);
      current = {
        _type: t,
        id: -1 - groups.length,
        type: t,
        title: '',
        instructionHtml: q.description || '',
        contentHtml: stripGapPatterns(q.gap_fill_in_blank) || q.content || '',
        options: qsetOptions,
        optionTitle: null,
        allowReuse: /more than once/i.test(q.description || ''),
        maxSelections: qsetOptions ? 1 : 0,
        image: extractImageSrc(q.gap_fill_in_blank) || extractImageSrc(q.description) || null,
        sort: groups.length + 1,
        questions: [],
      };
      groups.push(current);
    }

    if (!current.options && q.selection_option) current.options = normalizeOptions(q.selection_option);
    if (!current.image) current.image = extractImageSrc(q.gap_fill_in_blank) || extractImageSrc(q.description) || null;
    if (!current.contentHtml && q.gap_fill_in_blank) current.contentHtml = stripGapPatterns(q.gap_fill_in_blank);

    const isLetterBank = LETTER_BANK_TYPES.has(t) && Array.isArray(q.selection) && q.selection.length;
    current.questions.push(isLetterBank ? normalizeSelectionQuestion(q) : normalizeQuestionFlat(q));
  }
  // Synthesize titles like "Questions 1-6"
  for (const g of groups) {
    if (g.questions.length) {
      const orders = g.questions.map(q => q.order).filter(o => o > 0);
      if (orders.length) {
        const lo = Math.min(...orders), hi = Math.max(...orders);
        g.title = lo === hi ? `Question ${lo}` : `Questions ${lo}-${hi}`;
      }
    }
    delete g._type;
  }
  return groups;
}

function stripHtml(s) {
  if (!s) return '';
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePart(part, quizId, partIdx, quizAudioId) {
  // type=2 (legacy): single audio per quiz at /listening-audio/{id}.mp3
  // type=10 (modern): audio per part at /listening-audio/{id}-{partIdx}.mp3
  const audioPath = quizAudioId
    ? `/api/listening-audio/${quizId}.mp3`
    : (part.file_id ? `/api/listening-audio/${quizId}-${partIdx}.mp3` : null);
  // Prefer existing question_sets if present, else group flat questions
  let questionSets = (part.question_sets || []).map(normalizeQuestionSet);
  if (!questionSets.length && Array.isArray(part.questions) && part.questions.length) {
    questionSets = groupFlatQuestions(part.questions);
  }
  const computedIndex = part.passage || part.sort || partIdx + 1;
  // Shift question order to global (Part 2 -> 11-20, Part 3 -> 21-30, Part 4 -> 31-40)
  // when source numbering is local. Some legacy standalone sections contain 11-13
  // local slots, so allow a small overflow instead of leaving Part 2/3 at 1-x.
  const allOrders = questionSets.flatMap(qs => qs.questions.map(q => q.order || 0)).filter(n => n > 0);
  if (allOrders.length && computedIndex > 1) {
    const minOrder = Math.min(...allOrders);
    const maxOrder = Math.max(...allOrders);
    if (minOrder === 1 && maxOrder <= 13) {
      const offset = (computedIndex - 1) * 10;
      for (const qs of questionSets) {
        const originalOrders = qs.questions.map(q => q.order || 0).filter(n => n > 0);
        const originalOrderSet = new Set(originalOrders);
        // Shift question orders
        for (const q of qs.questions) {
          if (q.order > 0) q.order += offset;
        }
        // Also shift gap-placeholder IDs in contentHtml so GapFilling can match them.
        // Only shift if IDs match the original local question orders.
        // Some raw sources already embed global IDs, e.g. gf_11 for Part 2 while
        // question orders are still local 1-5, so skip those.
        if (qs.contentHtml && qs.contentHtml.includes('gap-placeholder')) {
          const gapNums = [...qs.contentHtml.matchAll(/data-question-id="(?:gf|note_comp)_(\d+)"/g)]
            .map(m => parseInt(m[1], 10));
          const gapIdsAreLocal = gapNums.length > 0 && gapNums.every(n => originalOrderSet.has(n));
          if (gapIdsAreLocal) {
            qs.contentHtml = qs.contentHtml.replace(
              /data-question-id="(?:gf|note_comp)_(\d+)"/g,
              (_m, n) => `data-question-id="gf_${parseInt(n, 10) + offset}"`
            );
          }
        }
      }
    }
  }
  // Regenerate qs.title from actual question orders (overrides stale raw titles like "Questions 1-5"
  // when orders have been shifted to global numbering). Only rewrite if title matches the
  // "Questions N-M" / "Question N" pattern â€” leave custom titles alone.
  for (const qs of questionSets) {
    const orders = qs.questions.map(q => q.order || 0).filter(n => n > 0);
    if (!orders.length) continue;
    const lo = Math.min(...orders);
    const hi = Math.max(...orders);
    const fresh = lo === hi ? `Question ${lo}` : `Questions ${lo}-${hi}`;
    const stale = (qs.title || '').trim();
    if (!stale || /^Questions?\s+\d+\s*[-â€“]?\s*\d*$/i.test(stale)) {
      qs.title = fresh;
    }
  }
  return {
    id: part.id,
    index: computedIndex,
    title: stripHtml(part.title || ''),
    transcriptHtml: reconstructTranscript(part),
    transcriptSegments: reconstructTranscriptSegments(part),
    fileId: part.file_id || null,
    audioUrl: audioPath,
    listenFrom: part.listen_from || null,
    listenTo: part.listen_to || null,
    instruction: part.instruction || null,
    taskInstruction: part.task_instruction || null,
    questionSets,
    explanations: part.explanations || [],
  };
}

function normalizeQuiz(quiz, indexMeta) {
  const unavailable = !Array.isArray(quiz.parts) || quiz.parts.length === 0;
  return {
    id: quiz.id,
    skill: 'listening',
    title: stripHtml(quiz.title),
    type: quiz.type,
    quizType: quiz.quiz_type,
    durationMin: quiz.time,
    thumbnail: quiz.thumbnail,
    thumbnailUrl: `/assets/thumbs-listening/${quiz.id}.jpg`,
    totalSubmitted: quiz.total_submitted || 0,
    voteCount: quiz.vote_count || 0,
    isPublic: quiz.is_public,
    quizCode: quiz.quiz_code || '',
    dateUpdated: quiz.date_updated,
    ...(unavailable
      ? {
          unavailable: true,
          unavailableReason: 'Source returned empty parts on normalize',
          unavailableMarkedAt: new Date().toISOString().slice(0, 10),
        }
      : {}),
    tags: indexMeta?.tags || [],
    parts: (quiz.parts || []).map((p, i) => normalizePart(p, quiz.id, i, quiz.listening)),
  };
}

async function main() {
  const idx = await fs.readJson(INDEX_PATH);
  const indexMap = new Map(idx.items.map(it => [it.id, it]));

  await fs.ensureDir(NORMALIZED_DIR);
  const files = (await fs.readdir(EXAMS_DIR)).filter(f => f.endsWith('.json'));
  console.log(`Normalizing ${files.length} listening quizzes...`);

  const stats = { total: files.length, withTranscript: 0, withAudio: 0, withQuestions: 0, questionTypes: {}, totalQuestions: 0 };
  const summary = [];

  for (const file of files) {
    const id = parseInt(file.replace('.json', ''));
    const raw = await fs.readJson(path.join(EXAMS_DIR, file));
    const norm = normalizeQuiz(raw, indexMap.get(id));
    await fs.writeJson(path.join(NORMALIZED_DIR, file), norm, { spaces: 0 });

    let qCount = 0, hasTranscript = false, hasAudio = false;
    for (const p of norm.parts) {
      if (p.transcriptHtml && p.transcriptHtml.length > 50) hasTranscript = true;
      if (p.audioUrl) {
        // The audioUrl path embeds the local filename (foo.mp3 or foo-0.mp3)
        const fname = p.audioUrl.split('/').pop();
        if (fname && await fs.pathExists(path.join(AUDIO_DIR, fname))) hasAudio = true;
      }
      for (const qs of p.questionSets) {
        for (const q of qs.questions) {
          qCount++;
          stats.questionTypes[q.type] = (stats.questionTypes[q.type] || 0) + 1;
        }
      }
    }
    stats.totalQuestions += qCount;
    if (hasTranscript) stats.withTranscript++;
    if (hasAudio) stats.withAudio++;
    if (qCount > 0) stats.withQuestions++;
    summary.push({ id, title: norm.title, parts: norm.parts.length, questions: qCount, hasTranscript, hasAudio });
  }

  await fs.writeJson(path.join(NORMALIZED_DIR, '_index.json'), summary, { spaces: 2 });
  await fs.writeJson(path.join(NORMALIZED_DIR, '_stats.json'), stats, { spaces: 2 });
  console.log(`\nDone. ${stats.total} quizzes, ${stats.withTranscript} transcript, ${stats.withAudio} audio, ${stats.withQuestions} with questions, ${stats.totalQuestions} total Q.`);
  console.log('Question types:', stats.questionTypes);
}

if (require.main === module) {
  main().catch(e => { console.error('Loi:', e); process.exit(1); });
}
