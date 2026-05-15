"use client";

import type { QuestionSet, Answers, Mode, ReviewRender } from "./types";
import { getCorrect } from "./types";
import QSetHeader from "./QSetHeader";
import AnswerStatus from "./AnswerStatus";

// SingleSelection covers TRUE/FALSE/NOT_GIVEN, YES/NO/NOT_GIVEN style.
// Visual: same radio-list as SingleChoice (no letter labels).
export default function SingleSelection({
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
  const isReview = mode !== "exam";

  return (
    <div className="anchor-hl-note content-cms" id={`question-set-${qs.id}`}>
      <QSetHeader qs={qs} />
      <div className="flex flex-col gap-4">
        {qs.questions.map((q) => {
          const val = (answers[q.id] as string | undefined) ?? "";
          const correct = getCorrect(q);
          return (
            <div key={q.id} className="anchor-hl-note">
              <div className="flex gap-2 mb-2">
                <div>
                  <div
                    id={`question-${q.id}`}
                    className={`font-bold border whitespace-nowrap rounded-[4px] min-w-7 px-1 flex items-center justify-center ${
                      val ? "border-[#418ec8] shadow-[0_0_0_1px_#418ec8]" : "border-transparent"
                    }`}
                  >
                    {q.order}
                  </div>
                </div>
                <div className="mt-1 flex-1">{q.text}</div>
                {isReview && reviewRender && (
                  <div className="shrink-0">{reviewRender(q, q.order)}</div>
                )}
                <button className="ml-auto h-fit text-gray-300 hover:text-gray-600" title="Đánh dấu">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </div>
              <ul className="ml-0 flex flex-col gap-0.5 list-none">
                {opts.map((opt, idx) => {
                  const id = `${q.id}sel${idx}`;
                  const checked = val === opt.option;
                  const isRight = Array.isArray(correct) ? correct.includes(opt.option) : opt.option === correct;
                  const showCorrect = isReview && isRight;
                  const showWrong = isReview && checked && !isRight;
                  return (
                    <li key={opt.option} className="relative">
                      <label
                        htmlFor={id}
                        className="py-2.5 px-3 flex gap-2 hover:bg-[#e4e4e4] rounded-[2px] duration-200 cursor-pointer"
                      >
                        <span className="ml-5">{opt.text}</span>
                      </label>
                      <input
                        id={id}
                        className="absolute top-1/2 -translate-y-1/2 left-2 cursor-pointer"
                        type="radio"
                        name={String(q.id)}
                        value={opt.option}
                        checked={checked}
                        disabled={isReview}
                        onChange={() => onAnswer(q.id, opt.option)}
                      />
                    </li>
                  );
                })}
              </ul>
              <AnswerStatus
                mode={mode}
                userAnswer={val}
                correct={correct}
                explanationHtml={q.explanationHtml}
                compactMode={Boolean(reviewRender)}
                questionId={q.id}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
