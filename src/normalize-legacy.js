// src/normalize-legacy.js
// Handle old YouPass API format: part.questions[] (flat) -> question_sets[] (grouped).
// v2: expand multi-gap raw questions into N normalized questions.

const TYPE_MAP = {
  MULTIPLE_CHOICE_ONE: 'SINGLE_CHOICE',
  MULTIPLE_CHOICE_MANY: 'MULTIPLE_CHOICE_MANY',
  TRUE_FALSE: 'SINGLE_SELECTION',
  YES_NO: 'SINGLE_SELECTION',
  MATCHING_HEADING: 'MATCHING_HEADINGS',
  MATCHING_INFO: 'MATCHING_FEATURES',
  MATCHING_NAMES: 'MATCHING_FEATURES',
  FILL_BLANK: 'GAP_FILLING',
  MAP_DIAGRAM_LABEL: 'GAP_FILLING',
  OTHERS: 'GAP_FILLING',
};

const GAP_STYLE_TYPES = new Set(['FILL_BLANK', 'MAP_DIAGRAM_LABEL', 'OTHERS']);

const TFNG = [
  { option: 'TRUE', text: 'TRUE' },
  { option: 'FALSE', text: 'FALSE' },
  { option: 'NOT GIVEN', text: 'NOT GIVEN' },
];

const YNNG = [
  { option: 'YES', text: 'YES' },
  { option: 'NO', text: 'NO' },
  { option: 'NOT GIVEN', text: 'NOT GIVEN' },
];

function extractGapPattern(html) {
  if (!html) return { html: '', pairs: [] };
  const pairs = [];
  const replaced = html.replace(
    /\{\[([^\]]*)\]\[(\d+)\]\}/g,
    (_m, answer, order) => {
      const ord = parseInt(order, 10);
      pairs.push({ order: ord, answer: answer.trim() });
      return `<span class="gap-placeholder" data-question-id="gf_${ord}">${ord}</span>`;
    }
  );
  return { html: replaced, pairs };
}

function groupConsecutiveByType(questions) {
  const groups = [];
  let current = null;
  for (const q of questions) {
    const t = q.question_type || 'OTHERS';
    if (!current || current.type !== t) {
      current = { type: t, items: [q] };
      groups.push(current);
    } else {
      current.items.push(q);
    }
  }
  return groups;
}

function buildOptions(firstQuestion) {
  if (firstQuestion.selection_option && firstQuestion.selection_option.length) {
    return firstQuestion.selection_option.map((o) => ({
      option: o.option,
      text: o.text || o.option,
    }));
  }
  return null;
}

/**
 * Expand a gap-style group (FILL_BLANK / OTHERS / MAP_DIAGRAM_LABEL).
 * Merges gap_fill_in_blank HTML across items, derives one question per unique gap order.
 */
function expandGapGroup(items) {
  const seenHtml = new Set();
  const orderedHtmls = [];
  const orderToOwner = new Map();

  for (const it of items) {
    const html = it.gap_fill_in_blank || '';
    if (!html || seenHtml.has(html)) continue;
    seenHtml.add(html);
    orderedHtmls.push(html);

    const re = /\{\[([^\]]*)\]\[(\d+)\]\}/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const ord = parseInt(m[2], 10);
      if (!orderToOwner.has(ord)) orderToOwner.set(ord, it);
    }
  }

  const mergedHtml = orderedHtmls.join('\n');
  const { html: contentHtml, pairs } = extractGapPattern(mergedHtml);

  const seenOrders = new Set();
  const uniquePairs = pairs
    .filter((p) => {
      if (seenOrders.has(p.order)) return false;
      seenOrders.add(p.order);
      return true;
    })
    .sort((a, b) => a.order - b.order);

  const questions = uniquePairs.map((p) => {
    const owner = orderToOwner.get(p.order) || items[0];
    const answers = p.answer
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      id: owner.id * 1000 + p.order,
      order: p.order,
      type: 'GAP_FILLING',
      text: '',
      content: '',
      options: null,
      correctAnswer: answers[0] || '',
      correctAnswers: answers.length ? answers : null,
      explanationHtml: owner.explain || '',
      locateInfo: owner.locate_info || null,
      matchingHeadingParagraph: null,
      mapPosition: owner.map_position || null,
      audioUrl: null,
      sampleAnswers: null,
    };
  });

  if (!questions.length && items.length) {
    return {
      contentHtml,
      questions: items.map((it) => ({
        id: it.id,
        order: it.order || 1,
        type: 'GAP_FILLING',
        text: '',
        content: '',
        options: null,
        correctAnswer: '',
        correctAnswers: null,
        explanationHtml: it.explain || '',
        locateInfo: it.locate_info || null,
        matchingHeadingParagraph: null,
        mapPosition: it.map_position || null,
        audioUrl: null,
        sampleAnswers: null,
      })),
    };
  }

  return { contentHtml, questions };
}

