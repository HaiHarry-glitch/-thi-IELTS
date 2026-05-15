"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import type { Answers } from "@/components/qset/types";
import QSetRenderer from "@/components/qset/QSetRenderer";
import type { LocateInfo, NormalizedQuestion, NormalizedQuiz } from "@/lib/data";
import InlineReviewReading from "@/components/reading/InlineReviewReading";
import ReadingPassageReview, { type SelectedVocab } from "@/components/reading/ReadingPassageReview";
import { parseSavedAnswers } from "@/lib/answerStorage";
import { computeReviewStats } from "@/lib/reviewScoring";

const STORAGE_KEY = (id: number, skill: "reading" | "listening", fullTestKey?: string) =>
  fullTestKey ? `hin_answers_full_${skill}_${fullTestKey}` : `yp_answers_${id}`;

function locateInfoOf(q: NormalizedQuestion): LocateInfo | null {
  return q.locateInfo || null;
}

type ParagraphRange = NonNullable<LocateInfo["paragraph_ranges"]>[number];

function collectAllRanges(locate: LocateInfo | null): ParagraphRange[] {
  if (!locate) return [];
  // Normal single locate: { paragraph_ranges: [...] }
  if (Array.isArray(locate.paragraph_ranges)) return locate.paragraph_ranges as ParagraphRange[];
  // Multi-answer locate: { "0": { paragraph_ranges: [...] }, "1": {...} }
  const all: ParagraphRange[] = [];
  for (const key of Object.keys(locate)) {
    const sub = (locate as unknown as Record<string, LocateInfo>)[key];
    if (sub?.paragraph_ranges) all.push(...sub.paragraph_ranges);
  }
  return all;
}

