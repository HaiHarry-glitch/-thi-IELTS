import { memo } from "react";
import type { QuestionSet } from "./types";

// Memoize the instruction body so user-inserted <mark> highlights survive
// across re-renders caused by answer state updates.
const InstructionBody = memo(function InstructionBody({ html }: { html: string }) {
  return (
    <div
      className="instruction-html text-sm"
      style={{ userSelect: "text" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

export default function QSetHeader({ qs }: { qs: QuestionSet }) {
  return (
    <div className="mb-4" style={{ userSelect: "text" }}>
      <h3 className="font-semibold text-gray-800 mb-2">{qs.title}</h3>
      {qs.instructionHtml && <InstructionBody html={qs.instructionHtml} />}
    </div>
  );
}
