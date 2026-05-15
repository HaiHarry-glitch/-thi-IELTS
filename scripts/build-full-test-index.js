const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const OUT_DIR = path.join(DATA, "full-tests");
const OUT_FILE = path.join(OUT_DIR, "_index.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function parseCambridge(title) {
  const match = String(title || "").match(/^\[C(\d+)T(\d+)\]\s*-\s*(.+)$/i);
  if (!match) return null;
  return {
    cambridge: Number(match[1]),
    test: Number(match[2]),
    itemTitle: match[3].trim(),
  };
}

// Expand MULTIPLE_CHOICE_MANY (and any qs.maxSelections > 1) into N slots.
function slotCount(q, qs) {
  const correctVals = (q.correctAnswers && q.correctAnswers.length)
    ? q.correctAnswers
    : (q.correctAnswer ? [q.correctAnswer] : []);
  const maxSel = qs.maxSelections;
  const isMulti = q.type === "MULTIPLE_CHOICE_MANY" || (maxSel != null && maxSel > 1);
  if (!isMulti) return 1;
  return Math.max(correctVals.length || 0, maxSel || 1, 1);
}

function quizStats(skill, id, fallback) {
  const dir = skill === "listening" ? "normalized-listening" : "normalized";
  const file = path.join(DATA, dir, `${id}.json`);
  if (!fs.existsSync(file)) return { slots: fallback || 0, minOrder: 1 };
  const quiz = readJson(file);
  let slots = 0;
  let minOrder = Infinity;
  for (const part of quiz.parts || []) {
    for (const qs of part.questionSets || []) {
      for (const q of qs.questions || []) {
        slots += slotCount(q, qs);
        if (q.order && q.order < minOrder) minOrder = q.order;
      }
    }
  }
  return {
    slots: slots || fallback || 0,
    minOrder: minOrder === Infinity ? 1 : minOrder,
  };
}

function buildSkill(skill, expectedParts) {
  const dir = skill === "listening" ? "normalized-listening" : "normalized";
  const indexPath = path.join(DATA, dir, "_index.json");
  const index = fs.existsSync(indexPath) ? readJson(indexPath) : [];
  const groups = new Map();

  for (const item of index) {
    const parsed = parseCambridge(item.title);
    if (!parsed) continue;
    const key = `C${parsed.cambridge}T${parsed.test}`;
    const groupKey = `${skill}:${key}`;
    const stats = quizStats(skill, item.id, item.questions);
    const row = {
      id: item.id,
      order: 0,
      title: parsed.itemTitle,
      questions: stats.slots,
      _minOrder: stats.minOrder,
    };
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key,
        cambridge: parsed.cambridge,
        test: parsed.test,
        skill,
        title: `Cambridge ${parsed.cambridge} - Test ${parsed.test} (${skill === "reading" ? "Reading" : "Listening"})`,
        totalQuestions: 0,
        durationMin: skill === "reading" ? 60 : 30,
        items: [],
      });
    }
    groups.get(groupKey).items.push(row);
  }

  const fullTests = [];
  for (const group of groups.values()) {
    // Sort by the MINIMUM original question order so that Passage 1 has Q1-13,
    // Passage 2 has Q14-26, Passage 3 has Q27-40 (matches the real Cambridge book).
    const items = group.items
      .sort((a, b) => a._minOrder - b._minOrder)
      .slice(0, expectedParts)
      .map((item, idx) => ({
        id: item.id,
        order: idx + 1,
        title: item.title,
        questions: item.questions,
      }));
    if (items.length !== expectedParts) continue;
    const totalQuestions = items.reduce((sum, item) => sum + item.questions, 0);
    // Must equal exactly 40 (Cambridge IELTS standard)
    if (totalQuestions !== 40) continue;
    const field = skill === "reading" ? "passages" : "sections";
    fullTests.push({
      key: group.key,
      cambridge: group.cambridge,
      test: group.test,
      skill: group.skill,
      title: group.title,
      [field]: items,
      totalQuestions,
      durationMin: group.durationMin,
    });
  }

  return fullTests;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const all = [
  ...buildSkill("reading", 3),
  ...buildSkill("listening", 4),
].sort((a, b) => a.skill.localeCompare(b.skill) || b.cambridge - a.cambridge || a.test - b.test);

fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
const reading = all.filter((x) => x.skill === "reading").length;
const listening = all.filter((x) => x.skill === "listening").length;
console.log(`Built ${OUT_FILE}`);
console.log(`Reading full tests: ${reading}`);
console.log(`Listening full tests: ${listening}`);
