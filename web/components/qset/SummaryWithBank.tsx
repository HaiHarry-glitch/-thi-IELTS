"use client";

import type { QuestionSet, Answers, Mode, ReviewRender } from "./types";
import QSetHeader from "./QSetHeader";
import AnswerStatus from "./AnswerStatus";

export default function SummaryWithBank({
  qs,
  answers,
  onAnswer,
  mode,
  reviewRender,
}: {
  qs: QuestionSet;
  answers: Answers;
  onAnswer: (qId: number, val: string) => void;
  mode: Mode;
  reviewRender?: ReviewRender;
}) {
  const opts = qs.options ?? [];
  const isExam = mode === "exam";
  const isReview = mode !== "exam";

  return (
    <div className="anchor-hl-note content-cms" id={`question-set-${qs.id}`}>
      <QSetHeader qs={qs} />

      <div className="my-3 flex flex-wrap gap-2">
        {opts.map((opt) => (
          <span
            key={opt.option}
            className="rounded-[4px] border border-[#1a1a1a] bg-white px-2 py-1 text-sm"
          >
            <span className="mr-1 font-bold">{opt.option}.</span>
            {opt.text}
          </span>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {qs.questions.map((q) => {
          const val = (answers[q.id] as string | undefined) ?? "";
          const parts = (q.text || "").split(/_{2,}/);

          return (
            <div key={q.id} className="anchor-hl-note" id={`question-${q.id}`}>
              <div className="flex items-start gap-2">
                <span className="flex min-w-7 items-center justify-center rounded-[4px] border border-[#418ec8] px-1 font-bold">
                  {q.order}
                </span>
                <div className="flex-1 leading-8">
                  {parts.map((part, i) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
                        <select
                          disabled={!isExam}
                          value={val}
                          onChange={(e) => onAnswer(q.id, e.target.value)}
                          className={`mx-1 min-w-32 rounded border px-2 py-0.5 text-sm ${
                            val ? "border-[#418ec8] bg-[#dde9f5]" : "border-[#418ec8] bg-white"
                          } disabled:opacity-100`}
                        >
                          <option value="">-</option>
                          {opts.map((o) => (
                            <option key={o.option} value={o.option}>
                              {o.option}. {o.text}
                            </option>
                          ))}
                        </select>
                      )}
                    </span>
                  ))}
                </div>
                {isReview && reviewRender && <div className="shrink-0">{reviewRender(q, q.order)}</div>}
              </div>
              {isReview && (
                <AnswerStatus
                  mode={mode}
                  userAnswer={val}
                  correct={q.correctAnswer}
                  explanationHtml={q.explanationHtml}
                  compactMode={Boolean(reviewRender)}
                  questionId={q.id}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
