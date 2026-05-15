"use client";

import { useState } from "react";
import type { QuestionSet, Answers, Mode, ReviewRender } from "./types";
import QSetHeader from "./QSetHeader";
import AnswerStatus from "./AnswerStatus";

export default function MatchingInfo({
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
    <div className="anchor-hl-note content-cms" id={`question-set-${qs.id}`}>
      <QSetHeader qs={qs} />
      {/* NOTE: intentionally NOT rendering contentHtml — it duplicates the question text */}

      {/* Options list */}
      {opts.length > 0 && (
        <div className="mb-4">
          <div className="font-semibold text-sm mb-2">
            {qs.optionTitle || "List of options"}
          </div>
          <div className="flex flex-wrap gap-2">
            {opts.map((opt) => {
              const used = usedCodes.has(opt.option) && !qs.allowReuse;
              return (
                <div
                  key={opt.option}
                  draggable={isExam && !used}
                  onDragStart={(e) => onDragStart(e, opt.option)}
                  className={`bg-white border border-[#c5c5c5] hover:border-[#000] rounded-[4px] py-1 px-2 text-sm select-none ${
                    isExam && !used ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                  } ${used ? "opacity-30" : ""}`}
                >
                  <span className="font-bold">{opt.option}.</span>
                  {opt.text && opt.text !== opt.option && (
                    <span className="ml-1">{opt.text}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Question rows */}
      <div className="space-y-3">
        {qs.questions.map((q) => {
          const val = answers[q.id] as string | undefined;
          const correct = q.correctAnswer;
          const qOpts = q.options ?? opts;
          const isOver = dragOver === q.id;
          const selectedOpt = opts.find((o) => o.option === val);

          return (
            <div key={q.id}>
              <div className="flex items-start gap-3">
                {/* Question number */}
                <span
                  id={`question-${q.id}`}
                  className={`font-bold border whitespace-nowrap rounded-[4px] min-w-7 px-1 flex items-center justify-center shrink-0 ${
                    val ? "border-[#418ec8] shadow-[0_0_0_1px_#418ec8]" : "border-transparent"
                  }`}
                >
                  {q.order}
                </span>

                {/* Question text */}
                <span className="text-sm flex-1">{q.text}</span>

                {/* Drop zone or inline review */}
                {isExam === false && reviewRender
                  ? <div className="shrink-0">{reviewRender(q, q.order)}</div>
                  : qOpts.length > 0 && (
                  <div
                    onDragOver={(e) => { if (isExam) { e.preventDefault(); setDragOver(q.id); } }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => onDrop(e, q.id)}
                    className={`fill_placeholder min-w-[160px] flex items-center justify-center rounded-[4px] border border-dashed h-9 px-2 text-sm shrink-0 ${
                      isOver ? "border-[#000] bg-gray-100" : val ? "border-[#418ec8]" : "border-[#aaa]"
                    }`}
                  >
                    {val ? (
                      <span className="flex items-center gap-1">
                        <span className="font-bold">{val}</span>
                        <span className="truncate max-w-[120px]">{selectedOpt?.text ?? ""}</span>
                        {isExam && (
                          <button
                            onClick={() => onAnswer(q.id, "")}
                            className="ml-1 text-gray-400 hover:text-black text-xs"
                          >✕</button>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Kéo vào đây</span>
                    )}
                  </div>
                )}
                {qOpts.length === 0 && !(!isExam && reviewRender) && (
                  <input
                    type="text"
                    value={(val as string) ?? ""}
                    disabled={!isExam}
                    onChange={(e) => onAnswer(q.id, e.target.value)}
                    className="border border-[#555] rounded-[2px] px-2 py-0.5 text-sm min-w-[120px] outline-none"
                  />
                )}
              </div>
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
