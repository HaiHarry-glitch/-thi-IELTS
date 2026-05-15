import type { Answers } from "@/components/qset/types";

function isAnswerValue(value: unknown): value is string | string[] {
  return typeof value === "string" || (Array.isArray(value) && value.every((v) => typeof v === "string"));
}

export function migrateSlotKeyedAnswers(raw: unknown): Answers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const next: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isAnswerValue(value)) next[key] = value;
  }

  for (const [key, value] of Object.entries(next)) {
    if (!/^\d+-\d+$/.test(key) || Array.isArray(value)) continue;
    const [qId, slotIdxText] = key.split("-");
    const slotIdx = Number(slotIdxText);
    const current = next[qId];
    const arr = Array.isArray(current) ? [...current] : current ? [current] : [];
    arr[slotIdx] = value;
    next[qId] = arr.filter((v) => typeof v === "string" && v.trim() !== "");
    delete next[key];
  }

  return next as Answers;
}

export function parseSavedAnswers(saved: string | null): Answers {
  if (!saved) return {};
  try {
    return migrateSlotKeyedAnswers(JSON.parse(saved));
  } catch {
    return {};
  }
}
