"use client";

import { useEffect, useState } from "react";
import type { Mode } from "./types";

interface Props {
  mode: Mode;
  userAnswer: string | string[] | undefined;
  correct: string | string[] | null;
  explanationHtml?: string;
  /** When true, hide the summary line (user/correct) — used when an inline review badge already shows that info */
  compactMode?: boolean;
  /** Controlled expanded state from parent (for locate→expand flow) */
  forceExpanded?: boolean;
  /** Question id — when set, listens for window 'qset:expand-explanation' event with matching id */
  questionId?: number;
}

function normalize(v: string | string[] | null | undefined): string {
  if (!v) return "";
  if (Array.isArray(v)) return v.map((s) => s.trim().toLowerCase()).sort().join("|");
  return v.trim().toLowerCase();
}

export function isCorrect(
  userAnswer: string | string[] | undefined,
  correct: string | string[] | null
): boolean {
  if (!userAnswer || !correct) return false;
  const ua = normalize(userAnswer);
  const ca = normalize(correct);
  if (ua === ca) return true;
  if (Array.isArray(correct)) {
    const userStr = Array.isArray(userAnswer)
      ? userAnswer[0]?.trim().toLowerCase()
      : userAnswer.trim().toLowerCase();
    return correct.some((c) => c.trim().toLowerCase() === userStr);
  }
  return false;
}

function displayCorrect(correct: string | string[] | null): string {
  if (!correct) return "";
  if (Array.isArray(correct)) return correct.join(" / ");
  return correct;
}

function displayUser(user: string | string[] | undefined): string {
  if (!user) return "(bỏ qua)";
  if (Array.isArray(user)) return user.length ? user.join(", ") : "(bỏ qua)";
  return user;
}

export default function AnswerStatus({
  mode,
  userAnswer,
  correct,
  explanationHtml,
  compactMode = false,
  forceExpanded,
  questionId,
}: Props) {
  const [localExpanded, setLocalExpanded] = useState(false);

  // Sync with external trigger
  useEffect(() => {
    if (forceExpanded === true) setLocalExpanded(true);
  }, [forceExpanded]);

  // Listen for global "expand explanation for question X" event (from locate button)
  useEffect(() => {
    if (questionId == null) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ qId: number }>).detail;
      if (detail?.qId === questionId) setLocalExpanded(true);
    };
    window.addEventListener("qset:expand-explanation", handler as EventListener);
    return () => window.removeEventListener("qset:expand-explanation", handler as EventListener);
  }, [questionId]);

  if (mode === "exam") return null;

  const answered =
    userAnswer !== undefined &&
    userAnswer !== "" &&
    !(Array.isArray(userAnswer) && userAnswer.length === 0);
  const ok = answered && isCorrect(userAnswer, correct);

  const expanded = localExpanded;

  // In compact mode (inline badge already shown), skip the summary line completely
  if (compactMode) {
    if (!explanationHtml) return null;
    return (
      <div className="mt-2">
        <button
          onClick={() => setLocalExpanded((v) => !v)}
          className="font-mono text-[11px] font-bold text-[#1a1a1a] opacity-60 hover:opacity-100"
        >
          {expanded ? "▲ Ẩn giải thích" : "▼ Xem giải thích"}
        </button>
        {expanded && (
          <div className="mt-2 border-2 border-[#1a1a1a] bg-[#F5F1E9] p-3 shadow-[3px_3px_0_0_#1a1a1a]">
            <div className="mb-2 font-mono text-[10px] font-bold uppercase text-[#1a1a1a] opacity-50">
              // giải thích
            </div>
            <div
              className="explanation-html text-[13px] leading-relaxed text-[#1a1a1a]"
              dangerouslySetInnerHTML={{ __html: explanationHtml }}
            />
          </div>
        )}
      </div>
    );
  }

  // Full mode: status banner + summary + expand button — NEO style
  const statusBg = ok
    ? "bg-[#FFD700]/30 border-[#1a1a1a]"
    : answered
    ? "bg-[#d9381e]/15 border-[#1a1a1a]"
    : "bg-[#F5F1E9] border-[#1a1a1a]";

  return (
    <div className="mt-2">
      <div className={`flex flex-wrap items-center gap-2 border-2 px-3 py-1.5 text-[12px] ${statusBg}`}>
        <span className={`font-bold ${ok ? "text-[#1a1a1a]" : answered ? "text-[#d9381e]" : "text-[#1a1a1a] opacity-60"}`}>
          {ok ? "✓ Đúng" : answered ? "✗ Sai" : "— Chưa trả lời"}
        </span>
        <span className="font-mono text-[11px] text-[#1a1a1a] opacity-70">
          Bạn chọn:{" "}
          <strong className={ok ? "text-[#1a1a1a]" : "text-[#d9381e]"}>{displayUser(userAnswer)}</strong>
        </span>
        {!ok && correct && (
          <span className="font-mono text-[11px] text-[#1a1a1a] opacity-70">
            • Đáp án: <strong className="text-[#1a1a1a]">{displayCorrect(correct)}</strong>
          </span>
        )}
        {explanationHtml && (
          <button
            onClick={() => setLocalExpanded((v) => !v)}
            className="ml-auto border border-[#1a1a1a] bg-[#FDFCF9] px-2 py-0.5 font-mono text-[10px] font-bold text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#F5F1E9]"
          >
            {expanded ? "▲ Ẩn giải thích" : "▼ Xem giải thích"}
          </button>
        )}
      </div>

      {expanded && explanationHtml && (
        <div className="mt-2 border-2 border-[#1a1a1a] bg-[#F5F1E9] p-3 shadow-[3px_3px_0_0_#1a1a1a]">
          <div className="mb-2 font-mono text-[10px] font-bold uppercase text-[#1a1a1a] opacity-50">
            // giải thích
          </div>
          <div
            className="explanation-html text-[13px] leading-relaxed text-[#1a1a1a]"
            dangerouslySetInnerHTML={{ __html: explanationHtml }}
          />
        </div>
      )}
    </div>
  );
}
