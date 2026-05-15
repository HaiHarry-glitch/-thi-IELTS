"use client";

import type { QuestionSet, Answers, Mode, ReviewRender } from "./types";
import QSetHeader from "./QSetHeader";
import AnswerStatus from "./AnswerStatus";

export default function ShortAnswer({
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
  return (
    <div className="anchor-hl-note content-cms" id={`question-set-${qs.id}`}>
      <QSetHeader qs={qs} />
      {qs.contentHtml && (
        <div
          className="passage-html text-sm mb-4"
          dangerouslySetInnerHTML={{ __html: qs.contentHtml }}
        />
      )}
      <div className="space-y-4">
        {qs.questions.map((q) => {
          const val = (answers[q.id] as string) ?? "";
          const isReview = mode !== "exam";
          return (
            <div key={q.id}>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  id={`question-${q.id}`}
                  className="font-bold border border-[#418ec8] whitespace-nowrap rounded-[4px] min-w-7 px-1 flex items-center justify-center text-sm"
                >
                  {q.order}
                </span>
                {q.text && <span className="text-sm flex-1">{q.text}</span>}
                {isReview && reviewRender
                  ? reviewRender(q, q.order)
                  : (
                    <input
                      type="text"
                      value={val}
                      disabled={isReview}
                      onChange={(e) => onAnswer(q.id, e.target.value)}
                      placeholder="Nhập đáp án..."
                      className="border border-[#555] rounded-[2px] px-2 py-0.5 text-sm min-w-[140px] outline-none"
                    />
                  )}
              </div>
              <AnswerStatus
                mode={mode}
                userAnswer={val}
                correct={q.correctAnswer}
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
