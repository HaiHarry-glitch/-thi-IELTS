"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import type { Answers } from "@/components/qset/types";
import QSetRenderer from "@/components/qset/QSetRenderer";
import PassageRenderer from "@/components/PassageRenderer";
import type { LocateInfo, NormalizedQuestion, NormalizedQuiz } from "@/lib/data";
import TranscriptPlayer from "@/components/listening/TranscriptPlayer";
import ReviewAudioPlayer, { type ReviewAudioPlayerHandle } from "@/components/listening/ReviewAudioPlayer";
import InlineReview from "@/components/listening/InlineReview";
import { parseSavedAnswers } from "@/lib/answerStorage";
import { computeReviewStats } from "@/lib/reviewScoring";

const STORAGE_KEY = (id: number, skill: "reading" | "listening", fullTestKey?: string) =>
  fullTestKey ? `hin_answers_full_${skill}_${fullTestKey}` : `yp_answers_${id}`;

interface FocusedLocation {
  from: number | null;
  to: number | null;
  paragraphs: number[];
}

function locateInfoOf(q: NormalizedQuestion): LocateInfo | null {
  return q.locateInfo || null;
}

function paragraphsFromLocate(locate: LocateInfo | null): number[] {
  const ranges = locate?.paragraph_ranges || [];
  const paragraphs = new Set<number>();
  for (const range of ranges) {
    const start = range.start?.paragraph;
    const end = range.end?.paragraph ?? start;
    if (typeof start !== "number") continue;
    const first = Math.max(0, start - 1);
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

export default function ListeningReviewClient({ quiz }: { quiz: NormalizedQuiz }) {
  const audioPlayerRef = useRef<ReviewAudioPlayerHandle>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [activePart, setActivePart] = useState(0);
  const [focusedLocation, setFocusedLocation] = useState<FocusedLocation | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [focusByWord, setFocusByWord] = useState(true);
  const [activeTool, setActiveTool] = useState<ActiveTool>("highlight");
  const [selectedVocab, setSelectedVocab] = useState<{ word: string; sentenceId: number; key: string } | null>(null);

  useEffect(() => {
    const key = STORAGE_KEY(quiz.id, "listening", quiz.fullTestKey);
    const saved = localStorage.getItem(key);
    const migrated = parseSavedAnswers(saved);
    if (Object.keys(migrated).length) {
      setAnswers(migrated);
      localStorage.setItem(key, JSON.stringify(migrated));
    }
  }, [quiz.fullTestKey, quiz.id]);

  useEffect(() => {
    setAudioEl(null);
    const interval = setInterval(() => {
      const el = audioPlayerRef.current?.getAudioEl();
      if (el) {
        setAudioEl(el);
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [activePart]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
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

  function seekTo(seconds: number) {
    audioPlayerRef.current?.seek(seconds);
  }

  function showLocation(q: NormalizedQuestion) {
    const locate = locateInfoOf(q);
    const from = locate?.time_ranges?.from ?? null;
    const to = locate?.time_ranges?.to ?? null;
    const paragraphs = paragraphsFromLocate(locate);
    setFocusedLocation({ from, to, paragraphs });
    if (from != null) seekTo(from);
  }

  function scrollToQuestion(qId: number) {
    document.getElementById(`review-question-${qId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderInlineReview(q: NormalizedQuestion, order: number) {
    const locate = locateInfoOf(q);
    const from = locate?.time_ranges?.from ?? null;
    const slots = score.byQuestionId.get(q.id) ?? [];
    if (slots.length > 1) {
      return (
        <span className="inline-flex flex-wrap gap-1">
          {slots.map((result) => (
            <InlineReview
              key={`${result.slot.id}-${result.slot.slotIdx}`}
              order={result.slot.order}
              userAnswer={result.userAnswer}
              correctAnswer={result.correctAnswer}
              isCorrect={result.isCorrect}
              locateFrom={from}
              hasParagraphRange={Boolean(locate?.paragraph_ranges?.length)}
              onPlay={() => {
                if (from != null) seekTo(from);
              }}
              onShowLocation={() => showLocation(q)}
            />
          ))}
        </span>
      );
    }
    const result = slots[0];
    return (
      <InlineReview
        order={order}
        userAnswer={result?.userAnswer}
        correctAnswer={result?.correctAnswer ?? ""}
        isCorrect={Boolean(result?.isCorrect)}
        locateFrom={from}
        hasParagraphRange={Boolean(locate?.paragraph_ranges?.length)}
        onPlay={() => {
          if (from != null) seekTo(from);
        }}
        onShowLocation={() => showLocation(q)}
      />
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#F5F1E9] text-[#1a1a1a]" style={{ fontFamily: "var(--font-inter, Arial, sans-serif)" }}>
      <div className="flex h-full flex-col">

        {/* ── HIN TOP NAV ── */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b-2 border-[#1a1a1a] bg-[#F5F1E9] px-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-1 shrink-0">
            <span className="font-display text-xl font-black tracking-tight text-[#1a1a1a]">HIN</span>
            <span className="font-display text-xl font-black tracking-tight text-[#d9381e]">·</span>
            <span className="font-mono text-[10px] font-bold text-[#1a1a1a] opacity-60 leading-none">NAVIGATOR</span>
          </a>
          {/* Back to library */}
          <a
            href="/luyen-thi/ielts/listening"
            className="flex items-center gap-1.5 border-2 border-[#1a1a1a] bg-[#F5F1E9] px-3 py-1 text-xs font-bold text-[#1a1a1a] shadow-[2px_2px_0_0_#1a1a1a] transition-all hover:-translate-y-px hover:shadow-[3px_3px_0_0_#1a1a1a] active:translate-y-px active:shadow-none"
          >
            ← Thư viện
          </a>
          {/* Breadcrumb */}
          <span className="font-mono text-[11px] text-[#1a1a1a] opacity-40">// LISTENING · REVIEW</span>
          {/* Score badge */}
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
          {/* Close / timer */}
          <a
            href="/luyen-thi/ielts/listening"
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
              tooltip="Chế độ theo dõi âm thanh. Câu đang phát sẽ được highlight theo. Bấm vào câu để nhảy tới giây đó."
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
              tooltip="Chế độ tra từ vựng. Click vào bất kỳ từ nào trong transcript để xem nghĩa, IPA, ví dụ và dịch cả câu."
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
            {/* Part tabs */}
            {quiz.parts.length > 1 && (
              <div className="flex h-10 shrink-0 items-center gap-2 border-b-2 border-[#1a1a1a] bg-[#FDFCF9] px-4">
                {quiz.parts.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActivePart(idx);
                      setFocusedLocation(null);
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
              {/* Transcript panel */}
              <section className="min-h-0 overflow-y-auto border-r-2 border-[#1a1a1a] bg-[#F5F1E9] p-6">
                <div>
                  <div className="mb-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setFocusByWord((value) => !value)}
                      className="flex cursor-pointer items-center gap-2 text-xs font-mono text-[#1a1a1a]"
                    >
                      <span>Focus theo từ</span>
                      <span className={`flex h-5 w-9 border-2 border-[#1a1a1a] p-0.5 transition ${focusByWord ? "bg-[#1a1a1a]" : "bg-[#F5F1E9]"}`}>
                        <span className={`h-3.5 w-3.5 bg-[#F5F1E9] border border-[#1a1a1a] transition ${focusByWord ? "translate-x-4" : ""}`} />
                      </span>
                    </button>
                  </div>
                  {part.title && (
                    <h2 className="mb-4 text-center font-display text-lg font-bold text-[#1a1a1a]">{part.title}</h2>
                  )}
                  {part.transcriptSegments?.length ? (
                    <TranscriptPlayer
                      segments={part.transcriptSegments}
                      audioEl={audioEl}
                      onSeek={seekTo}
                      focusedLocation={focusedLocation}
                      focusByWord={focusByWord}
                      vocabMode={activeTool === "vocab"}
                      selectedVocab={selectedVocab}
                      onWordClick={(word, sentenceId, key) => setSelectedVocab({ word, sentenceId, key })}
                      onCloseVocab={() => setSelectedVocab(null)}
                    />
                  ) : part.transcriptHtml ? (
                    <div className="text-[13px] leading-6">
                      <PassageRenderer html={part.transcriptHtml} />
                    </div>
                  ) : (
                    <p className="text-sm italic text-[#1a1a1a] opacity-40">Không có transcript cho phần này.</p>
                  )}
                </div>
              </section>

              {/* Question review panel */}
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
                  href={`/practice/listening/${quiz.id}/result`}
                  className="border-2 border-[#1a1a1a] bg-[#F5F1E9] px-4 py-1.5 text-xs font-bold text-[#1a1a1a] shadow-[2px_2px_0_0_#1a1a1a] transition-all hover:-translate-y-px hover:shadow-[3px_3px_0_0_#1a1a1a] active:translate-y-px active:shadow-none"
                >
                  Xem lịch sử làm bài
                </a>
                <a
                  href="/luyen-thi/ielts/listening"
                  className="border-2 border-[#1a1a1a] bg-[#1a1a1a] px-4 py-1.5 text-xs font-bold text-[#F5F1E9] shadow-[2px_2px_0_0_#1a1a1a] transition-all hover:-translate-y-px hover:shadow-[3px_3px_0_0_#1a1a1a] active:translate-y-px active:shadow-none"
                >
                  Làm bài khác
                </a>
              </div>
            </div>
          </main>
        </div>

        {part.audioUrl && <ReviewAudioPlayer key={part.audioUrl} ref={audioPlayerRef} src={part.audioUrl} />}
      </div>
    </div>
  );
}
