import type { Answers } from "@/components/qset/types";
import type { NormalizedQuiz } from "@/lib/data";
import { expandAllQuestions, scoreSlot, type VirtualQuestion } from "@/lib/expandQuestions";

export interface ReviewSlotResult {
  slot: VirtualQuestion & { partIdx: number };
  answered: boolean;
  isCorrect: boolean;
  userAnswer: string | undefined;
  correctAnswer: string;
}

export interface ReviewStats {
  slots: ReviewSlotResult[];
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  bySlotKey: Map<string, ReviewSlotResult>;
  byQuestionId: Map<number, ReviewSlotResult[]>;
}

function answerArray(answer: string | string[] | undefined): string[] {
  if (Array.isArray(answer)) return answer.map(String);
  return answer ? [String(answer)] : [];
}

export function computeReviewStats(quiz: NormalizedQuiz, answers: Answers): ReviewStats {
  const slots = expandAllQuestions(quiz.parts).map((slot) => {
    const rawAnswer = answers[slot.id] as string | string[] | undefined;
    const userValues = answerArray(rawAnswer);
    const { answered, isCorrect } = scoreSlot(slot, rawAnswer);
    const userAnswer = slot.isMultiSlot
      ? userValues[slot.slotIdx]
      : userValues.length
      ? userValues.join(", ")
      : undefined;
    const correctAnswer = slot.isMultiSlot
      ? slot.correctAnswers[slot.slotIdx] ?? slot.correctAnswers.join(" / ")
      : slot.correctAnswers.join(" / ");

    return { slot, answered, isCorrect, userAnswer, correctAnswer };
  });

  const bySlotKey = new Map<string, ReviewSlotResult>();
  const byQuestionId = new Map<number, ReviewSlotResult[]>();
  for (const result of slots) {
    bySlotKey.set(`${result.slot.id}-${result.slot.slotIdx}`, result);
    const existing = byQuestionId.get(result.slot.id) ?? [];
    existing.push(result);
    byQuestionId.set(result.slot.id, existing);
  }

  const correct = slots.filter((r) => r.isCorrect).length;
  const skipped = slots.filter((r) => !r.answered).length;
  const wrong = slots.length - correct - skipped;

  return {
    slots,
    total: slots.length,
    correct,
    wrong,
    skipped,
    bySlotKey,
    byQuestionId,
  };
}
