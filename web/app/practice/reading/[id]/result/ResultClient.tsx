"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Answers } from "@/components/qset/types";
import type { NormalizedQuiz } from "@/lib/data";
import { cleanTitle } from "@/lib/title";
import { getBand } from "@/lib/bandScore";
import { parseSavedAnswers } from "@/lib/answerStorage";
import { computeReviewStats } from "@/lib/reviewScoring";

const STORAGE_KEY = (id: number, skill: "reading" | "listening", fullTestKey?: string) =>
  fullTestKey ? `hin_answers_full_${skill}_${fullTestKey}` : `yp_answers_${id}`;

interface QTypeStat {
  type: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
}

const TYPE_LABELS: Record<string, string> = {
  TRUE_FALSE: "True / False / Not Given",
  YES_NO: "Yes / No / Not Given",
  SUMMARY_COMPLETION: "Summary Completion",
  SENTENCE_COMPLETION: "Sentence Completion",
  GAP_FILLING: "Gap Filling",
  FILL_BLANK: "Fill in the Blank",
  NOTE_COMPLETION: "Note Completion",
  SHORT_ANSWERS: "Short Answer",
  SHORT_ANSWER: "Short Answer",
  MULTIPLE_CHOICE_ONE: "Multiple Choice (1)",
  MULTIPLE_CHOICE_MANY: "Multiple Choice (Many)",
  MULTIPLE_CHOICE: "Multiple Choice",
  SINGLE_SELECTION: "Single Selection",
  SINGLE_CHOICE: "Single Choice",
  MATCHING_INFO: "Matching Information",
  MATCHING_INFORMATION: "Matching Information",
  MATCHING_HEADING: "Matching Headings",
  MATCHING_HEADINGS: "Matching Headings",
  MATCHING_NAMES: "Matching Names",
  MATCHING_FEATURES: "Matching Features",
  MATCHING_ENDINGS: "Matching Endings",
  MATCHING: "Matching",
  TABLE_SELECTION: "Table Selection",
  LABEL_DIAGRAM: "Diagram Labelling",
  MAP_LABELLING: "Map Labelling",
  MAP_DIAGRAM_LABEL: "Map / Diagram Labelling",
  OTHERS: "Others",
};

