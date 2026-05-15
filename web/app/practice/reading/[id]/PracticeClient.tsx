"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedQuiz } from "@/lib/data";
import type { Answers, Mode } from "@/components/qset/types";
import QSetRenderer from "@/components/qset/QSetRenderer";
import PassageRenderer from "@/components/PassageRenderer";
import { cleanTitle } from "@/lib/title";
import { expandQuestion } from "@/lib/expandQuestions";
import { parseSavedAnswers } from "@/lib/answerStorage";

const STORAGE_KEY = (id: number) => `yp_answers_${id}`;

export default function PracticeClient({
  quiz,
  initialMode,
}: {
  quiz: NormalizedQuiz;
  initialMode: Mode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [answers, setAnswers] = useState<Answers>({});
  const [activePart, setActivePart] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.durationMin * 60);
  const [submitted, setSubmitted] = useState(initialMode !== "exam");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const allSlots = quiz.parts.flatMap((p) =>
    p.questionSets.flatMap((qs) =>
      qs.questions.flatMap((q) => expandQuestion(q, qs.maxSelections))
    )
  );
  const totalQ = allSlots.length;
  const answeredQ = allSlots.filter((slot) => {
    const a = answers[slot.id];
    if (!a) return false;
    if (Array.isArray(a)) return slot.isMultiSlot ? a.length > slot.slotIdx : a.length > 0;
    return a !== "";
  }).length;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY(quiz.id));
    const migrated = parseSavedAnswers(saved);
    if (Object.keys(migrated).length) {
      setAnswers(migrated);
      localStorage.setItem(STORAGE_KEY(quiz.id), JSON.stringify(migrated));
    }
  }, [quiz.id]);

  useEffect(() => {
    if (mode !== "exam" || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          doSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [mode, submitted]);

  function handleAnswer(qId: number, val: string | string[]) {
    setAnswers((prev) => {
      const next = { ...prev, [qId]: val };
      localStorage.setItem(STORAGE_KEY(quiz.id), JSON.stringify(next));
      return next;
    });
  }

  function doSubmit() {
    clearInterval(timerRef.current!);
    setSubmitted(true);
    localStorage.setItem(STORAGE_KEY(quiz.id), JSON.stringify(answers));
    router.push(`/practice/reading/${quiz.id}/result`);
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const timeWarning = timeLeft < 300;

  // All questions for the current part (for number nav)
  const currentPart = quiz.parts[activePart];
  const partSlots = currentPart?.questionSets.flatMap((qs) =>
    qs.questions.flatMap((q) => expandQuestion(q, qs.maxSelections))
  ) ?? [];

  function scrollToQuestion(qId: number) {
    const el = document.getElementById(`q-${qId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Fixed top header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center px-4 h-12">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-4">
            <div className="w-7 h-7 bg-[#1a1a1a] rounded-lg flex items-center justify-center shrink-0">
              <span className="text-[#F5F1E9] text-xs font-bold">H</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-gray-800 leading-tight max-w-xs truncate">
                {cleanTitle(quiz.title)}
              </div>
              {mode === "exam" && (
                <div className="text-xs text-gray-500">
                  {formatTime(timeLeft)} remaining
                </div>
              )}
              {mode === "review" && (
                <div className="text-xs text-yellow-600 font-medium">Xem giải thích</div>
              )}
            </div>
          </div>

          {/* Timer (mobile) */}
          {mode === "exam" && (
            <div className={`sm:hidden font-mono text-sm font-bold px-2 py-0.5 rounded mr-2 ${
              timeWarning ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-700"
            }`}>
              {formatTime(timeLeft)}
            </div>
          )}

          <div className="flex-1" />

          {/* Progress */}
          <span className="text-xs text-gray-500 mr-3">
            {answeredQ}/{totalQ}
          </span>

          {/* Submit button */}
          {mode === "exam" && !submitted && (
            <button
              onClick={doSubmit}
              className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition"
            >
              Nộp bài ✓
            </button>
          )}
          {mode === "review" && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-lg">
              Review mode
            </span>
          )}
        </div>

        {/* Time progress bar */}
        {mode === "exam" && (
          <div className="h-0.5 bg-gray-100">
            <div
              className={`h-full transition-all ${timeWarning ? "bg-red-400" : "bg-orange-400"}`}
              style={{ width: `${(timeLeft / (quiz.durationMin * 60)) * 100}%` }}
            />
          </div>
        )}
      </header>

      {/* Part tabs (below fixed header) */}
      <div className="fixed top-12 left-0 right-0 z-20 bg-white border-b border-gray-100">
        {quiz.parts.length > 1 && (
          <div className="flex px-4">
            {quiz.parts.map((part, idx) => {
              const pSlots = part.questionSets.flatMap((qs) =>
                qs.questions.flatMap((q) => expandQuestion(q, qs.maxSelections))
              );
              const pAnswered = pSlots.filter((slot) => {
                const a = answers[slot.id];
                if (!a) return false;
                if (Array.isArray(a)) return slot.isMultiSlot ? a.length > slot.slotIdx : a.length > 0;
                return a !== "";
              }).length;
              return (
                <button
                  key={part.id}
                  onClick={() => { setActivePart(idx); topRef.current?.scrollIntoView(); }}
                  className={`px-5 py-2.5 text-sm font-medium border-b-2 transition ${
                    activePart === idx
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Part {idx + 1}
                  <span className="ml-1.5 text-[11px] text-gray-400">
                    ({pAnswered}/{pSlots.length})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Question number navigation */}
        {currentPart && (
          <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
            {partSlots.map((slot) => {
              const ans = answers[slot.id];
              const hasAns = Array.isArray(ans)
                ? slot.isMultiSlot ? ans.length > slot.slotIdx : ans.length > 0
                : !!ans && ans !== "";
              return (
                <button
                  key={`${slot.id}-${slot.slotIdx}`}
                  onClick={() => scrollToQuestion(slot.id)}
                  className={`min-w-[28px] h-7 rounded text-xs font-medium transition shrink-0 ${
                    hasAns
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {slot.order}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Spacer for fixed headers */}
      <div
        ref={topRef}
        style={{
          paddingTop:
            quiz.parts.length > 1
              ? "calc(3rem + 2.5rem + 2.75rem)" // header + tabs + question nav
              : "calc(3rem + 2.75rem)",
        }}
      />

      {/* Content: passage + questions stacked */}
      <div className="max-w-4xl mx-auto w-full px-4 pb-16">
        {quiz.parts.map((part, idx) => (
          <div key={part.id} className={idx === activePart ? "" : "hidden"}>
            {/* Part header */}
            <div className="pt-4 pb-3 border-b border-gray-200 mb-4">
              <h2 className="text-sm font-bold text-gray-700">
                Part {idx + 1}
                {part.title && ` — ${part.title}`}
              </h2>
              {(part.instruction as any)?.content && (
                <p
                  className="text-xs text-gray-500 mt-0.5"
                  dangerouslySetInnerHTML={{ __html: (part.instruction as any).content as string }}
                />
              )}
            </div>

            {/* Passage */}
            {part.passageHtml && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
                <PassageRenderer html={part.passageHtml} />
              </div>
            )}

            {/* Question sets */}
            <div className="space-y-6">
              {part.questionSets.map((qs) => (
                <div
                  key={qs.id}
                  id={`qs-${qs.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
                >
                  {/* Anchor for first question in set */}
                  {qs.questions.map((q) => (
                    <div key={q.id} id={`q-${q.id}`} />
                  ))}
                  <QSetRenderer
                    qs={qs as any}
                    answers={answers}
                    onAnswer={handleAnswer}
                    mode={mode}
                  />
                </div>
              ))}
            </div>

            {/* Part navigation */}
            <div className="flex justify-between mt-8">
              {idx > 0 ? (
                <button
                  onClick={() => { setActivePart(idx - 1); topRef.current?.scrollIntoView(); }}
                  className="px-5 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  ← Part {idx}
                </button>
              ) : <span />}
              {idx < quiz.parts.length - 1 ? (
                <button
                  onClick={() => { setActivePart(idx + 1); topRef.current?.scrollIntoView(); }}
                  className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
                >
                  Part {idx + 2} →
                </button>
              ) : mode === "exam" && !submitted ? (
                <button
                  onClick={doSubmit}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600"
                >
                  Nộp bài ✓
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
