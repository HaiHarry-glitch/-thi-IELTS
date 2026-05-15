"use client";

import { useEffect, useState } from "react";

interface HinVocab {
  id: number;
  value: string;
  word_class?: string;
  meaning?: string;
  ipa?: string;
  explanation?: string;
  collocation?: string;
  example?: string[];
  word_display?: string;
  parent?: {
    id: number;
    value?: string;
    meaning?: string;
    explanation?: string;
    reference?: string;
  };
}

interface Props {
  word: string;
  sentenceId: number;
  onClose: () => void;
}

const CACHE_KEY = (sentenceId: number, word: string) => `hin_vocab_${sentenceId}_${word.toLowerCase()}`;

export default function VocabPopup({ word, sentenceId, onClose }: Props) {
  const [data, setData] = useState<HinVocab | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [sentenceOpen, setSentenceOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    setAudioUrl(null);
    setSentenceOpen(false);

    const cached = localStorage.getItem(CACHE_KEY(sentenceId, word));
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as HinVocab;
        setData(parsed);
        setLoading(false);
        return () => { cancelled = true; };
      } catch {
        localStorage.removeItem(CACHE_KEY(sentenceId, word));
      }
    }

    fetch(`/api/vocab?parent_id=${sentenceId}&word=${encodeURIComponent(word.toLowerCase())}`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res.code === 0 && res.data) {
          setData(res.data);
          try { localStorage.setItem(CACHE_KEY(sentenceId, word), JSON.stringify(res.data)); } catch {}
        } else {
          setError(res.message || res.error || "Không tìm thấy từ");
        }
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Không thể tra từ"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [word, sentenceId]);

  async function playAudio() {
    if (!data) return;
    let url = audioUrl;
    if (!url) {
      try {
        const res = await fetch("/api/vocab/pronunciation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { vocab: data.value, word_class: data.word_class, ipa: data.ipa } }),
        });
        const json = await res.json();
        url = json?.data?.data?.link || null;
        setAudioUrl(url);
      } catch { url = null; }
    }
    if (url) new Audio(url).play().catch(() => {});
  }

  function copyWord() {
    navigator.clipboard?.writeText(data?.value || word).catch(() => {});
  }

  function saveVocab() {
    if (!data) return;
    const saved = JSON.parse(localStorage.getItem("hin_saved_vocabs") || "[]");
    if (!saved.find((item: { word: string; sentenceId: number }) => item.word === word && item.sentenceId === sentenceId)) {
      saved.push({ word, sentenceId, savedAt: Date.now(), data });
      localStorage.setItem("hin_saved_vocabs", JSON.stringify(saved));
    }
  }

  return (
    <div className="my-3 border-2 border-[#1a1a1a] bg-[#FDFCF9] text-[#1a1a1a] shadow-[4px_4px_0_0_#1a1a1a] text-sm">
      {/* ── Header row ── */}
      <div className="flex items-center gap-3 border-b-2 border-[#1a1a1a] bg-[#F5F1E9] px-4 py-2.5">
        {/* Audio play */}
        <button
          onClick={playAudio}
          disabled={!data}
          title="Phát âm"
          className="flex h-7 w-7 items-center justify-center border-2 border-[#1a1a1a] bg-[#FDFCF9] text-[#1a1a1a] shadow-[1px_1px_0_0_#1a1a1a] transition hover:bg-[#1a1a1a] hover:text-[#F5F1E9] disabled:opacity-30"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
          </svg>
        </button>

        {/* Word + IPA + POS */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
          <span className="font-display text-lg font-black text-[#1a1a1a]">
            {data?.word_display || data?.value || word}
          </span>
          {data?.ipa && (
            <span className="font-mono text-xs text-[#1a1a1a] opacity-50">{data.ipa}</span>
          )}
          {data?.word_class && (
            <span className="font-mono text-[10px] border border-[#1a1a1a] px-1.5 py-px text-[#1a1a1a] opacity-60">
              {data.word_class}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button
            onClick={saveVocab}
            disabled={!data}
            className="border-2 border-[#1a1a1a] bg-[#FFD700] px-2.5 py-0.5 text-[11px] font-bold text-[#1a1a1a] shadow-[2px_2px_0_0_#1a1a1a] transition hover:-translate-y-px hover:shadow-[3px_3px_0_0_#1a1a1a] active:translate-y-px active:shadow-none disabled:opacity-30"
          >
            + Lưu
          </button>
          <button
            onClick={copyWord}
            className="border-2 border-[#1a1a1a] bg-[#FDFCF9] px-2.5 py-0.5 text-[11px] font-bold text-[#1a1a1a] shadow-[2px_2px_0_0_#1a1a1a] transition hover:-translate-y-px hover:shadow-[3px_3px_0_0_#1a1a1a] active:translate-y-px active:shadow-none"
          >
            Chép
          </button>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center border-2 border-[#1a1a1a] bg-[#FDFCF9] text-[11px] font-bold shadow-[1px_1px_0_0_#1a1a1a] transition hover:bg-[#1a1a1a] hover:text-[#F5F1E9]"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 py-3 space-y-2.5">
        {loading && (
          <div className="flex items-center gap-2 font-mono text-xs text-[#1a1a1a] opacity-50">
            <span className="animate-pulse">▌</span> Đang tra từ điển…
          </div>
        )}
        {error && (
          <div className="border-l-4 border-[#d9381e] pl-3 font-mono text-xs text-[#d9381e]">
            ⚠ {error}
          </div>
        )}

        {data && (
          <>
            {/* Meaning */}
            {data.meaning && (
              <div className="text-base font-bold text-[#d9381e]">{data.meaning}</div>
            )}

            {/* Collocation */}
            {data.collocation && (
              <div className="text-xs">
                <span className="font-mono font-bold text-[#1a1a1a] opacity-50">// cấu trúc</span>
                <span className="ml-2 text-[#1a1a1a]">{data.collocation}</span>
              </div>
            )}

            {/* Explanation */}
            {data.explanation && (
              <div className="border-l-2 border-[#1a1a1a] pl-3 text-[13px] text-[#1a1a1a] leading-relaxed">
                {data.explanation}
              </div>
            )}

            {/* Examples */}
            {data.example && data.example.length > 0 && (
              <div className="space-y-1">
                <div className="font-mono text-[10px] font-bold text-[#1a1a1a] opacity-50">// ví dụ</div>
                {data.example.map((ex, i) => (
                  <div key={i} className="text-[12px] text-[#1a1a1a] leading-relaxed pl-2 border-l border-[#1a1a1a] border-opacity-20">
                    {ex}
                  </div>
                ))}
              </div>
            )}

            {/* Sentence translation toggle */}
            {data.parent && (
              <div className="border-t-2 border-[#1a1a1a] pt-2">
                <button
                  onClick={() => setSentenceOpen((v) => !v)}
                  className="flex w-full items-center justify-between font-mono text-[11px] font-bold text-[#1a1a1a] opacity-70 hover:opacity-100"
                >
                  <span>▾ Dịch nghĩa cả câu</span>
                  <span className="opacity-50">{sentenceOpen ? "thu lại" : "xem"}</span>
                </button>
                {sentenceOpen && (
                  <div className="mt-2 space-y-1.5 bg-[#F5F1E9] p-3 text-[12px]">
                    {data.parent.value && (
                      <div><span className="font-bold">Câu:</span> <em className="text-[#1a1a1a]">{data.parent.value}</em></div>
                    )}
                    {data.parent.meaning && (
                      <div><span className="font-bold">Nghĩa:</span> {data.parent.meaning}</div>
                    )}
                    {data.parent.explanation && (
                      <div><span className="font-bold">Giải thích:</span> {data.parent.explanation}</div>
                    )}
                    {data.parent.reference && (
                      <div><span className="font-bold">Tham chiếu:</span> {data.parent.reference}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
