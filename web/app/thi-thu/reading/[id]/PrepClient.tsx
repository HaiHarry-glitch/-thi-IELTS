"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NormalizedQuiz } from "@/lib/data";
import { cleanTitle, titleSource } from "@/lib/title";

interface Meta {
  id: number;
  title: string;
  total_submitted: number;
  vote_count: number;
  tags: { id: number; code: string; title: string }[];
  time: number;
}

export default function PrepClient({
  quiz,
  meta,
}: {
  quiz: NormalizedQuiz;
  meta: Meta | null;
}) {
  const router = useRouter();
  const totalQ = quiz.parts.flatMap((p) =>
    p.questionSets.flatMap((qs) => qs.questions)
  ).length;

  const qTypeCount: Record<string, number> = {};
  for (const part of quiz.parts) {
    for (const qs of part.questionSets) {
      qTypeCount[qs.type] = (qTypeCount[qs.type] || 0) + qs.questions.length;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 h-12 flex items-center gap-4">
          <Link href="/luyen-thi/ielts/reading" className="flex items-center gap-1.5">
            <div className="w-7 h-7 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
              <span className="text-[#F5F1E9] text-xs font-bold">H</span>
            </div>
            <span className="text-sm font-bold text-gray-800">HIN</span>
          </Link>
          <span className="text-gray-300">/</span>
          <Link href="/luyen-thi/ielts/reading" className="text-xs text-gray-500 hover:text-orange-500">
            Reading
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-xs text-gray-700 truncate max-w-xs">{cleanTitle(quiz.title)}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Main card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Hero image */}
          <div className="relative h-52 bg-gradient-to-br from-orange-400 to-orange-600">
            <img
              src={`/thumbs/${quiz.id}.jpg`}
              alt={cleanTitle(quiz.title)}
              className="w-full h-full object-cover opacity-40"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="absolute inset-0 flex flex-col justify-end p-6">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(meta?.tags ?? []).slice(0, 3).map((t) => (
                  <span key={t.code} className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">
                    {t.title}
                  </span>
                ))}
              </div>
              {titleSource(quiz.title) && (
                <span className="mb-1 inline-block px-2 py-0.5 bg-white/15 text-white/80 text-[11px] rounded-full font-mono">
                  {titleSource(quiz.title)}
                </span>
              )}
              <h1 className="text-xl font-bold text-white leading-snug">{cleanTitle(quiz.title)}</h1>
            </div>
          </div>

          <div className="p-6">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              {[
                { icon: "⏱", label: "Thời gian", value: `${quiz.durationMin} phút` },
                { icon: "📝", label: "Số câu", value: `${totalQ} câu` },
                { icon: "📄", label: "Số phần", value: `${quiz.parts.length} part${quiz.parts.length > 1 ? "s" : ""}` },
                { icon: "👥", label: "Lượt thi", value: (meta?.total_submitted ?? 0).toLocaleString() },
              ].map((s) => (
                <div key={s.label} className="bg-orange-50 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-base font-bold text-gray-800">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Structure */}
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">
              Cấu trúc đề thi
            </h2>
            <div className="space-y-2 mb-8">
              {quiz.parts.map((part, idx) => {
                const qCount = part.questionSets.flatMap((qs) => qs.questions).length;
                const types = [...new Set(part.questionSets.map((qs) => qs.type))];
                return (
                  <div key={part.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {part.title || `Passage ${idx + 1}`}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {qCount} câu · {types.join(", ")}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 shrink-0">{qCount} câu</div>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <button
              onClick={() => router.push(`/practice/reading/${quiz.id}`)}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-base transition"
            >
              Bắt đầu làm bài →
            </button>

            <div className="text-center mt-3">
              <Link
                href={`/practice/reading/${quiz.id}?type=review`}
                className="text-sm text-gray-400 hover:text-orange-500"
              >
                Xem lại đáp án cũ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
