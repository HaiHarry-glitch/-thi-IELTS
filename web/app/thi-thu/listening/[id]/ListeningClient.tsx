"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedQuiz } from "@/lib/data";
import type { Answers } from "@/components/qset/types";
import QSetRenderer from "@/components/qset/QSetRenderer";
import PassageRenderer from "@/components/PassageRenderer";
import ResizableSplit from "@/components/ResizableSplit";
import HighlightLayer from "@/components/HighlightLayer";
import { HighlightsProvider } from "@/components/HighlightsStore";
import NotesPanel from "@/components/NotesPanel";
import { NotesProvider, useNotes } from "@/components/NotesContext";
import AudioPlayer, { type AudioPlayerHandle } from "@/components/AudioPlayer";
import ExamModeDialog from "@/components/ExamModeDialog";
import FullscreenWarning from "@/components/FullscreenWarning";
import LoginModal from "@/components/LoginModal";
import { cleanTitle } from "@/lib/title";
import { uuid } from "@/lib/uuid";
import type { StudentInfo } from "@/lib/student";
import { EventBuffer, buildAttemptPayload, submitAttempt } from "@/lib/tracking";
import { expandQuestion } from "@/lib/expandQuestions";
import { parseSavedAnswers } from "@/lib/answerStorage";

const STORAGE_KEY = (id: number, fullTestKey?: string) =>
  fullTestKey ? `hin_answers_full_listening_${fullTestKey}` : `yp_answers_${id}`;
type ExamMode = "exam" | "review";
type AudioPhase = "idle" | "playing" | "gap" | "done";

export default function ListeningClient({
  quiz,
  mode = "exam",
  isFullTest = false,
  fullTestKey,
}: {
  quiz: NormalizedQuiz;
  mode?: ExamMode;
  isFullTest?: boolean;
  fullTestKey?: string;
}) {
  return (
    <NotesProvider quizId={quiz.id}>
      <HighlightsProvider storageKey={`hin_highlights_listening_${fullTestKey ?? quiz.id}`}>
        <ListeningInner quiz={quiz} mode={mode} isFullTest={isFullTest} fullTestKey={fullTestKey} />
      </HighlightsProvider>
    </NotesProvider>
  );
}

