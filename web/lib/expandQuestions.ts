// ─── Question expansion for MULTIPLE_CHOICE_MANY ─────────────────────────
// A "Choose TWO letters" question is stored as ONE question with N correct
// answers, but for display + scoring it should behave like N separate questions
// (each correct pick = 1 point, order doesn't matter).
//
// `expandQuestion(q)` returns an array of virtual question slots — each with
// its own `order` (e.g., Q18 → [Q18, Q19]) and the original question id.

export interface VirtualQuestion {
  id: number; // original question id (shared by all slots from same q)
  slotIdx: number; // 0..N-1, position within the multi-answer question
  order: number; // display number (original + slotIdx)
  type: string;
  text: string;
  isMultiSlot: boolean; // true if this came from MULTIPLE_CHOICE_MANY expansion
  correctAnswers: string[]; // the full correct set (shared across slots)
  maxSelections: number; // N
}

interface InputQuestion {
  id: number;
  order: number;
  type: string;
  text?: string;
  correctAnswer?: string | null;
  correctAnswers?: string[] | null;
  // optional, from parent qs:
  maxSelections?: number | null;
}

export function expandQuestion(q: InputQuestion, qsMaxSel?: number | null): VirtualQuestion[] {
  const correctValues = q.correctAnswers && q.correctAnswers.length
    ? q.correctAnswers
    : q.correctAnswer
    ? [q.correctAnswer]
    : [];

  // Only MULTIPLE_CHOICE_MANY produces virtual multi-slots.
  // Other types (MATCHING_HEADINGS, MATCHING_NAMES, NOTE_COMPLETION, …) may
  // report maxSelections > 1 to indicate option-count, but each question is
  // still a single answer slot.
  const isMulti = q.type === "MULTIPLE_CHOICE_MANY";

  if (!isMulti) {
    return [{
      id: q.id,
      slotIdx: 0,
      order: q.order,
      type: q.type,
      text: q.text ?? "",
      isMultiSlot: false,
      correctAnswers: correctValues,
      maxSelections: 1,
    }];
  }

  const N = Math.max(correctValues.length, qsMaxSel ?? correctValues.length, 1);
  const slots: VirtualQuestion[] = [];
  for (let i = 0; i < N; i++) {
    slots.push({
      id: q.id,
      slotIdx: i,
      order: q.order + i,
      type: q.type,
      text: q.text ?? "",
      isMultiSlot: true,
      correctAnswers: correctValues,
      maxSelections: N,
    });
  }
  return slots;
}

// ─── Score one slot ──────────────────────────────────────────────────────
// Status assigned to slot[i]:
//   - skipped: user didn't pick anything
//   - correct: user picked enough correct letters that this slot is "filled" by a correct pick
//   - wrong:   user picked something but not enough correct
export function scoreSlot(
  slot: VirtualQuestion,
  userAnswer: string | string[] | undefined,
): { answered: boolean; isCorrect: boolean } {
  const userArr = Array.isArray(userAnswer)
    ? userAnswer
    : userAnswer
    ? [userAnswer]
    : [];

  const answered = userArr.length > 0 && userArr.some((v) => String(v).trim() !== "");

  if (!slot.isMultiSlot) {
    // Standard single-answer scoring
    if (!answered) return { answered: false, isCorrect: false };
    const correctLower = slot.correctAnswers.map((c) => c.trim().toLowerCase());
    const isCorrect = userArr.some((v) =>
      correctLower.includes(String(v).trim().toLowerCase()),
    );
    return { answered, isCorrect };
  }

  // Multi-slot: count user's correct picks; slot[i] correct iff i < correctPicks
  if (!answered) return { answered: false, isCorrect: false };
  const correctLower = slot.correctAnswers.map((c) => c.trim().toLowerCase());
  const userLower = userArr.map((v) => String(v).trim().toLowerCase());
  const correctPickCount = userLower.filter((v) => correctLower.includes(v)).length;
  return {
    answered: true,
    isCorrect: slot.slotIdx < correctPickCount,
  };
}

// ─── Convenience: expand all questions in a quiz ─────────────────────────
export function expandAllQuestions(
  parts: Array<{
    questionSets: Array<{
      type: string;
      maxSelections?: number | null;
      questions: Array<InputQuestion>;
    }>;
  }>,
): Array<VirtualQuestion & { partIdx: number }> {
  const out: Array<VirtualQuestion & { partIdx: number }> = [];
  parts.forEach((part, partIdx) => {
    for (const qs of part.questionSets) {
      for (const q of qs.questions) {
        for (const slot of expandQuestion(q, qs.maxSelections)) {
          out.push({ ...slot, partIdx });
        }
      }
    }
  });
  return out;
}
