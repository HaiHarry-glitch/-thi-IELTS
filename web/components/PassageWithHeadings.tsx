"use client";

// Passage renderer that splits HTML by <p> tags, prepends a matching-heading
// drop placeholder before each paragraph that begins with a target letter
// (e.g., "B.", "C.", ...) when there's a corresponding question.
import { memo } from "react";
import PassageRenderer from "./PassageRenderer";
import { MatchingHeadingsPlaceholder } from "./MatchingHeadingsExam";
import type { QuestionSet, Answers, Mode, Question } from "./qset/types";

// Memoized paragraph chunk — only re-renders when its HTML string changes.
// This preserves any <mark> highlights the user inserts manually via HighlightLayer,
// even when parent re-renders due to answer updates.
const ParagraphChunk = memo(function ParagraphChunk({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
});

function detectParagraphLetter(html: string): string | null {
  const text = html.replace(/<[^>]*>/g, "").trim();
  const m = text.match(/^(?:Paragraph|Section|Part|Passage)?\s*([A-Z])(?:\.|:|—|-|\s)/i);
  return m ? m[1] : null;
}

function splitParagraphs(html: string): string[] {
  // Simple splitter: split on </p>, keep the <p>...</p> chunks
  const parts: string[] = [];
  const re = /<p[^>]*>[\s\S]*?<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) parts.push(m[0]);
  if (parts.length === 0) return [html];
  return parts;
}

export default function PassageWithHeadings({
  passageHtml,
  matchingHeadingsQS,
  answers,
  onAnswer,
  mode,
}: {
  passageHtml: string;
  matchingHeadingsQS: QuestionSet | null;
  answers: Answers;
  onAnswer: (qId: number, val: string) => void;
  mode: Mode;
}) {
  if (!matchingHeadingsQS) {
    return <PassageRenderer html={passageHtml} />;
  }

  // Strip vocab markup first
  const cleaned = passageHtml.replace(/\{\[([^\]]*)\]\[(\d+)\]\}/g, "$1");

  const paragraphs = splitParagraphs(cleaned);
  const questionByLetter: Record<string, Question> = {};
  for (const q of matchingHeadingsQS.questions) {
    const explicit = String(q.matchingHeadingParagraph || "").trim();
    const explicitLetter = /^[A-Z]$/i.test(explicit) ? explicit.toUpperCase() : null;
    const textLetter = (q.text || "").match(/(?:Paragraph|Section|Part|Passage)\s+([A-Z])/i)?.[1]?.toUpperCase() || null;
    const letter = explicitLetter || textLetter;
    if (letter) questionByLetter[letter] = q;
  }

  const opts = matchingHeadingsQS.options ?? [];

  return (
    <div className="passage-html" style={{ userSelect: "text" }}>
      {paragraphs.map((html, i) => {
        const letter = detectParagraphLetter(html);
        const q = letter ? questionByLetter[letter] : null;
        return (
          <div key={i} className="anchor-hl-note" id={letter ? `paragraph-${letter}` : undefined}>
            {q && (
              <MatchingHeadingsPlaceholder
                question={q}
                answer={answers[q.id] as string | undefined}
                options={opts}
                onAnswer={onAnswer}
                mode={mode}
              />
            )}
            <ParagraphChunk html={html} />
          </div>
        );
      })}
    </div>
  );
}
