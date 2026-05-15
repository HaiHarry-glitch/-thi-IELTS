"use client";

interface Props {
  order: number;
  userAnswer: string | undefined;
  correctAnswer: string;
  isCorrect: boolean;
  locateFrom: number | null;
  hasParagraphRange: boolean;
  onPlay: () => void;
  onShowLocation: () => void;
}

export default function InlineReview({
  order,
  userAnswer,
  correctAnswer,
  isCorrect,
  locateFrom,
  hasParagraphRange,
  onPlay,
  onShowLocation,
}: Props) {
  const hasAnswer = Boolean(userAnswer && userAnswer.trim());

  return (
    <span className="mx-1 inline-flex items-center gap-1.5 border-2 border-[#1a1a1a] bg-[#F5F1E9] px-2 py-0.5 align-middle text-[12px] shadow-[2px_2px_0_0_#1a1a1a]">
      {/* Play button → locate answer in audio */}
      <button
        type="button"
        onClick={onPlay}
        disabled={locateFrom == null}
        data-inline-locate-play="true"
        className={`flex h-5 w-5 items-center justify-center border-2 text-[9px] font-bold transition-all ${
          locateFrom != null
            ? "border-[#1a1a1a] bg-[#1a1a1a] text-[#F5F1E9] hover:bg-[#d9381e] hover:border-[#d9381e]"
            : "border-[#1a1a1a] border-opacity-20 bg-[#F5F1E9] text-[#1a1a1a] opacity-30 cursor-not-allowed"
        }`}
        title="Nghe vị trí đáp án"
      >
        <svg className="ml-px h-2 w-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      {/* Question number */}
      <span className="font-mono text-[10px] font-bold text-[#1a1a1a] opacity-50">{order}</span>

      {/* User answer (wrong = strikethrough, correct = bold) */}
      {hasAnswer && !isCorrect && (
        <span className="font-bold text-[#d9381e]">✕</span>
      )}
      {hasAnswer && (
        <span className={
          isCorrect
            ? "font-bold text-[#1a1a1a]"
            : "text-[#1a1a1a] opacity-40 line-through"
        }>
          {userAnswer}
        </span>
      )}

      {/* Arrow */}
      <span className="font-mono text-[#1a1a1a] opacity-30">→</span>

      {/* Correct answer */}
      <span className={`font-bold ${isCorrect ? "text-[#1a1a1a]" : "text-[#d9381e]"}`}>
        {correctAnswer || "–"}
      </span>

      {/* Locate in transcript */}
      {hasParagraphRange && (
        <button
          type="button"
          onClick={onShowLocation}
          data-inline-show-location="true"
          className="flex h-4 w-4 items-center justify-center border border-[#1a1a1a] border-opacity-30 text-[#1a1a1a] opacity-40 hover:opacity-100 hover:border-opacity-100 transition-all"
          title="Xem vị trí trong bài đọc"
        >
          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
          </svg>
        </button>
      )}
    </span>
  );
}
