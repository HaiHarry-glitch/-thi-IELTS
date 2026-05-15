"use client";

import type { QuestionSet, Answers, Mode } from "./types";
import QSetHeader from "./QSetHeader";
import TableSelection from "./TableSelection";
import GapFilling from "./GapFilling";

function extractImageSrc(qs: QuestionSet): string | null {
  if (qs.image) {
    if (qs.image.startsWith("http") || qs.image.startsWith("/")) return qs.image;
    return qs.image;
  }

  const m = (qs.instructionHtml || qs.contentHtml || "").match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  return m ? m[1].replace(/&amp;/g, "&") : null;
}

function stripImages(html: string): string {
  return html
    .replace(/<p[^>]*>\s*<img[^>]*>\s*<\/p>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .trim();
}

export default function LabelDiagram({
  qs,
  answers,
  onAnswer,
  mode,
}: {
  qs: QuestionSet;
  answers: Answers;
  onAnswer: (qId: number, val: string) => void;
  mode: Mode;
}) {
  const imageSrc = extractImageSrc(qs);
  const headerQs = {
    ...qs,
    instructionHtml: stripImages(qs.instructionHtml),
  };

  if (!imageSrc) {
    if (qs.options?.length) {
      return <TableSelection qs={qs} answers={answers} onAnswer={onAnswer} mode={mode} />;
    }
    return <GapFilling qs={qs} answers={answers} onAnswer={onAnswer} mode={mode} />;
  }

  const optionCount = qs.options?.length ?? 0;
  // When option count is large (letter bank A-I etc.), stack vertically so the table can take full width.
  const stackVertical = optionCount >= 6;

  return (
    <div className="anchor-hl-note content-cms" id={`question-set-${qs.id}`}>
      <QSetHeader qs={headerQs} />
      <div className={stackVertical ? "flex flex-col gap-4" : "flex flex-col gap-4 lg:flex-row lg:items-start"}>
        <div className={stackVertical ? "w-full flex justify-center" : "flex-shrink-0 lg:max-w-[52%]"}>
          <img
            src={imageSrc}
            alt="Map"
            className="max-h-[520px] max-w-full object-contain"
          />
        </div>
        <div className={stackVertical ? "w-full" : "min-w-[260px] flex-1"}>
          {qs.options?.length ? (
            <TableSelection
              qs={{ ...qs, instructionHtml: "", contentHtml: "" }}
              answers={answers}
              onAnswer={onAnswer}
              mode={mode}
              hideHeader
              hideContentHtml
            />
          ) : (
            <GapFilling
              qs={{ ...qs, instructionHtml: "", contentHtml: stripImages(qs.contentHtml) }}
              answers={answers}
              onAnswer={onAnswer}
              mode={mode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
