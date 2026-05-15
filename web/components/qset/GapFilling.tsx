"use client";

import { createElement, useMemo, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { QuestionSet, Answers, Mode, ReviewRender } from "./types";
import QSetHeader from "./QSetHeader";
import AnswerStatus from "./AnswerStatus";

function correctFor(q: QuestionSet["questions"][0]): string | string[] | null {
  if (q.correctAnswers && q.correctAnswers.length > 0) return q.correctAnswers;
  return q.correctAnswer;
}

function renderGapInput({
  order,
  qid,
  answers,
  onAnswer,
  isReview,
}: {
  order: number;
  qid: number;
  answers: Answers;
  onAnswer: (qId: number, val: string) => void;
  isReview: boolean;
}) {
  return (
    <span
      id={`question-${qid}`}
      className="inline-flex items-center align-middle mx-0.5"
    >
      <input
        type="text"
        value={(answers[qid] as string) ?? ""}
        disabled={isReview}
        placeholder={String(order)}
        onChange={(e) => onAnswer(qid, e.target.value)}
        className="h-6 min-w-20 rounded-[2px] border border-[#888] bg-white px-1.5 text-center text-[13px] outline-none focus:border-[#418ec8] focus:shadow-[0_0_0_1px_#418ec8]"
      />
    </span>
  );
}

function styleToObject(style: string): CSSProperties {
  return style.split(";").reduce<CSSProperties>((acc, rule) => {
    const [rawKey, rawValue] = rule.split(":");
    if (!rawKey || !rawValue) return acc;
    const key = rawKey
      .trim()
      .replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
    return { ...acc, [key]: rawValue.trim() };
  }, {});
}

function attrsToProps(el: Element): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name;
    const value = attr.value;
    if (/^on/i.test(name)) continue;
    if (name === "class") props.className = value;
    else if (name === "style") props.style = styleToObject(value);
    else if (name === "colspan") props.colSpan = Number(value);
    else if (name === "rowspan") props.rowSpan = Number(value);
    else if (name === "for") props.htmlFor = value;
    else props[name] = value;
  }

  return props;
}

function parseHtmlToReact(
  html: string,
  orderToQuestion: Map<number, QuestionSet["questions"][0]>,
  renderGap: (order: number, qid: number) => ReactNode
): ReactNode {
  const doc = new DOMParser().parseFromString(`<root>${html}</root>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return null;

  function walk(node: Node, key: string, parentTag = ""): ReactNode {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      const tableOnlyChildren = new Set(["table", "thead", "tbody", "tfoot", "tr", "colgroup"]);
      if (tableOnlyChildren.has(parentTag) && !text.trim()) return null;
      return text;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node as Element;
    if (el.tagName === "SPAN" && el.classList.contains("gap-placeholder")) {
      const m = (el.getAttribute("data-question-id") || el.textContent || "").match(/(\d+)/);
      if (!m) return null;
      const order = parseInt(m[1], 10);
      const q = orderToQuestion.get(order);
      return q ? renderGap(order, q.id) : null;
    }

    if (el.tagName.toLowerCase() === "root") {
      return Array.from(el.childNodes).map((child, i) => walk(child, `${key}-${i}`, "root"));
    }

    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map((child, i) => walk(child, `${key}-${i}`, tag));
    return createElement(tag, { key, ...attrsToProps(el) }, ...children);
  }

  return walk(root, "root");
}

function subscribeClientReady(onStoreChange: () => void) {
  onStoreChange();
  return () => {};
}

function useClientReady() {
  return useSyncExternalStore(
    subscribeClientReady,
    () => true,
    () => false
  );
}

export default function GapFilling({
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
  const isReview = mode !== "exam";
  const isClientReady = useClientReady();
  const hasGaps = !!qs.contentHtml?.includes("gap-placeholder");
  const orderToQuestion = useMemo(
    () => new Map(qs.questions.map((q) => [q.order, q])),
    [qs.questions]
  );
  const parsedContent = useMemo(() => {
    if (!isClientReady || !hasGaps || !qs.contentHtml) return null;
    return parseHtmlToReact(qs.contentHtml, orderToQuestion, (order, qid) => {
      if (mode === "review" && reviewRender) {
        const q = orderToQuestion.get(order);
        if (q) return reviewRender(q, order);
      }
      return renderGapInput({ order, qid, answers, onAnswer, isReview });
    });
  }, [answers, hasGaps, isClientReady, isReview, mode, onAnswer, orderToQuestion, qs.contentHtml, reviewRender]);

  return (
    <div className="anchor-hl-note content-cms" id={`question-set-${qs.id}`}>
      <QSetHeader qs={qs} />

      {hasGaps ? (
        <div className="content-html leading-loose">
          {parsedContent ?? <div dangerouslySetInnerHTML={{ __html: qs.contentHtml }} />}
        </div>
      ) : (
        <FallbackInputs qs={qs} answers={answers} onAnswer={onAnswer} mode={mode} reviewRender={reviewRender} />
      )}

      {mode === "review" && (
        <div className="mt-4 space-y-2">
          {qs.questions.map((q) => (
            <AnswerStatus
              key={q.id}
              mode={mode}
              userAnswer={answers[q.id] as string | undefined}
              correct={correctFor(q)}
              explanationHtml={q.explanationHtml}
              compactMode={Boolean(reviewRender)}
              questionId={q.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FallbackInputs({
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
  const isReview = mode !== "exam";
  return (
    <div className="space-y-3 mt-3">
      {qs.questions.map((q) => {
        const val = (answers[q.id] as string) ?? "";
        return (
          <div key={q.id} className="flex items-center gap-2 flex-wrap">
            <span
              id={`question-${q.id}`}
              className={`font-bold border whitespace-nowrap rounded-[4px] min-w-7 px-1 flex items-center justify-center text-sm ${
                val ? "border-[#418ec8] shadow-[0_0_0_1px_#418ec8]" : "border-transparent"
              }`}
            >
              {q.order}
            </span>
            {q.text && <span className="text-sm flex-1">{q.text}</span>}
            {mode === "review" && reviewRender ? (
              reviewRender(q, q.order)
            ) : (
              <input
                type="text"
                value={val}
                disabled={isReview}
                onChange={(e) => onAnswer(q.id, e.target.value)}
                placeholder={String(q.order)}
                className="border border-[#888] rounded-[2px] px-2 py-0.5 text-sm min-w-[80px] outline-none text-center"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
