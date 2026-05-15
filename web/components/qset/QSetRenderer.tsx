"use client";

import type { QuestionSet, Answers, Mode, ReviewRender } from "./types";
import SingleSelection from "./SingleSelection";
import SingleChoice from "./SingleChoice";
import GapFilling from "./GapFilling";
import TableSelection from "./TableSelection";
import MatchingHeadings from "./MatchingHeadings";
import MatchingInfo from "./MatchingInfo";
import MultipleChoice from "./MultipleChoice";
import ShortAnswer from "./ShortAnswer";
import LabelDiagram from "./LabelDiagram";
import SummaryWithBank from "./SummaryWithBank";

interface Props {
  qs: QuestionSet;
  answers: Answers;
  onAnswer: (qId: number, val: string | string[]) => void;
  mode: Mode;
  reviewRender?: ReviewRender;
}

export default function QSetRenderer({ qs, answers, onAnswer, mode, reviewRender }: Props) {
  const common = { qs, answers, mode };
  const isMapTable =
    qs.type === "TABLE_SELECTION" &&
    (qs.questions.some((q) => q.type === "MAP_DIAGRAM_LABEL") ||
      /<img/i.test(qs.instructionHtml || qs.contentHtml || ""));

  switch (qs.type) {
    case "SINGLE_SELECTION":
      return <SingleSelection {...common} onAnswer={(id, v) => onAnswer(id, v)} reviewRender={reviewRender} />;
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE_ONE": // listening single-answer multiple choice
      return <SingleChoice {...common} onAnswer={(id, v) => onAnswer(id, v)} reviewRender={reviewRender} />;
    case "GAP_FILLING":
    case "FILL_BLANK":          // listening fill-in
    case "FILL-IN-THE-BLANK":
      return <GapFilling {...common} onAnswer={(id, v) => onAnswer(id, v)} reviewRender={reviewRender} />;
    case "NOTE_COMPLETION": {
      // When NOTE_COMPLETION has a letter bank (options A/B/Câ€¦) and the questions are
      // matching-style (MATCHING_FEATURES / MATCHING_INFO etc.), render as MatchingInfo
      // list (options bank + row per question) â€” NOT as a wide table that breaks with 8-10 cols.
      const MATCHING_TYPES = new Set([
        "MATCHING_INFO", "MATCHING_INFORMATION", "MATCHING_FEATURES",
        "MATCHING_NAMES", "MATCHING_ENDINGS",
      ]);
      if (qs.options && qs.options.length > 0) {
        const isMatchingStyle = qs.questions.some((q) => MATCHING_TYPES.has(q.type));
        if (isMatchingStyle) {
          return <MatchingInfo {...common} onAnswer={(id, v) => onAnswer(id, v)} reviewRender={reviewRender} />;
        }
        const SUMMARY_TYPES = new Set(["SUMMARY_COMPLETION", "SENTENCE_COMPLETION"]);
        const isSummaryStyle = qs.questions.some((q) => SUMMARY_TYPES.has(q.type));
        if (isSummaryStyle) {
          return <SummaryWithBank {...common} onAnswer={(id, v) => onAnswer(id, v)} reviewRender={reviewRender} />;
        }
        // Regular NOTE_COMPLETION with letter bank â†’ table (e.g. map/diagram labels)
        return <TableSelection {...common} onAnswer={(id, v) => onAnswer(id, v)} hideContentHtml reviewRender={reviewRender} />;
      }
      return <GapFilling {...common} onAnswer={(id, v) => onAnswer(id, v)} reviewRender={reviewRender} />;
    }
    case "TABLE_SELECTION":
      if (isMapTable) {
        return <LabelDiagram {...common} onAnswer={(id, v) => onAnswer(id, v)} />;
      }
      return <TableSelection {...common} onAnswer={(id, v) => onAnswer(id, v)} reviewRender={reviewRender} />;
    case "MATCHING_HEADINGS":
      return <MatchingHeadings {...common} onAnswer={(id, v) => onAnswer(id, v)} reviewRender={reviewRender} />;
    case "MATCHING_INFORMATION":
    case "MATCHING_INFO":       // listening matching info
    case "MATCHING_FEATURES":
    case "MATCHING_ENDINGS":
    case "MATCHING_NAMES":      // listening match names
    case "MATCHING":             // generic listening matching
      return <MatchingInfo {...common} onAnswer={(id, v) => onAnswer(id, v)} reviewRender={reviewRender} />;
    case "MULTIPLE_CHOICE":
    case "MULTIPLE_CHOICE_MANY":
      return <MultipleChoice {...common} onAnswer={onAnswer} reviewRender={reviewRender} />;
    case "SHORT_ANSWER":
    case "SHORT_ANSWERS":       // listening plural
    case "SENTENCE_COMPLETION":
    case "SUMMARY_COMPLETION":
      return <ShortAnswer {...common} onAnswer={(id, v) => onAnswer(id, v)} reviewRender={reviewRender} />;
    case "LABEL_DIAGRAM":
    case "MAP_LABELLING":
    case "MAP_DIAGRAM_LABEL":   // listening map/diagram
      return <LabelDiagram {...common} onAnswer={(id, v) => onAnswer(id, v)} />;
    default:
      // Fallback: render as short answer
      return <ShortAnswer {...common} onAnswer={(id, v) => onAnswer(id, v)} reviewRender={reviewRender} />;
  }
}

