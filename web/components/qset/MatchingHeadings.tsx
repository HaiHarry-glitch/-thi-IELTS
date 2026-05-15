"use client";

import { useState } from "react";
import type { QuestionSet, Answers, Mode, ReviewRender } from "./types";
import QSetHeader from "./QSetHeader";
import AnswerStatus from "./AnswerStatus";

export default function MatchingHeadings({
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
  const [dragOver, setDragOver] = useState<number | null>(null);
  const isExam = mode === "exam";

  // Track which option codes are currently used (for visual dimming)
  const usedCodes = new Set<string>();
  for (const q of qs.questions) {
    const v = answers[q.id];
    if (typeof v === "string" && v) usedCodes.add(v);
  }

  function onDragStart(e: React.DragEvent<HTMLDivElement>, code: string) {
    if (!isExam) return;
    e.dataTransfer.setData("text/plain", code);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>, qId: number) {
    if (!isExam) return;
    e.preventDefault();
    const code = e.dataTransfer.getData("text/plain");
    if (code) onAnswer(qId, code);
    setDragOver(null);
  }

  return (
    <div>
      <QSetHeader qs={qs} />
      {qs.contentHtml && (
        <div
          className="passage-html text-sm mb-4"
          dangerouslySetInnerHTML={{ __html: qs.contentHtml }}
        />
      )}

      {/* List of Headings — draggable boxes */}
      <div className="mb-4">
        <div className="font-semibold text-sm mb-2">
          {qs.optionTitle || "List of Headings"}
        </div>
        <div className="flex flex-col gap-1 items-start">
          {opts.map((opt) => {
            const used = usedCodes.has(opt.option) && !qs.allowReuse;
            return (
              <div
                key={opt.option}
                draggable={isExam && !used}
                onDragStart={(e) => onDragStart(e, opt.option)}
                className={`option-drag bg-white border border-[#c5c5c5] hover:border-[#000] rounded-[4px] py-1 px-2 text-sm select-none ${
                  isExam && !used ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                } ${used ? "opacity-30" : ""}`}
              >
                {opt.text}
              </div>
            );
          })}
        </div>
      </div>

      {/* Question rows: paragraph label + drop zone */}
      <div className="space-y-3">
        {qs.questions.map((q) => {
          const val = answers[q.id] as string | undefined;
          const correct = q.correctAnswer;
          const isOver = dragOver === q.id;
          const opt = opts.find((o) => o.option === val);

          return (
            <div key={q.id}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-bold text-blue-700 min-w-[2rem]">{q.order}.</span>
                <span className="text-sm text-gray-800">
                  {q.matchingHeadingParagraph || q.text}
                </span>
                {!isExam && reviewRender ? (
                  <div className="ml-auto">{reviewRender(q, q.order)}</div>
                ) : (
                <div
                  onDragOver={(e) => { if (isExam) { e.preventDefault(); setDragOver(q.id); } }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => onDrop(e, q.id)}
                  className={`fill_placeholder ml-auto min-w-[200px] flex items-center justify-center rounded-[4px] border border-dashed h-9 px-2 text-sm transition ${
                    isOver
                      ? "border-[#000] bg-gray-100"
                      : val
                      ? "border-[#418ec8]"
                      : "border-[#aaa]"
                  }`}
                >
                  {val ? (
                    <span className="flex items-center gap-2">
                      <span className="font-bold">{val}</span>
                      <span className="text-gray-700">{opt?.text ?? ""}</span>
                      {isExam && (
                        <button
                          onClick={() => onAnswer(q.id, "")}
                          className="ml-1 text-gray-400 hover:text-red-500 text-xs"
                          title="Bỏ chọn"
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Kéo heading vào đây</span>
                  )}
                </div>
                )}
              </div>
              <div className="pl-8">
                <AnswerStatus
                  mode={mode}
                  userAnswer={val}
                  correct={correct}
                  explanationHtml={q.explanationHtml}
                  compactMode={Boolean(reviewRender)}
                  questionId={q.id}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
