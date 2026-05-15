"use client";

import { useEffect, useState } from "react";

export type ExamMode = "fullscreen" | "normal";

interface Props {
  isOpen: boolean;
  quizTitle: string;
  durationMin: number;
  totalQ: number;
  subject: "reading" | "listening";
  onSelect: (mode: ExamMode) => void;
}

export default function ExamModeDialog({
  isOpen,
  quizTitle,
  durationMin,
  totalQ,
  subject,
  onSelect,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);

  useEffect(() => {
    const mobile =
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      window.innerWidth < 768;
    setIsMobile(mobile);
    setCanFullscreen(!mobile && !!document.documentElement.requestFullscreen);
  }, []);

  if (!isOpen) return null;

  const subjectLabel = subject === "reading" ? "Reading" : "Listening";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1a1a1a]/70 backdrop-blur-sm">
      <div
        className="w-full max-w-md border-2 border-[#1a1a1a] bg-[#F5F1E9] shadow-[8px_8px_0_0_#1a1a1a]"
        style={{ fontFamily: "var(--font-inter, Arial, sans-serif)" }}
      >
        {/* Header */}
        <div className="border-b-2 border-[#1a1a1a] bg-[#1a1a1a] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-black tracking-tight text-[#F5F1E9]">
              HIN
            </span>
            <span className="font-display text-base font-black text-[#d9381e]">·</span>
            <span className="font-mono text-[10px] font-bold text-[#F5F1E9] opacity-60">
              {subjectLabel.toUpperCase()} · EXAM MODE
            </span>
          </div>
        </div>

        <div className="p-5">
          {/* Quiz info */}
          <div className="mb-4 border-l-4 border-[#d9381e] pl-3">
            <div className="font-mono text-[10px] font-bold uppercase text-[#1a1a1a] opacity-50">
              Đề thi
            </div>
            <div className="mt-0.5 text-sm font-bold text-[#1a1a1a] leading-snug line-clamp-2">
              {quizTitle}
            </div>
            <div className="mt-1 font-mono text-[11px] text-[#1a1a1a] opacity-60">
              {totalQ} câu · {durationMin} phút
            </div>
          </div>

          <p className="mb-4 text-[13px] text-[#1a1a1a] opacity-80">
            Chọn chế độ làm bài:
          </p>

          <div className="flex flex-col gap-3">
            {/* Fullscreen mode */}
            {canFullscreen ? (
              <button
                onClick={() => onSelect("fullscreen")}
                className="group relative w-full border-2 border-[#1a1a1a] bg-[#F5F1E9] p-4 text-left shadow-[3px_3px_0_0_#1a1a1a] transition-all hover:-translate-y-0.5 hover:bg-[#FFD700] hover:shadow-[4px_4px_0_0_#1a1a1a] active:translate-y-0 active:shadow-none"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none">⛶</span>
                  <div className="flex-1">
                    <div className="font-bold text-[13px] text-[#1a1a1a]">
                      Chế độ thi 100%
                    </div>
                    <div className="mt-1 text-[11px] text-[#1a1a1a] opacity-70 leading-relaxed">
                      Toàn màn hình · Không thể thoát giữa chừng
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="inline-flex items-center gap-1 border border-[#d9381e] px-2 py-0.5 text-[10px] font-bold text-[#d9381e]">
                        ⚠ Thoát toàn màn hình = hủy bài làm
                      </span>
                      <span className="inline-flex items-center gap-1 border border-[#1a1a1a] border-opacity-40 px-2 py-0.5 text-[10px] font-bold text-[#1a1a1a] opacity-70">
                        ✉ Yêu cầu Gmail + Lớp
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ) : (
              <div className="w-full border-2 border-[#1a1a1a] border-opacity-20 bg-[#F5F1E9] p-4 opacity-40">
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none">⛶</span>
                  <div className="flex-1">
                    <div className="font-bold text-[13px] text-[#1a1a1a]">
                      Chế độ thi 100%
                    </div>
                    <div className="mt-1 text-[11px] text-[#1a1a1a] leading-relaxed">
                      {isMobile
                        ? "📱 Không khả dụng trên điện thoại / máy tính bảng"
                        : "Trình duyệt không hỗ trợ toàn màn hình"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Normal mode */}
            <button
              onClick={() => onSelect("normal")}
              className="group w-full border-2 border-[#1a1a1a] bg-[#F5F1E9] p-4 text-left shadow-[3px_3px_0_0_#1a1a1a] transition-all hover:-translate-y-0.5 hover:bg-[#e4e4e4] hover:shadow-[4px_4px_0_0_#1a1a1a] active:translate-y-0 active:shadow-none"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none">📝</span>
                <div className="flex-1">
                  <div className="font-bold text-[13px] text-[#1a1a1a]">
                    Chế độ luyện tập
                  </div>
                  <div className="mt-1 text-[11px] text-[#1a1a1a] opacity-70 leading-relaxed">
                    Cửa sổ bình thường · Tự do, không cần đăng nhập
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 border border-[#1a1a1a] border-opacity-30 px-2 py-0.5 text-[10px] font-bold text-[#1a1a1a] opacity-60">
                    ✓ Ai cũng có thể làm
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Note */}
          <div className="mt-4 border-t border-[#1a1a1a] border-opacity-10 pt-3 font-mono text-[10px] text-[#1a1a1a] opacity-40 leading-relaxed">
            * Chế độ thi 100% chỉ khả dụng trên máy tính (desktop/laptop).
            {isMobile && (
              <> Bạn đang dùng thiết bị di động — chỉ có chế độ luyện tập thường.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