function ListeningInner({
  quiz,
  mode,
  isFullTest,
  fullTestKey,
}: {
  quiz: NormalizedQuiz;
  mode: ExamMode;
  isFullTest: boolean;
  fullTestKey?: string;
}) {
  const isReview = mode === "review";
  const notesCtx = useNotes();
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});

  // Exam mode dialog + fullscreen (only for exam)
  const [showModeDialog, setShowModeDialog] = useState(!isReview);
  const [examStarted, setExamStarted] = useState(isReview);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);

  // Practice-mode login + tracking
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const trackingRef = useRef<EventBuffer | null>(null);
  const attemptIdRef = useRef<string>(uuid());
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);
  const audioTimeRef = useRef<number>(0); // updated by AudioPlayer via callback
  const sectionAdvanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioStartedPartsRef = useRef<Set<number>>(new Set());
  const [audioPart, setAudioPart] = useState(0);
  const [audioPhase, setAudioPhase] = useState<AudioPhase>("idle");
  const [audioResetToken, setAudioResetToken] = useState(0);
  const [sectionAdvanceCountdown, setSectionAdvanceCountdown] = useState<number | null>(null);

  function handleModeSelect(selectedMode: "fullscreen" | "normal") {
    setShowModeDialog(false);
    if (selectedMode === "fullscreen") {
      // Fullscreen = chế độ thi → yêu cầu login + tracking
      setIsFullscreenMode(true);
      setShowLoginModal(true);
    } else {
      // Normal = luyện tập tự do, không cần login
      setExamStarted(true);
    }
  }

  function handleLoginSuccess(studentInfo: StudentInfo) {
    setStudent(studentInfo);
    setShowLoginModal(false);
    setExamStarted(true);
    // Fullscreen is already entered inside LoginModal (within the click gesture).
    trackingRef.current = new EventBuffer();
    trackingRef.current.push("exam_start");
  }

  function handleReturnFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setShowFullscreenWarning(false);
  }

  function handleCancelExam() {
    // Exit fullscreen
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    // Clear saved answers
    localStorage.removeItem(STORAGE_KEY(quiz.id, fullTestKey));
    // Stop timer
    clearInterval(timerRef.current!);
    if (sectionAdvanceTimerRef.current) {
      clearInterval(sectionAdvanceTimerRef.current);
      sectionAdvanceTimerRef.current = null;
    }
    audioPlayerRef.current?.pause();
    // Reset all exam state → shows ExamModeDialog again
    setShowFullscreenWarning(false);
    setAnswers({});
    setSubmitted(false);
    setTimeLeft(quiz.durationMin * 60);
    setAudioPart(0);
    setAudioPhase("idle");
    setAudioResetToken((value) => value + 1);
    setSectionAdvanceCountdown(null);
    audioTimeRef.current = 0;
    audioStartedPartsRef.current = new Set();
    setStudent(null);
    setIsFullscreenMode(false);
    setExamStarted(false);
    setShowModeDialog(true);
    trackingRef.current = null;
    attemptIdRef.current = uuid();
  }

  const [activePart, setActivePart] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.durationMin * 60);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isFullscreenMode || submitted || isReview) return;
    function onFsChange() {
      const isFull = !!document.fullscreenElement;
      if (!isFull) setShowFullscreenWarning(true);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [isFullscreenMode, submitted, isReview]);

  const allQuestions = quiz.parts.flatMap((p) => p.questionSets.flatMap((qs) => qs.questions));
  const totalQ = allQuestions.length;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY(quiz.id, fullTestKey));
    const migrated = parseSavedAnswers(saved);
    if (Object.keys(migrated).length) {
      setAnswers(migrated);
      localStorage.setItem(STORAGE_KEY(quiz.id, fullTestKey), JSON.stringify(migrated));
    }
  }, [quiz.id, fullTestKey]);

  useEffect(() => {
    if (submitted || isReview || !examStarted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          doSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, isReview, examStarted]);

  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  function handleAnswer(qId: number, val: string | string[]) {
    setAnswers((prev) => {
      // Track event with audio position (key for listening analytics)
      if (trackingRef.current) {
        const prev_val = prev[qId];
        const from = Array.isArray(prev_val) ? prev_val.join("|") : (prev_val ?? "");
        const to   = Array.isArray(val) ? val.join("|") : val;
        trackingRef.current.push("answer_change", qId, {
          from, to,
          audioTime: audioTimeRef.current, // seconds into audio when answer was changed
        });
      }
      const next = { ...prev, [qId]: val };
      localStorage.setItem(STORAGE_KEY(quiz.id, fullTestKey), JSON.stringify(next));
      return next;
    });
  }

  // Track tab hidden (only for practice/login mode)
  useEffect(() => {
    if (!student) return;
    function onVisChange() {
      if (document.hidden && trackingRef.current) {
        trackingRef.current.push("tab_hidden", undefined, { audioTime: audioTimeRef.current });
      }
    }
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [student]);

  function doSubmit() {
    clearInterval(timerRef.current!);
    if (sectionAdvanceTimerRef.current) {
      clearInterval(sectionAdvanceTimerRef.current);
      sectionAdvanceTimerRef.current = null;
    }
    audioPlayerRef.current?.pause();
    setSubmitted(true);
    localStorage.setItem(STORAGE_KEY(quiz.id, fullTestKey), JSON.stringify(answersRef.current));

    // Send tracking if student is logged in (practice mode)
    if (student && trackingRef.current) {
      trackingRef.current.push("submit", undefined, { audioTime: audioTimeRef.current });
      const durationSec = Math.round(
        (Date.now() - trackingRef.current.startMs) / 1000,
      );
      const payload = buildAttemptPayload({
        attemptId: attemptIdRef.current,
        student,
        quizId: quiz.id,
        quizTitle: cleanTitle(quiz.title),
        skill: "listening",
        startedAt: trackingRef.current.startedAt,
        durationSec,
        fullTestKey,
        answers: answersRef.current as Record<number, string | string[]>,
        parts: quiz.parts,
        events: trackingRef.current.drain(),
      });
      submitAttempt(payload).catch(() => {});
    }

    router.push(isFullTest && fullTestKey
      ? `/practice/full/listening/${fullTestKey}/result`
      : `/practice/listening/${quiz.id}/result`
    );
  }

  const minutesLeft = Math.floor(timeLeft / 60);

  function scrollToQuestion(qId: number) {
    const el = document.getElementById(`question-${qId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const qOrder: Record<number, number> = {};
  for (const p of quiz.parts) {
    for (const qs of p.questionSets) {
      for (const q of qs.questions) qOrder[q.id] = (q as any).order ?? 0;
    }
  }

  const partSlotOrders = (quiz.parts[activePart]?.questionSets ?? []).flatMap((qs) =>
    qs.questions.flatMap((q: any) => expandQuestion(q, qs.maxSelections).map((s) => s.order)),
  ).filter((n) => n > 0);
  const partStart = partSlotOrders.length ? Math.min(...partSlotOrders) : 1;
  const partEnd = partSlotOrders.length ? Math.max(...partSlotOrders) : totalQ;
  const partInstruction = `Read the text and answer questions ${partStart}-${partEnd}`;

  const currentPart = quiz.parts[activePart];
  const audioSection = quiz.parts[audioPart] ?? quiz.parts[0];
  const singleQuizPartLabel = currentPart?.title || `Questions ${partStart}-${partEnd}`;
  const activePartLabel = quiz.fullTestKey || quiz.parts.length > 1 ? `Part ${activePart + 1}` : singleQuizPartLabel;
  const reviewAudioSrc = (currentPart?.audioUrl as string | null | undefined) ?? null;
  const examAudioSrc = (audioSection?.audioUrl as string | null | undefined) ?? null;
  const fullTestAudioUrls = quiz.parts.map((part) => part.audioUrl).filter(Boolean);
  const fullTestUsesSharedAudio = isFullTest && new Set(fullTestAudioUrls).size === 1;
  const examListenFrom = fullTestUsesSharedAudio ? audioSection?.listenFrom ?? null : null;
  const examListenTo = fullTestUsesSharedAudio ? audioSection?.listenTo ?? null : null;

  useEffect(() => {
    return () => {
      if (sectionAdvanceTimerRef.current) clearInterval(sectionAdvanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    audioTimeRef.current = examListenFrom ?? 0;
  }, [audioPart, examListenFrom]);

  function handleExamAudioStart() {
    setAudioPhase("playing");
    if (!audioStartedPartsRef.current.has(audioPart)) {
      audioStartedPartsRef.current.add(audioPart);
      trackingRef.current?.push("audio_start", undefined, { part: audioPart + 1 });
    }
  }

  function handleExamAudioEnd() {
    trackingRef.current?.push("audio_end", undefined, { audioTime: audioTimeRef.current, part: audioPart + 1 });
    if (!isFullTest || isReview || audioPart >= quiz.parts.length - 1) {
      setAudioPhase("done");
      return;
    }

    setAudioPhase("gap");
    setSectionAdvanceCountdown(30);
    let remaining = 30;
    sectionAdvanceTimerRef.current = setInterval(() => {
      remaining -= 1;
      setSectionAdvanceCountdown(remaining);
      if (remaining <= 0 && sectionAdvanceTimerRef.current) {
        clearInterval(sectionAdvanceTimerRef.current);
        sectionAdvanceTimerRef.current = null;
        setSectionAdvanceCountdown(null);
        const nextPart = Math.min(quiz.parts.length - 1, audioPart + 1);
        setAudioPart(nextPart);
        setAudioPhase("playing");
        setActivePart(nextPart);
      }
    }, 1000);
  }

  const audioStatus =
    audioPhase === "gap"
      ? `Section ${audioPart + 1} da ket thuc. Section ${audioPart + 2} se tu bat dau sau ${sectionAdvanceCountdown ?? 30}s.`
      : audioPhase === "done"
      ? "Audio da ket thuc"
      : audioPhase === "playing"
      ? `Dang phat Section ${audioPart + 1}`
      : "Audio san sang";

  // Review-mode stats: count correct / wrong / skipped across all questions
  let nCorrect = 0, nWrong = 0, nSkipped = 0;
  if (isReview) {
    for (const p of quiz.parts) {
      for (const qs of p.questionSets) {
        for (const q of qs.questions) {
          const ua = answers[q.id];
          const has = ua !== undefined && ua !== "" && !(Array.isArray(ua) && ua.length === 0);
          if (!has) { nSkipped++; continue; }
          const correct = (q as any).correctAnswers && (q as any).correctAnswers.length > 0
            ? (q as any).correctAnswers
            : (q as any).correctAnswer;
          if (!correct) { nSkipped++; continue; }
          const u = (Array.isArray(ua) ? ua[0] : ua).toString().trim().toLowerCase();
          const matches = Array.isArray(correct)
            ? correct.some((c: string) => c.trim().toLowerCase() === u)
            : (correct as string).trim().toLowerCase() === u;
          if (matches) nCorrect++; else nWrong++;
        }
      }
    }
  }
  const totalReviewQ = nCorrect + nWrong + nSkipped;

  const allQuestionsForDialog = quiz.parts.flatMap((p) => p.questionSets.flatMap((qs) => qs.questions));
  const totalSlotsForDialog = quiz.parts.reduce(
    (sum, part) => sum + part.questionSets.reduce(
      (partSum, qs) => partSum + qs.questions.reduce(
        (qSum, q) => qSum + expandQuestion(q, qs.maxSelections).length,
        0,
      ),
      0,
    ),
    0,
  );

  return (
    <>
      <ExamModeDialog
        isOpen={showModeDialog}
        quizTitle={cleanTitle(quiz.title)}
        durationMin={quiz.durationMin}
        totalQ={totalSlotsForDialog}
        subject="listening"
        onSelect={handleModeSelect}
      />
      <FullscreenWarning
        isOpen={showFullscreenWarning}
        onReturnFullscreen={handleReturnFullscreen}
        onCancel={handleCancelExam}
      />
      <LoginModal
        isOpen={showLoginModal}
        quizTitle={cleanTitle(quiz.title)}
        subject="listening"
        enterFullscreenOnSuccess={isFullscreenMode}
        onSuccess={handleLoginSuccess}
      />
    <div className={`h-screen flex bg-white overflow-hidden text-[#000] ${!examStarted ? "invisible" : ""}`}>
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="border-b border-[#c1c1c1] shrink-0">
          <div className="flex w-full items-center duration-200">
            <a className="p-4 py-3.5" href="/luyen-thi/ielts/listening">
              <img className="h-8 w-auto" alt="HIN" src="/logo-power.svg?v=hin-1" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </a>
            <div className="px-4">
              <div className="font-bold">{cleanTitle(quiz.title)}</div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" /></svg>
                <span className="text-sm">{minutesLeft} minutes remaining</span>
              </div>
            </div>
            <div className="ml-auto h-full hidden md:flex items-center gap-2 mr-2">
              <button className="h-full aspect-square p-2 flex items-center justify-center hover:bg-black/5 duration-200">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3C7.5 3 3.4 4.7 0 7.5l12 14.5L24 7.5C20.6 4.7 16.5 3 12 3z" /></svg>
              </button>
              <button className="h-full aspect-square p-2 flex items-center justify-center hover:bg-black/5 duration-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </button>
              <button
                onClick={() => notesCtx.setPanelOpen(!notesCtx.panelOpen)}
                className={`h-full aspect-square p-2 flex items-center justify-center hover:bg-black/5 duration-200 ${notesCtx.panelOpen ? 'bg-black/5' : ''}`}
                title="Notes"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Sub-header — different for review vs exam */}
        {isReview ? (
          <div className="border-b border-[#c1c1c1] bg-[#a4d8a4] shrink-0 flex items-center px-4 py-2 gap-6 text-sm">
            <div className="font-bold">{nCorrect}/{totalReviewQ} câu đúng</div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-600 inline-block" />
              <span>Đúng: <strong>{nCorrect}</strong></span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span>Sai: <strong>{nWrong}</strong></span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
              <span>Bỏ qua: <strong>{nSkipped}</strong></span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button className="px-3 py-1 hover:bg-black/5 rounded">📝 Xem note</button>
              <button className="px-3 py-1 hover:bg-black/5 rounded">⚙️ Cài đặt</button>
            </div>
          </div>
        ) : (
          <div className="m-4 mb-0 p-4 bg-[#f1f2ec] border border-[#d5d5d5] rounded-[4px] shrink-0">
            <div className="font-black">{activePartLabel}</div>
            <div>{partInstruction}</div>
          </div>
        )}

        {/* Content area */}
        {isReview ? (
          // Review: split panel transcript | questions, audio at bottom
          <>
            <div className="flex-1 flex overflow-hidden px-4 md:px-8 pb-2 mt-4">
              <ResizableSplit
                left={
                  <HighlightLayer partIdx={activePart} containerKey="transcript">
                    <div className="md:pr-3 pt-2">
                      {currentPart?.title && (
                        <h2 className="text-center font-bold text-xl mb-4">{currentPart.title}</h2>
                      )}
                      <div className="text-sm font-semibold text-gray-500 mb-2">Transcript</div>
                      {currentPart?.transcriptHtml ? (
                        <PassageRenderer html={currentPart.transcriptHtml} />
                      ) : (
                        <p className="text-gray-400 italic">Không có transcript cho phần này.</p>
                      )}
                    </div>
                  </HighlightLayer>
                }
                right={
                  <div className="interactive-question md:pt-2 pt-2 md:pl-3">
                    {currentPart?.questionSets.map((qs) => (
                      <div key={qs.id} className="mb-8">
                        {qs.questions.map((q) => (
                          <div key={q.id} id={`q-${q.id}`} />
                        ))}
                        <QSetRenderer qs={qs as any} answers={answers} onAnswer={handleAnswer} mode={mode} />
                      </div>
                    ))}
                  </div>
                }
              />
            </div>
            {reviewAudioSrc && <AudioPlayer src={reviewAudioSrc} mode="review" />}
          </>
        ) : (
          // Exam: single column questions with audio gate overlay on top
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 overflow-y-auto px-4 md:px-8 pb-4 mt-4">
              <HighlightLayer partIdx={activePart} containerKey="questions">
                <div className="max-w-4xl mx-auto interactive-question">
                  {currentPart?.questionSets.map((qs) => (
                    <div key={qs.id} className="mb-8">
                      {qs.questions.map((q) => (
                        <div key={q.id} id={`q-${q.id}`} />
                      ))}
                      <QSetRenderer qs={qs as any} answers={answers} onAnswer={handleAnswer} mode={mode} />
                    </div>
                  ))}
                </div>
              </HighlightLayer>
            </div>
            {examAudioSrc && (
              <AudioPlayer
                key={`exam-audio-${audioResetToken}`}
                ref={audioPlayerRef}
                src={examAudioSrc}
                mode="exam"
                autoStart={audioPart > 0 && audioPhase === "playing"}
                listenFrom={examListenFrom}
                listenTo={examListenTo}
                onTimeUpdate={(t) => { audioTimeRef.current = t; }}
                onAudioStart={handleExamAudioStart}
                onAudioEnd={handleExamAudioEnd}
              />
            )}

          </div>
        )}

        {/* Bottom tab bar */}
        <div className="bg-[#f0f0f0] w-full relative shrink-0 border-t border-[#c1c1c1]">
          <div className="absolute z-20 bottom-full mb-4 right-6 flex items-center gap-2">
            <button
              disabled={activePart === 0}
              onClick={() => setActivePart((i) => Math.max(0, i - 1))}
              className="cursor-pointer md:h-14 md:w-14 h-8 w-8 rounded-[4px] bg-[#4c4c4c] hover:bg-[#000] flex items-center justify-center disabled:opacity-30 shadow-md"
            >
              <svg className="w-8 h-8 stroke-white" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <button
              disabled={activePart >= quiz.parts.length - 1}
              onClick={() => setActivePart((i) => Math.min(quiz.parts.length - 1, i + 1))}
              className="cursor-pointer md:h-14 md:w-14 h-8 w-8 rounded-[4px] bg-[#000] hover:bg-[#4c4c4c] flex items-center justify-center disabled:opacity-30 shadow-md"
            >
              <svg className="w-8 h-8 stroke-white" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          {/* Tab strip + submit */}
          <div className="flex overflow-auto items-stretch h-[60px]">
            {quiz.parts.map((part, idx) => {
              const pSlots = part.questionSets.flatMap((qs) =>
                qs.questions.flatMap((q: any) => expandQuestion(q, qs.maxSelections)),
              );
              const isActive = idx === activePart;
              const totalSlots = pSlots.length;
              const answeredCount = pSlots.filter((slot) => {
                const ans = answers[slot.id];
                const userArr = Array.isArray(ans) ? ans : ans ? [String(ans)] : [];
                return slot.isMultiSlot
                  ? userArr.length > slot.slotIdx
                  : (ans && !(Array.isArray(ans) && ans.length === 0) && ans !== "");
              }).length;
              const isComplete = answeredCount === totalSlots && totalSlots > 0;

              return (
                <div
                  key={part.id}
                  className={`flex items-center px-4 md:px-6 cursor-pointer border-r border-[#c1c1c1] ${isActive ? "flex-1 bg-white" : "hover:bg-[#e5e5e5]"}`}
                  onClick={() => setActivePart(idx)}
                >
                  <div className="whitespace-nowrap flex items-center gap-2 shrink-0">
                    {isComplete && !isActive && (
                      <svg className="w-5 h-5 stroke-[#22c55e]" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <span className="font-bold text-[#000]">
                      {idx === audioPart && !isReview && audioPhase !== "idle" && (
                        <svg className="mr-1 inline h-4 w-4 align-[-2px]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
                        </svg>
                      )}
                      {quiz.fullTestKey || quiz.parts.length > 1 ? `Part ${idx + 1}` : (part.title || `Questions ${partStart}-${partEnd}`)}
                    </span>
                    
                    {!isActive && (
                      <span className="text-[#666] text-[15px] ml-1">
                        {answeredCount} of {totalSlots}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-2 overflow-x-auto ml-6 scrollbar-hide py-2">
                      {pSlots.map((slot) => {
                        const ans = answers[slot.id];
                        const userArr = Array.isArray(ans) ? ans : ans ? [String(ans)] : [];
                        const hasAns = slot.isMultiSlot
                          ? userArr.length > slot.slotIdx
                          : (ans && !(Array.isArray(ans) && ans.length === 0) && ans !== "");
                        return (
                          <button
                            key={`${slot.id}-${slot.slotIdx}`}
                            onClick={(e) => { e.stopPropagation(); setActivePart(idx); setTimeout(() => scrollToQuestion(slot.id), 50); }}
                            className={`cursor-pointer whitespace-nowrap min-w-[28px] h-[28px] px-1 text-[15px] transition-all flex items-center justify-center rounded-[2px] ${
                              hasAns
                                ? "text-[#000] underline underline-offset-[5px] decoration-2 decoration-black font-semibold"
                                : "text-[#000] hover:underline"
                            }`}
                          >
                            {slot.order}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Submit check (gray) */}
            <button
              onClick={doSubmit}
              className="hidden md:flex px-6 bg-[#f0f0f0] hover:bg-[#e5e5e5] border-l border-[#c1c1c1] cursor-pointer items-center justify-center shrink-0 transition-colors"
              title="Nộp bài"
            >
              <svg className="w-6 h-6 stroke-[#333]" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <NotesPanel />
    </div>
    </>
  );
}
