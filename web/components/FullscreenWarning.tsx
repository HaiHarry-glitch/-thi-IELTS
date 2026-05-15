"use client";

interface Props {
  isOpen: boolean;
  onReturnFullscreen: () => void;
  onCancel: () => void;
}

/**
 * Shown when user exits fullscreen mid-exam.
 * Options: go back to fullscreen, or cancel (reset) the exam.
 */
export default function FullscreenWarning({ isOpen, onReturnFullscreen, onCancel }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1a1a1a]/80 backdrop-blur-sm">
      <div
        className="w-full max-w-sm border-2 border-[#d9381e] bg-[#F5F1E9] shadow-[8px_8px_0_0_#d9381e]"
        style={{ fontFamily: "var(--font-inter, Arial, sans-serif)" }}
      >
        {/* Header */}
        <div className="border-b-2 border-[#d9381e] bg-[#d9381e] px-5 py-3">
          <div className="font-mono text-[11px] font-bold text-white">
            ⚠ CẢNH BÁO · THOÁT TOÀN MÀN HÌNH
          </div>
        </div>

        <div className="p-5">
          <p className="text-[13px] font-bold text-[#1a1a1a] mb-2">
            Bạn đã thoát khỏi chế độ toàn màn hình!
          </p>
          <p className="text-[12px] text-[#1a1a1a] opacity-70 mb-5 leading-relaxed">
            Trong chế độ thi 100%, việc thoát toàn màn hình sẽ{" "}
            <span className="font-bold text-[#d9381e]">hủy toàn bộ bài làm</span>.
            Quay lại toàn màn hình ngay để tiếp tục.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={onReturnFullscreen}
              className="w-full border-2 border-[#1a1a1a] bg-[#FFD700] px-4 py-3 text-[13px] font-bold text-[#1a1a1a] shadow-[3px_3px_0_0_#1a1a1a] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#1a1a1a] active:translate-y-0 active:shadow-none"
            >
              ⛶ Quay lại toàn màn hình
            </button>
            <button
              onClick={onCancel}
              className="w-full border-2 border-[#d9381e] bg-[#F5F1E9] px-4 py-3 text-[13px] font-bold text-[#d9381e] shadow-[3px_3px_0_0_#d9381e] transition-all hover:-translate-y-0.5 hover:bg-[#d9381e] hover:text-white hover:shadow-[4px_4px_0_0_#d9381e] active:translate-y-0 active:shadow-none"
            >
              Hủy bài · Làm lại từ đầu
            </button>
          </div>

          <div className="mt-4 font-mono text-[10px] text-[#1a1a1a] opacity-40 leading-relaxed">
            * Hủy bài sẽ xóa toàn bộ đáp án và đưa bạn về trang chọn đề.
          </div>
        </div>
      </div>
    </div>
  );
}
