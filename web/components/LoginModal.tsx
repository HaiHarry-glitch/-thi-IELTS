"use client";

import { useState } from "react";
import type { StudentInfo } from "@/lib/student";
import { lookupStudent, setCachedStudent } from "@/lib/student";

interface Props {
  isOpen: boolean;
  quizTitle: string;
  subject: "reading" | "listening";
  enterFullscreenOnSuccess?: boolean;
  onSuccess: (student: StudentInfo) => void;
}

export default function LoginModal({ isOpen, quizTitle, subject, enterFullscreenOnSuccess, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [klass, setKlass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const subjectLabel = subject === "reading" ? "READING" : "LISTENING";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimEmail = email.trim().toLowerCase();
    const trimClass = klass.trim();

    // Basic client-side validation
    if (!trimEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      setError("Vui lòng nhập địa chỉ Gmail hợp lệ.");
      return;
    }
    if (!trimClass) {
      setError("Vui lòng nhập tên lớp.");
      return;
    }

    // CRITICAL: requestFullscreen must be called inside the click gesture.
    // If called after `await`, the user-activation expires and the browser rejects it.
    if (enterFullscreenOnSuccess && !document.fullscreenElement) {
      try { await document.documentElement.requestFullscreen?.(); } catch {}
    }

    setLoading(true);
    try {
      const student = await lookupStudent(trimEmail, trimClass);
      setCachedStudent(student);
      onSuccess(student);
    } catch (err) {
      // Login failed — exit fullscreen if we entered it
      if (enterFullscreenOnSuccess && document.fullscreenElement) {
        try { await document.exitFullscreen?.(); } catch {}
      }
      setError(err instanceof Error ? err.message : "Lỗi không xác định. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1a1a1a]/75 backdrop-blur-sm"
      style={{ fontFamily: "var(--font-inter, Arial, sans-serif)" }}
    >
      <div className="w-full max-w-md border-2 border-[#1a1a1a] bg-[#F5F1E9] shadow-[8px_8px_0_0_#1a1a1a]">

        {/* Header */}
        <div className="border-b-2 border-[#1a1a1a] bg-[#1a1a1a] px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-black tracking-tight text-[#F5F1E9]">HIN</span>
              <span className="font-display text-base font-black text-[#d9381e]">·</span>
              <span className="font-mono text-[10px] font-bold text-[#F5F1E9] opacity-60">
                {subjectLabel} · XÁC NHẬN DANH TÍNH
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5">

          {/* Quiz info */}
          <div className="mb-5 border-l-4 border-[#d9381e] pl-3">
            <div className="font-mono text-[10px] font-bold uppercase text-[#1a1a1a] opacity-50">
              Đề luyện tập
            </div>
            <div className="mt-0.5 text-sm font-bold text-[#1a1a1a] leading-snug line-clamp-2">
              {quizTitle}
            </div>
          </div>

          <p className="mb-4 text-[12px] text-[#1a1a1a] opacity-70 leading-relaxed">
            Nhập thông tin của bạn để bắt đầu. Kết quả sẽ được ghi lại cho giáo viên.
          </p>

          {/* Email field */}
          <div className="mb-3">
            <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase text-[#1a1a1a] opacity-70">
              Gmail đã đăng ký
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="tenban@gmail.com"
              autoComplete="email"
              autoFocus
              disabled={loading}
              className="w-full border-2 border-[#1a1a1a] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] outline-none placeholder:opacity-30 focus:shadow-[0_0_0_2px_#1a1a1a] disabled:opacity-50"
            />
          </div>

          {/* Class field */}
          <div className="mb-4">
            <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase text-[#1a1a1a] opacity-70">
              Tên lớp
            </label>
            <input
              type="text"
              value={klass}
              onChange={(e) => { setKlass(e.target.value); setError(null); }}
              placeholder="VD: 10A1"
              autoComplete="off"
              disabled={loading}
              className="w-full border-2 border-[#1a1a1a] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] outline-none placeholder:opacity-30 focus:shadow-[0_0_0_2px_#1a1a1a] disabled:opacity-50"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 border-2 border-[#d9381e] bg-[#d9381e]/10 px-3 py-2">
              <p className="text-[12px] font-bold text-[#d9381e] leading-relaxed">{error}</p>
              <p className="mt-1 text-[11px] text-[#d9381e] opacity-70">
                Liên hệ giáo viên nếu thông tin chưa được thêm vào hệ thống.
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full border-2 border-[#1a1a1a] bg-[#FFD700] py-3 font-bold text-[13px] text-[#1a1a1a] shadow-[3px_3px_0_0_#1a1a1a] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#1a1a1a] active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0 disabled:shadow-[3px_3px_0_0_#1a1a1a]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Đang xác nhận...
              </span>
            ) : (
              "Vào Làm Bài →"
            )}
          </button>

          <p className="mt-3 text-center font-mono text-[10px] text-[#1a1a1a] opacity-40">
            Kết quả và thời gian làm bài sẽ được gửi tới giáo viên sau khi nộp.
          </p>
        </form>
      </div>
    </div>
  );
}