function normalizeLegacyQuestion(q, order) {
  const base = {
    id: q.id,
    order: q.order || order,
    type: TYPE_MAP[q.question_type] || 'GAP_FILLING',
    text: '',
    content: '',
    options: null,
    correctAnswer: null,
    correctAnswers: null,
    explanationHtml: q.explain || '',
    locateInfo: q.locate_info || null,
    matchingHeadingParagraph: q.matching_heading_paragraph || null,
    mapPosition: q.map_position || null,
    audioUrl: q.audio_url || null,
    sampleAnswers: q.sample_answers || null,
  };

  const ot = q.question_type;

  if (ot === 'MULTIPLE_CHOICE_ONE' && q.single_choice_radio) {
    const opts = q.single_choice_radio;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    base.options = opts.map((o, i) => ({ option: letters[i], text: o.text }));
    const correctIdx = opts.findIndex((o) => o.correct);
    if (correctIdx >= 0) base.correctAnswer = letters[correctIdx];
    base.text =
      (q.gap_fill_in_blank || '').replace(/<[^>]+>/g, '').trim() || q.content || '';
    return base;
  }

  if (ot === 'MULTIPLE_CHOICE_MANY' && q.mutilple_choice) {
    const opts = q.mutilple_choice;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    base.options = opts.map((o, i) => ({ option: letters[i], text: o.text }));
    base.correctAnswers = opts
      .map((o, i) => (o.correct ? letters[i] : null))
      .filter(Boolean);
    base.text = (q.description || '').replace(/<[^>]+>/g, '').trim().slice(0, 200);
    return base;
  }

  if (q.selection && q.selection.length) {
    const sel = q.selection[0];
    base.text = sel.text || '';
    base.correctAnswer = sel.answer || '';
  }

  if (ot === 'MATCHING_HEADING' && q.selection && q.selection[0]) {
    const m = q.selection[0].text.match(/Paragraph\s+([A-Z])/i);
    if (m) base.matchingHeadingParagraph = m[1];
  }

  return base;
}

function buildQuestionSet(group, groupIndex) {
  const firstQ = group.items[0];
  const newType = TYPE_MAP[group.type] || 'GAP_FILLING';

  let options = buildOptions(firstQ);
  if (newType === 'SINGLE_SELECTION' && !options) {
    options = group.type === 'YES_NO' ? YNNG : TFNG;
  }

  let contentHtml = '';
  let questions;

  if (GAP_STYLE_TYPES.has(group.type)) {
    const expanded = expandGapGroup(group.items);
    contentHtml = expanded.contentHtml;
    questions = expanded.questions;
  } else {
    questions = group.items.map((q, i) =>
      normalizeLegacyQuestion(q, q.order || i + 1)
    );
  }

  return {
    id: firstQ.id * 1000 + groupIndex,
    type: newType,
    title: '',
    instructionHtml: firstQ.description || '',
    contentHtml,
    options,
    optionTitle: null,
    allowReuse:
      group.type === 'MATCHING_INFO' ||
      /more than once/i.test(firstQ.description || ''),
    maxSelections: group.type === 'MULTIPLE_CHOICE_MANY' ? 2 : null,
    image: null,
    sort: groupIndex,
    questions,
  };
}

function normalizeLegacyQuestions(flatQuestions, passageHtml) {
  if (!flatQuestions || !flatQuestions.length) {
    return { questionSets: [], passageHtml };
  }

  const groups = groupConsecutiveByType(flatQuestions);
  const questionSets = groups.map((g, i) => buildQuestionSet(g, i));

  return { questionSets, passageHtml };
}

module.exports = { normalizeLegacyQuestions };
