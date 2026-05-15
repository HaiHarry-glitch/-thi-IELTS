"use client";

import type { QuestionSet, Answers, Mode, ReviewRender } from "./types";
import QSetHeader from "./QSetHeader";
import AnswerStatus from "./AnswerStatus";

// Original markup: <table><thead> headers '', A, B, C, D, E …</thead>
// First column has heavy border-l-2; subsequent have border-l. No # column.
// Question column (first td) contains number pill + text + bookmark.
export default function TableSelection({
  qs,
  answers,
  onAnswer,
  mode,
  hideHeader = false,
  hideContentHtml = false,
  reviewRender,
}: {
  qs: QuestionSet;
  answers: Answers;
  onAnswer: (qId: number, val: string) => void;
  mode: Mode;
  hideHeader?: boolean;
  hideContentHtml?: boolean;
  reviewRender?: ReviewRender;
}) {
  const opts = qs.options ?? [];
  const isReview = mode !== "exam";

  return (
    <div className="anchor-hl-note content-cms" id={`question-set-${qs.id}`}>
      {!hideHeader && <QSetHeader qs={qs} />}
      {!hideContentHtml && qs.contentHtml && (
        <div className="passage-html mb-4" dangerouslySetInnerHTML={{ __html: qs.contentHtml }} />
      )}

      <div className="w-full overflow-x-auto">
        <table className="w-full h-full border-collapse" style={{ tableLayout: "auto", minWidth: `${180 + opts.length * 52}px` }}>
          <colgroup>
            {/* Question column takes remaining space; option columns each fixed narrow */}
            <col style={{ minWidth: "160px" }} />
            {opts.map((opt) => (
              <col key={opt.option} style={{ width: "52px", minWidth: "44px" }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th></th>
              {opts.map((opt, i) => (
                <th
                  key={opt.option}
                  className={`border-black p-2 text-center text-xs align-bottom ${i === 0 ? "border-l-2" : "border-l"}`}
                >
                  {opt.text || opt.option}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {qs.questions.map((q) => {
              const val = (answers[q.id] as string | undefined) ?? "";
              return (
                <tr key={q.id} className="border-black border-t-2">
                  <td className="p-2.5 align-top relative">
                    <div className="flex gap-2">
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
                    </div>
                  </td>
                  {opts.map((opt, i) => {
                    const id = `${q.id}${opt.option}`;
                    const checked = val === opt.option;
                    return (
                      <td
                        key={opt.option}
                        className={`border-black h-full p-0 ${i === 0 ? "border-l-2" : "border-l"} ${
                          checked ? "bg-[#dde9f5]" : ""
                        }`}
                      >
                        <div className="min-h-full flex flex-col">
                          <label
                            htmlFor={id}
                            className="flex gap-2 hover:bg-[#e4e4e4] duration-200 cursor-pointer p-2.5 justify-center items-center min-w-12 h-full flex-1"
                          >
                            <input
                              id={id}
                              className="w-3.5 h-3.5"
                              type="radio"
                              name={String(q.id)}
                              value={opt.option}
                              checked={checked}
                              disabled={isReview}
                              onChange={() => onAnswer(q.id, opt.option)}
                            />
                          </label>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isReview && (
        <div className="mt-4 space-y-2">
          {qs.questions.map((q) => (
            <div key={q.id} className="space-y-1">
              {reviewRender && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-[#1a1a1a] opacity-50 w-6 text-right">{q.order}.</span>
                  {reviewRender(q, q.order)}
                </div>
              )}
              <AnswerStatus
                mode={mode}
                userAnswer={answers[q.id] as string | undefined}
                correct={q.correctAnswer}
                explanationHtml={q.explanationHtml}
                compactMode={Boolean(reviewRender)}
                questionId={q.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
