"use client";

interface Props {
  order: number;
  userAnswer: string | undefined;
  correctAnswer: string;
  isCorrect: boolean;
  hasParagraphRange: boolean;
  onLocate: () => void;
}

export default function InlineReviewReading({
  order,
  userAnswer,
  correctAnswer,
  isCorrect,
  hasParagraphRange,
  onLocate,
}: Props) {
  const hasAnswer = Boolean(userAnswer && userAnswer.trim());

  return (
    <span className="mx-1 inline-flex items-center gap-1.5 border-2 border-[#1a1a1a] bg-[#F5F1E9] px-2 py-0.5 align-middle text-[12px] shadow-[2px_2px_0_0_#1a1a1a]">
      {/* Locate button → scroll to paragraph */}
      <button
        type="button"
        onClick={onLocate}
        disabled={!hasParagraphRange}
        data-inline-locate="true"
        className={`flex h-5 w-5 items-center justify-center border-2 text-[9px] font-bold transition-all ${
          hasParagraphRange
            ? "border-[#1a1a1a] bg-[#1a1a1a] text-[#F5F1E9] hover:bg-[#d9381e] hover:border-[#d9381e]"
            : "border-[#1a1a1a] border-opacity-20 bg-[#F5F1E9] text-[#1a1a1a] opacity-30 cursor-not-allowed"
        }`}
        title="Tìm vị trí trong bài đọc"
      >
        {/* Pin / locate icon */}
        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
        </svg>
      </button>

      {/* Question number */}
      <span className="font-mono text-[10px] font-bold text-[#1a1a1a] opacity-50">{order}</span>

      {/* User answer */}
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
    </span>
  );
}
