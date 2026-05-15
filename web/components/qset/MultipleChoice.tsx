"use client";

import type { QuestionSet, Answers, Mode, ReviewRender } from "./types";
import QSetHeader from "./QSetHeader";
import AnswerStatus from "./AnswerStatus";

export default function MultipleChoice({
  qs,
  answers,
  onAnswer,
  mode,
  reviewRender,
}: {
  qs: QuestionSet;
  answers: Answers;
  onAnswer: (qId: number, val: string | string[]) => void;
  mode: Mode;
  reviewRender?: ReviewRender;
}) {
  const isReview = mode !== "exam";

  return (
    <div className="anchor-hl-note content-cms" id={`question-set-${qs.id}`}>
      <QSetHeader qs={qs} />
      {qs.contentHtml && (
        <div className="passage-html mb-4" dangerouslySetInnerHTML={{ __html: qs.contentHtml }} />
      )}

      <div className="flex flex-col gap-4">
        {qs.questions.map((q) => {
          const opts = q.options ?? qs.options ?? [];
          const correctArr = q.correctAnswers ?? (q.correctAnswer ? [q.correctAnswer] : []);
          const maxSel = Math.max(correctArr.length, qs.maxSelections || correctArr.length || 2, 1);
          const rawVal = answers[q.id];
          const selected: string[] = Array.isArray(rawVal)
            ? rawVal
            : rawVal
            ? [rawVal as string]
            : [];

          function toggle(opt: string) {
            if (isReview) return;
            if (maxSel === 1) {
              onAnswer(q.id, opt);
              return;
            }
            const next = selected.includes(opt)
              ? selected.filter((s) => s !== opt)
              : selected.length < maxSel
              ? [...selected, opt]
              : selected;
            onAnswer(q.id, next);
          }

          return (
            <div key={q.id} className="anchor-hl-note">
              <div className="flex gap-2 mb-2">
                <div
                  id={`question-${q.id}`}
                  className="font-bold border border-[#418ec8] whitespace-nowrap rounded-[4px] min-w-7 px-1 flex items-center justify-center"
                  title={maxSel > 1 ? `Câu ${q.order} và ${q.order + maxSel - 1} — mỗi đáp án đúng = 1 điểm` : undefined}
                >
                  {maxSel > 1 ? `${q.order}-${q.order + maxSel - 1}` : q.order}
                </div>
                <div className="mt-1 flex-1">{q.text}</div>
                {isReview && reviewRender && (
                  <div className="shrink-0">{reviewRender(q, q.order)}</div>
                )}
              </div>
              <ul className="ml-0 flex flex-col gap-0.5 list-none">
                {opts.map((opt, idx) => {
                  const id = `${q.id}mc${idx}`;
                  const isSel = selected.includes(opt.option);
                  return (
                    <li key={opt.option} className="relative">
                      <label
                        htmlFor={id}
                        className={`py-2.5 px-3 flex gap-2 rounded-[2px] duration-200 cursor-pointer ${
                          isSel ? "bg-[#dde9f5]" : "hover:bg-[#e4e4e4]"
                        }`}
                      >
                        <span className="ml-5">{opt.text}</span>
                      </label>
                      <input
                        id={id}
                        className="absolute top-1/2 -translate-y-1/2 left-3 w-3.5 h-3.5 cursor-pointer accent-[#418ec8]"
                        type={maxSel > 1 ? "checkbox" : "radio"}
                        name={String(q.id)}
                        value={opt.option}
                        checked={isSel}
                        disabled={isReview}
                        onChange={() => toggle(opt.option)}
                      />
                    </li>
                  );
                })}
              </ul>
              <AnswerStatus
                mode={mode}
                userAnswer={selected.length ? selected : undefined}
                correct={correctArr.length ? correctArr : null}
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
