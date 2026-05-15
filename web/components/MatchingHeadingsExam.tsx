"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { QuestionSet, Answers, Mode, Question } from "./qset/types";

interface CommonProps {
  qs: QuestionSet;
  answers: Answers;
  onAnswer: (qId: number, val: string) => void;
  mode: Mode;
}

interface TapContextValue {
  pickedCode: string | null;
  setPickedCode: (code: string | null) => void;
}

const MatchingHeadingsTapContext = createContext<TapContextValue | null>(null);

export function MatchingHeadingsTapProvider({ children }: { children: ReactNode }) {
  const [pickedCode, setPickedCode] = useState<string | null>(null);
  return (
    <MatchingHeadingsTapContext.Provider value={{ pickedCode, setPickedCode }}>
      {children}
    </MatchingHeadingsTapContext.Provider>
  );
}

function useMatchingHeadingsTap() {
  return useContext(MatchingHeadingsTapContext);
}

// Right-panel: "List of Headings" — draggable chips, black/white
export function MatchingHeadingsRight({ qs, answers, mode }: CommonProps) {
  const opts = qs.options ?? [];
  const isExam = mode === "exam";
  const tap = useMatchingHeadingsTap();

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

  return (
    <div className="anchor-hl-note content-cms" id={`question-set-${qs.id}`}>
      <div className="font-bold mb-1">{qs.title}</div>
      {qs.instructionHtml && (
        <div className="text-sm mb-3" dangerouslySetInnerHTML={{ __html: qs.instructionHtml }} />
      )}

      <div className="font-semibold mb-2">{qs.optionTitle || "List of Headings"}</div>
      <div className="flex flex-col gap-1 pb-2 items-start">
        {opts.map((opt) => {
          const used = usedCodes.has(opt.option) && !qs.allowReuse;
          const picked = tap?.pickedCode === opt.option;
          return (
            <div
              key={opt.option}
              draggable={isExam && !used}
              onDragStart={(e) => onDragStart(e, opt.option)}
              onClick={() => {
                if (!isExam || used) return;
                tap?.setPickedCode(picked ? null : opt.option);
              }}
              className={`bg-white border border-[#c5c5c5] hover:border-[#000] rounded-[4px] py-1 px-2 text-sm select-none ${
                isExam && !used ? "cursor-grab active:cursor-grabbing" : "cursor-default"
              } ${used ? "opacity-30 line-through" : ""} ${picked ? "ring-2 ring-[#418ec8] border-[#418ec8]" : ""}`}
            >
              {opt.text}
            </div>
          );
        })}
      </div>
      {isExam && tap?.pickedCode && (
        <div className="mt-2 text-xs text-[#418ec8]">
          Đang chọn {tap.pickedCode}. Chạm vào ô trống bên bài đọc để điền.
        </div>
      )}
    </div>
  );
}

// Passage placeholder: dashed numbered drop zone — drag-drop only
export function MatchingHeadingsPlaceholder({
  question,
  answer,
  options,
  onAnswer,
  mode,
}: {
  question: Question;
  answer: string | undefined;
  options: { option: string; text: string }[];
  onAnswer: (qId: number, val: string) => void;
  mode: Mode;
}) {
  const [dragOver, setDragOver] = useState(false);
  const isExam = mode === "exam";
  const opt = options.find((o) => o.option === answer);
  const tap = useMatchingHeadingsTap();

  function onDragOver(e: React.DragEvent) {
    if (!isExam) return;
    e.preventDefault();
    setDragOver(true);
  }

  function onDrop(e: React.DragEvent) {
    if (!isExam) return;
    e.preventDefault();
    const code = e.dataTransfer.getData("text/plain");
    if (code) onAnswer(question.id, code);
    setDragOver(false);
  }

  function applyPicked() {
    if (!isExam || !tap?.pickedCode) return;
    onAnswer(question.id, tap.pickedCode);
    tap.setPickedCode(null);
  }

  return (
    <div className="my-2">
      <div
        id={`question-${question.id}`}
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={applyPicked}
        className={`w-full border-2 border-dashed rounded-[4px] min-h-8 flex items-center justify-center transition-colors ${
          dragOver
            ? "border-[#000] bg-gray-100"
            : answer
            ? "border-[#418ec8]"
            : "border-[#aaa]"
        }`}
      >
        {answer ? (
          <span className="text-sm py-1 px-2 flex items-center gap-2 w-full justify-center">
            <span>{opt?.text ?? answer}</span>
            {isExam && (
              <button
                onClick={(e) => { e.stopPropagation(); onAnswer(question.id, ""); }}
                className="text-gray-400 hover:text-black text-xs ml-1"
                title="Xóa"
              >✕</button>
            )}
          </span>
        ) : (
          <span className="text-sm font-bold text-gray-500 pointer-events-none select-none">
            {question.order}
          </span>
        )}
      </div>
    </div>
  );
}