export default function ResultClient({
  quiz,
  skill = "reading",
  isFullTest = false,
  fullTestKey,
}: {
  quiz: NormalizedQuiz;
  skill?: "reading" | "listening";
  isFullTest?: boolean;
  fullTestKey?: string;
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY(quiz.id, skill, fullTestKey));
    const migrated = parseSavedAnswers(saved);
    if (Object.keys(migrated).length) {
      setAnswers(migrated);
      localStorage.setItem(STORAGE_KEY(quiz.id, skill, fullTestKey), JSON.stringify(migrated));
    }
    setLoaded(true);
  }, [quiz.id, skill, fullTestKey]);

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F1E9]">
        <div className="h-10 w-10 animate-spin border-4 border-[#1a1a1a] border-t-transparent" />
      </div>
    );
  }

  const reviewStats = computeReviewStats(quiz, answers);
  const total = reviewStats.total;
  const correct = reviewStats.correct;
  const wrong = reviewStats.wrong;
  const skipped = reviewStats.skipped;
  const typeStats: Record<string, QTypeStat> = {};

  for (const { slot, answered, isCorrect } of reviewStats.slots) {
    if (!typeStats[slot.type]) {
      typeStats[slot.type] = { type: slot.type, total: 0, correct: 0, wrong: 0, skipped: 0 };
    }
    typeStats[slot.type].total++;

    if (!answered) {
      typeStats[slot.type].skipped++;
    } else if (isCorrect) {
      typeStats[slot.type].correct++;
    } else {
      typeStats[slot.type].wrong++;
    }
  }

  const pct = total > 0 ? correct / total : 0;
  const verdict = pct >= 0.7 ? "Xuất sắc" : pct >= 0.4 ? "Cố lên" : "Luyện thêm";
  const band = getBand(correct, skill);
  const partStats = quiz.parts.map((part, index) => {
    const partSlots = reviewStats.slots.filter((result) => result.slot.partIdx === index);
    const partCorrect = partSlots.filter((result) => result.isCorrect).length;
    const partSkipped = partSlots.filter((result) => !result.answered).length;
    return {
      label: `${skill === "reading" ? "Passage" : "Section"} ${index + 1}`,
      title: part.title || "",
      correct: partCorrect,
      total: partSlots.length,
      skipped: partSkipped,
    };
  });

  return (
    <div className="min-h-screen bg-[#F5F1E9]">
      <HinNav skill={skill} />

      <section className="border-b-2 border-[#1a1a1a] px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/60">
            // Result - {cleanTitle(quiz.title)}
          </div>
          <div className="mb-6 flex flex-col gap-6 md:flex-row md:items-end">
            <h1 className="font-display text-8xl font-black leading-none tracking-tighter md:text-9xl animate-in slide-in-from-left-4 fade-in duration-500">
              <span className={pct >= 0.7 ? "text-[#d9381e]" : ""}>{correct}</span>
              <span className="text-[#1a1a1a]/25">/{total}</span>
            </h1>
            <div className="md:mb-4 animate-in slide-in-from-bottom-4 fade-in duration-700">
              <div className="inline-block border-2 border-[#1a1a1a] bg-[#FFD700] px-4 py-2 font-[family-name:var(--font-mono)] text-sm font-bold uppercase shadow-[3px_3px_0_0_#1a1a1a] transition-transform hover:-translate-y-1">
                {isFullTest ? `Band ${band.toFixed(1)}` : verdict}
              </div>
              <div className="mt-2 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase text-[#1a1a1a]/60">
                {Math.round(pct * 100)}% - {correct} đúng - {wrong} sai - {skipped} bỏ
              </div>
            </div>
          </div>
          <p className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-widest text-[#1a1a1a]/50">
            Kết quả được tính từ câu trả lời lưu trên thiết bị của bạn.
          </p>
        </div>
      </section>

      {isFullTest && (
        <section className="border-b-2 border-[#1a1a1a] px-6 py-10">
          <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-4 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/60">
              // Điểm theo {skill === "reading" ? "passage" : "section"}
            </div>
            <div className="border-2 border-[#1a1a1a] bg-[#FDFCF9] p-5 shadow-neo-sm">
              <div className="space-y-3">
                {partStats.map((row) => (
                  <div key={row.label} className="grid gap-2 border-b border-[#1a1a1a]/20 pb-3 last:border-b-0 last:pb-0 md:grid-cols-[160px_1fr_90px]">
                    <div className="font-[family-name:var(--font-mono)] text-xs font-black uppercase">{row.label}</div>
                    <div className="min-w-0 truncate text-sm font-bold">{row.title || "-"}</div>
                    <div className="font-[family-name:var(--font-mono)] text-sm font-black text-[#d9381e]">{row.correct}/{row.total}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t-2 border-[#1a1a1a] pt-4 font-[family-name:var(--font-mono)] text-sm font-black uppercase">
                Tổng: {correct}/{total} · Band: {band.toFixed(1)}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="border-b-2 border-[#1a1a1a] px-6 py-10">
        <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <div className="mb-4 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/60">
            // Câu hỏi chi tiết
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {reviewStats.slots.map(({ slot, answered, isCorrect }) => (
              <div
                key={`${slot.id}-${slot.slotIdx}`}
                title={`Câu ${slot.order}`}
                className={`flex aspect-square items-center justify-center border-2 border-[#1a1a1a] font-[family-name:var(--font-mono)] text-[12px] font-bold rounded-[4px] shadow-[2px_2px_0_0_#1a1a1a] transition-transform hover:-translate-y-1 ${
                  isCorrect
                    ? "bg-[#FFD700] text-[#1a1a1a]"
                    : answered
                      ? "bg-[#d9381e] text-[#F5F1E9]"
                      : "bg-[#FDFCF9] text-[#1a1a1a]/40"
                }`}
              >
                {slot.order}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-4 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase">
            <Legend color="bg-[#FFD700]" label="Đúng" />
            <Legend color="bg-[#d9381e]" label="Sai" />
            <Legend color="bg-[#FDFCF9]" label="Bỏ qua" />
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#1a1a1a] px-6 py-10">
        <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="mb-4 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/60">
            // Bảng thống kê
          </div>
          <div className="overflow-x-auto border-2 border-[#1a1a1a] bg-[#FDFCF9] shadow-neo-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-[#1a1a1a] font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest bg-[#F5F1E9]">
                  <th className="px-4 py-4 text-left">Type</th>
                  <th className="border-l-2 border-[#1a1a1a] px-4 py-4 text-center">Tổng</th>
                  <th className="border-l-2 border-[#1a1a1a] bg-[#FFD700] px-4 py-4 text-center border-b-2 border-b-[#1a1a1a]">Đúng</th>
                  <th className="border-l-2 border-[#1a1a1a] px-4 py-4 text-center">Sai</th>
                  <th className="border-l-2 border-[#1a1a1a] px-4 py-4 text-center">Bỏ</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(typeStats).map((row) => (
                  <tr key={row.type} className="border-b border-[#1a1a1a]/20 last:border-b-0 hover:bg-[#FFD700]/10 even:bg-[#1a1a1a]/[0.02] transition-colors">
                    <td className="px-4 py-3 font-bold">{TYPE_LABELS[row.type] ?? row.type}</td>
                    <td className="border-l-2 border-[#1a1a1a] px-4 py-3 text-center font-[family-name:var(--font-mono)] font-bold">{row.total}</td>
                    <td className="border-l-2 border-[#1a1a1a] px-4 py-3 text-center font-[family-name:var(--font-mono)] font-bold">{row.correct}</td>
                    <td className="border-l-2 border-[#1a1a1a] px-4 py-3 text-center font-[family-name:var(--font-mono)] font-bold">{row.wrong}</td>
                    <td className="border-l-2 border-[#1a1a1a] px-4 py-3 text-center font-[family-name:var(--font-mono)] font-bold">{row.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-4xl flex-wrap gap-4 px-6 py-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        <Link
          href={isFullTest && fullTestKey ? `/thi-thu/full/${skill}/${fullTestKey}` : `/thi-thu/${skill}/${quiz.id}`}
          className="btn-press shadow-neo-sm flex-1 border-2 border-[#1a1a1a] bg-[#FDFCF9] py-4 text-center font-display text-xl font-black tracking-tight hover:scale-[1.02] transition-transform"
        >
          Làm lại
        </Link>
        <Link
          href={isFullTest ? "/luyen-thi/ielts/full-test" : `/luyen-thi/ielts/${skill}`}
          className="btn-press shadow-neo-sm flex-1 border-2 border-[#1a1a1a] bg-[#1a1a1a] py-4 text-center font-display text-xl font-black tracking-tight text-[#F5F1E9] hover:scale-[1.02] transition-transform"
        >
          Đề khác -&gt;
        </Link>
        <Link
          href={isFullTest && fullTestKey ? `/thi-thu/full/${skill}/${fullTestKey}?type=review` : `/thi-thu/${skill}/${quiz.id}?type=review`}
          className="w-full text-center font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/60 underline-offset-4 hover:text-[#d9381e] hover:underline"
        >
          Xem giải thích theo giao diện cũ
        </Link>
      </div>
    </div>
  );
}

function HinNav({ skill }: { skill: "reading" | "listening" }) {
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-[#1a1a1a] bg-[#F5F1E9]">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/hin-logo.png" alt="HIN" width={32} height={32} className="border border-[#1a1a1a]" />
          <span className="font-[family-name:var(--font-fraunces)] text-lg font-black tracking-tighter">
            HIN <span className="text-[#d9381e]">NAVIGATOR</span>
          </span>
        </Link>
        <div className="flex items-center gap-6 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest">
          <Link href="/luyen-thi/ielts/reading" className={skill === "reading" ? "text-[#d9381e]" : "transition-colors hover:text-[#d9381e]"}>
            Reading
          </Link>
          <Link href="/luyen-thi/ielts/listening" className={skill === "listening" ? "text-[#d9381e]" : "transition-colors hover:text-[#d9381e]"}>
            Listening
          </Link>
          <Link href="/luyen-thi/ielts/full-test" className="transition-colors hover:text-[#d9381e]">
            Full Test
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 border border-[#1a1a1a] ${color}`} />
      {label}
    </span>
  );
}