function paragraphsFromLocate(locate: LocateInfo | null): number[] {
  const ranges = collectAllRanges(locate);
  const paragraphs = new Set<number>();
  for (const range of ranges) {
    const start = range.start?.paragraph;
    const end = range.end?.paragraph ?? start;
    if (typeof start !== "number") continue;
    const first = Math.max(0, start - 1); // 1-based → 0-based
    const last = Math.max(first, typeof end === "number" ? end - 1 : first);
    for (let p = first; p <= last; p++) paragraphs.add(p);
  }
  return [...paragraphs];
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

type ActiveTool = "highlight" | "vocab" | "none";

function ToolItem({
  label,
  shortcut,
  icon,
  tooltip,
  active = false,
  onClick,
}: {
  label: string;
  shortcut: string;
  icon: React.ReactNode;
  tooltip: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        className={`flex w-12 flex-col items-center gap-1 border-2 border-[#1a1a1a] p-2 text-[10px] transition-all ${
          active
            ? "bg-[#FFD700] text-[#1a1a1a] shadow-[2px_2px_0_0_#1a1a1a]"
            : "bg-[#F5F1E9] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#F5F1E9] shadow-[2px_2px_0_0_#1a1a1a]"
        }`}
      >
        <span className="text-base leading-none">{icon}</span>
        <span className="font-mono text-[9px] font-bold opacity-70">{shortcut}</span>
      </button>
      {/* Tooltip */}
      <div className="pointer-events-none absolute left-full top-0 z-50 ml-2 hidden w-52 border-2 border-[#1a1a1a] bg-[#1a1a1a] p-3 text-[#F5F1E9] shadow-[4px_4px_0_0_rgba(245,241,233,0.15)] group-hover:block">
        <div className="mb-1 font-mono text-[10px] font-bold text-[#FFD700]">
          {label} <span className="opacity-50">({shortcut})</span>
        </div>
        <div className="text-[11px] leading-relaxed opacity-80">{tooltip}</div>
      </div>
    </div>
  );
}

export default function ReadingReviewClient({ quiz }: { quiz: NormalizedQuiz }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [activePart, setActivePart] = useState(0);
  const [focusedParagraphIndices, setFocusedParagraphIndices] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [activeTool, setActiveTool] = useState<ActiveTool>("highlight");
  const [selectedVocab, setSelectedVocab] = useState<SelectedVocab | null>(null);

  useEffect(() => {
    const key = STORAGE_KEY(quiz.id, "reading", quiz.fullTestKey);
    const saved = localStorage.getItem(key);
    const migrated = parseSavedAnswers(saved);
    if (Object.keys(migrated).length) {
      setAnswers(migrated);
      localStorage.setItem(key, JSON.stringify(migrated));
    }
  }, [quiz.fullTestKey, quiz.id]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "t" || event.key === "T") {
        setActiveTool((tool) => {
          const next = tool === "vocab" ? "none" : "vocab";
          if (next !== "vocab") setSelectedVocab(null);
          return next;
        });
      }
      if (event.key === "Escape") setSelectedVocab(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const part = quiz.parts[activePart] || quiz.parts[0];
  const score = useMemo(() => computeReviewStats(quiz, answers), [quiz, answers]);
  const partSlots = score.slots.filter((result) => result.slot.partIdx === activePart);

  function showLocation(q: NormalizedQuestion) {
    const locate = locateInfoOf(q);
    const paragraphs = paragraphsFromLocate(locate);
    setFocusedParagraphIndices(paragraphs);
    // Trigger explanation expand for this question (AnswerStatus listens globally)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("qset:expand-explanation", { detail: { qId: q.id } }));
    }
    // Auto-scroll handled inside ReadingPassageReview via useEffect
  }

  function scrollToQuestion(qId: number) {
    document.getElementById(`review-question-${qId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderInlineReview(q: NormalizedQuestion, order: number) {
    const locate = locateInfoOf(q);
    const slots = score.byQuestionId.get(q.id) ?? [];
    if (slots.length > 1) {
      return (
        <span className="inline-flex flex-wrap gap-1">
          {slots.map((result) => (
            <InlineReviewReading
              key={`${result.slot.id}-${result.slot.slotIdx}`}
              order={result.slot.order}
              userAnswer={result.userAnswer}
              correctAnswer={result.correctAnswer}
              isCorrect={result.isCorrect}
              hasParagraphRange={collectAllRanges(locate).length > 0}
              onLocate={() => showLocation(q)}
            />
          ))}
        </span>
      );
    }
    const result = slots[0];
    return (
      <InlineReviewReading
        order={order}
        userAnswer={result?.userAnswer}
        correctAnswer={result?.correctAnswer ?? ""}
        isCorrect={Boolean(result?.isCorrect)}
        hasParagraphRange={collectAllRanges(locate).length > 0}
        onLocate={() => showLocation(q)}
      />
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#F5F1E9] text-[#1a1a1a]" style={{ fontFamily: "var(--font-inter, Arial, sans-serif)" }}>
      <div className="flex h-full flex-col">

        {/* ── HIN TOP NAV ── */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b-2 border-[#1a1a1a] bg-[#F5F1E9] px-4">
          <a href="/" className="flex items-center gap-1 shrink-0">
            <span className="font-display text-xl font-black tracking-tight text-[#1a1a1a]">HIN</span>
            <span className="font-display text-xl font-black tracking-tight text-[#d9381e]">·</span>
            <span className="font-mono text-[10px] font-bold text-[#1a1a1a] opacity-60 leading-none">NAVIGATOR</span>
          </a>
          <a
            href="/luyen-thi/ielts/reading"
            className="flex items-center gap-1.5 border-2 border-[#1a1a1a] bg-[#F5F1E9] px-3 py-1 text-xs font-bold text-[#1a1a1a] shadow-[2px_2px_0_0_#1a1a1a] transition-all hover:-translate-y-px hover:shadow-[3px_3px_0_0_#1a1a1a] active:translate-y-px active:shadow-none"
          >
            ← Thư viện
          </a>
          <span className="font-mono text-[11px] text-[#1a1a1a] opacity-40">// READING · REVIEW</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="border-2 border-[#1a1a1a] bg-[#FFD700] px-3 py-0.5 font-mono text-xs font-bold text-[#1a1a1a] shadow-[2px_2px_0_0_#1a1a1a]">
              {score.correct}/{score.total} đúng
            </span>
            <span className="border-2 border-[#1a1a1a] bg-[#d9381e] px-3 py-0.5 font-mono text-xs font-bold text-white shadow-[2px_2px_0_0_#1a1a1a]">
              {score.wrong} sai
            </span>
          </div>
        </header>

        {/* ── SUB BAR: timer + share ── */}
        <div className="flex h-10 shrink-0 items-center gap-3 border-b-2 border-[#1a1a1a] bg-[#FDFCF9] px-4 text-sm">
          <a
            href="/luyen-thi/ielts/reading"
            className="flex h-6 w-6 items-center justify-center border-2 border-[#1a1a1a] bg-[#F5F1E9] text-[11px] font-bold text-[#1a1a1a] shadow-[1px_1px_0_0_#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#F5F1E9]"
            title="Đóng"
          >
            ✕
          </a>
          <span className="font-mono text-xs font-bold text-[#1a1a1a]">{formatElapsed(elapsed)}</span>
          <span className="font-mono text-xs text-[#1a1a1a] opacity-60">
            {score.skipped > 0 && <span>{score.skipped} bỏ qua · </span>}
          </span>
          <div className="ml-auto flex gap-2">
            <button className="border-2 border-[#1a1a1a] bg-[#F5F1E9] px-3 py-0.5 text-xs font-bold text-[#1a1a1a] shadow-[2px_2px_0_0_#1a1a1a] transition-all hover:-translate-y-px hover:shadow-[3px_3px_0_0_#1a1a1a] active:translate-y-px active:shadow-none">
              Chia sẻ bài làm
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* ── SIDEBAR TOOLS ── */}
          <aside className="hidden w-14 shrink-0 flex-col items-center gap-2 border-r-2 border-[#1a1a1a] bg-[#FDFCF9] py-3 md:flex">
            <span className="mb-1 font-mono text-[8px] font-bold uppercase text-[#1a1a1a] opacity-40">Tools</span>
            <ToolItem
              label="Highlight"
              shortcut="H"
              tooltip="Chế độ xem bài đọc. Đoạn văn liên quan đến câu hỏi sẽ được highlight khi bạn bấm nút định vị."
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M17.75 3a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V3.75a.75.75 0 0 1 .75-.75ZM12 5.5c1.56 0 2.96.63 3.98 1.65L17.5 8.67V7.25a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1 0-1.5h1.4l-1.45-1.45A4.5 4.5 0 1 0 7.5 12a.75.75 0 0 1-1.5 0A6 6 0 1 1 12 5.5ZM5 15.5h14v1.5H5v-1.5Zm0 3h14V20H5v-1.5Z" />
                </svg>
              }
              active={activeTool === "highlight"}
              onClick={() => {
                setActiveTool("highlight");
                setSelectedVocab(null);
              }}
            />
            <ToolItem
              label="Từ điển"
              shortcut="T"
              tooltip="Chế độ tra từ vựng. Click vào bất kỳ từ nào trong đoạn văn để xem nghĩa, IPA, ví dụ và dịch cả câu."
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M19 2H8.5A3.5 3.5 0 0 0 5 5.5v13A3.5 3.5 0 0 0 8.5 22H19a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Zm-1 18H8.5a1.5 1.5 0 0 1 0-3H18v3ZM18 15H8.5A3.49 3.49 0 0 0 6 16.1V5.5a1.5 1.5 0 0 1 1.5-1.5H18v11Z" />
                </svg>
              }
              active={activeTool === "vocab"}
              onClick={() => {
                setActiveTool((tool) => {
                  const next = tool === "vocab" ? "none" : "vocab";
                  if (next !== "vocab") setSelectedVocab(null);
                  return next;
                });
              }}
            />
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            {/* Part tabs — reading usually has 1 part but support multiple */}
            {quiz.parts.length > 1 && (
              <div className="flex h-10 shrink-0 items-center gap-2 border-b-2 border-[#1a1a1a] bg-[#FDFCF9] px-4">
                {quiz.parts.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActivePart(idx);
                      setFocusedParagraphIndices([]);
                      setSelectedVocab(null);
                    }}
                    className={`border-2 border-[#1a1a1a] px-3 py-0.5 text-[12px] font-bold transition-all shadow-[2px_2px_0_0_#1a1a1a] hover:-translate-y-px hover:shadow-[3px_3px_0_0_#1a1a1a] active:translate-y-px active:shadow-none ${
                      idx === activePart
                        ? "bg-[#1a1a1a] text-[#F5F1E9]"
                        : "bg-[#F5F1E9] text-[#1a1a1a]"
                    }`}
                  >
                    Part {idx + 1}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-[#1a1a1a] opacity-60">Đúng: <strong className="text-[#1a1a1a]">{score.correct}</strong></span>
                  <span className="text-[#d9381e]">Sai: <strong>{score.wrong}</strong></span>
                  <span className="text-[#1a1a1a] opacity-40">Bỏ: {score.skipped}</span>
                </div>
              </div>
            )}

            <div className="grid min-h-0 flex-1 grid-cols-1 bg-[#F5F1E9] lg:grid-cols-[62%_38%]">
              {/* ── Passage panel ── */}
              <section className="min-h-0 overflow-y-auto border-r-2 border-[#1a1a1a] bg-[#F5F1E9] p-6">
                {part.title && (
                  <h2 className="mb-4 font-display text-lg font-bold text-[#1a1a1a]">{part.title}</h2>
                )}
                {part.passageHtml ? (
                  <ReadingPassageReview
                    html={part.passageHtml}
                    vocabMode={activeTool === "vocab"}
                    selectedVocab={selectedVocab}
                    onWordClick={(word, parentId, key) => setSelectedVocab({ word, parentId, key })}
                    onCloseVocab={() => setSelectedVocab(null)}
                    focusedParagraphIndices={focusedParagraphIndices}
                  />
                ) : (
                  <p className="text-sm italic text-[#1a1a1a] opacity-40">Không có passage cho phần này.</p>
                )}
              </section>

              {/* ── Question review panel ── */}
              <section className="min-h-0 overflow-y-auto bg-[#FDFCF9] p-5">
                <div>
                  {part.questionSets.map((qs) => (
                    <div key={qs.id} className="mb-6 border-2 border-[#1a1a1a] bg-[#FDFCF9] p-4 shadow-[4px_4px_0_0_#1a1a1a]">
                      <div className="interactive-question">
                        {qs.questions.map((q) => (
                          <div key={q.id} id={`review-question-${q.id}`} />
                        ))}
                        <QSetRenderer
                          qs={qs as any}
                          answers={answers}
                          onAnswer={() => {}}
                          mode="review"
                          reviewRender={(q, order) => renderInlineReview(q as NormalizedQuestion, order)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ── BOTTOM BAR: answer nav + actions ── */}
            <div className="flex shrink-0 items-center gap-2 border-t-2 border-[#1a1a1a] bg-[#FDFCF9] px-4 py-2">
              <div className="flex flex-wrap gap-1.5">
                {partSlots.map((result) => {
                  const status = !result.answered ? "skip" : result.isCorrect ? "ok" : "wrong";
                  const cls =
                    status === "ok"
                      ? "border-[#1a1a1a] bg-[#FFD700] text-[#1a1a1a] shadow-[2px_2px_0_0_#1a1a1a]"
                      : status === "wrong"
                      ? "border-[#1a1a1a] bg-[#d9381e] text-white shadow-[2px_2px_0_0_#1a1a1a]"
                      : "border-[#1a1a1a] bg-[#F5F1E9] text-[#1a1a1a] opacity-60";
                  return (
                    <button
                      key={`${result.slot.id}-${result.slot.slotIdx}`}
                      onClick={() => scrollToQuestion(result.slot.id)}
                      className={`h-7 w-7 border-2 text-xs font-bold transition-all hover:-translate-y-px ${cls}`}
                    >
                      {result.slot.order}
                    </button>
                  );
                })}
              </div>
              <div className="ml-auto flex gap-2">
                <a
                  href="/luyen-thi/ielts/reading"
                  className="border-2 border-[#1a1a1a] bg-[#1a1a1a] px-4 py-1.5 text-xs font-bold text-[#F5F1E9] shadow-[2px_2px_0_0_#1a1a1a] transition-all hover:-translate-y-px hover:shadow-[3px_3px_0_0_#1a1a1a] active:translate-y-px active:shadow-none"
                >
                  Làm bài khác
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
