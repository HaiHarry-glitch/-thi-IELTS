"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cleanTitle, titleSource } from "@/lib/title";

interface Tag {
  id: number;
  code: string;
  title: string;
}

interface LibraryItem {
  id: number;
  title: string;
  type: number;
  quiz_type: number;
  time: number;
  thumbnail: string | null;
  quiz_code: string;
  total_submitted: number;
  vote_count: number;
  is_public: boolean;
  date_updated: string;
  tags: Tag[];
  questions: number;
}

const PAGE_SIZE = 24;

export default function LibraryClient({
  items,
  allTags,
  skill = "reading",
}: {
  items: LibraryItem[];
  allTags: Tag[];
  skill?: "reading" | "listening";
}) {
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const visibleTags = useMemo(() => {
    const base = skill === "reading"
      ? allTags.filter((tag) => !tag.code.startsWith("section_"))
      : allTags;
    const preferred = base.filter((tag) =>
      /cambridge|actual|practice|section_|passage_|matching|choice|fill|completion|true|false/i.test(`${tag.code} ${tag.title}`)
    );
    return (preferred.length ? preferred : base).slice(0, 12);
  }, [allTags, skill]);

  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((item) => item.title.toLowerCase().includes(query) || String(item.id).includes(query));
    }
    if (selectedTags.size > 0) {
      result = result.filter((item) => item.tags.some((tag) => selectedTags.has(tag.code)));
    }
    return result;
  }, [items, search, selectedTags]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const skillLabel = skill === "listening" ? "Listening" : "Reading";

  function toggleTag(code: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-[#F5F1E9]">
      <HinNav skill={skill} />

      <section className="border-b-2 border-[#1a1a1a] px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/60">
            // IELTS {skillLabel} - {items.length} đề
          </div>
          <h1 className="font-display text-5xl font-black tracking-tighter md:text-6xl">
            Thư viện đề thi <em className="text-[#d9381e]">{skillLabel}.</em>
          </h1>
        </div>
      </section>

      <section className="border-b-2 border-[#1a1a1a] bg-[#F5F1E9] px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a1a1a]/40"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm đề..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="w-64 border-2 border-[#1a1a1a] bg-[#FDFCF9] py-2 pl-10 pr-10 font-[family-name:var(--font-mono)] text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] focus:shadow-[2px_2px_0_0_#d9381e]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-[family-name:var(--font-mono)] text-sm text-[#1a1a1a]/40 pointer-events-none">
              /
            </span>
          </div>

          {visibleTags.map((tag) => (
            <button
              key={tag.code}
              onClick={() => toggleTag(tag.code)}
              className={`border-2 border-[#1a1a1a] px-3 py-1.5 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wide transition-colors ${
                selectedTags.has(tag.code)
                  ? "bg-[#FFD700] shadow-[2px_2px_0_0_#1a1a1a]"
                  : "bg-[#FDFCF9] hover:bg-[#FFD700]/40"
              }`}
            >
              {tag.title}
            </button>
          ))}

          {selectedTags.size > 0 && (
            <button
              onClick={() => {
                setSelectedTags(new Set());
                setPage(1);
              }}
              className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase text-[#d9381e] hover:underline transition-colors"
            >
              Xóa bộ lọc ✕
            </button>
          )}

          <div className="ml-auto font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase text-[#1a1a1a]/50">
            {filtered.length} đề
          </div>
        </div>
      </section>

        <main className="mx-auto max-w-6xl px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link
          href={`/luyen-thi/ielts/full-test?skill=${skill}`}
          className="btn-press shadow-neo-sm mb-6 grid gap-4 border-2 border-[#1a1a1a] bg-[#FFD700] p-5 md:grid-cols-[1fr_auto] md:items-center relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 opacity-10 md:opacity-20 translate-x-1/4 -translate-y-1/4">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="mb-2 font-[family-name:var(--font-mono)] text-[10px] font-black uppercase tracking-widest text-[#1a1a1a]/60">
              // Cambridge Full Test
            </div>
            <h2 className="font-display text-3xl font-black tracking-tighter">
              Làm trọn bộ đề {skillLabel}
            </h2>
            <p className="mt-1 text-sm font-bold text-[#1a1a1a]/70">
              {skill === "reading"
                ? "3 passages liên tục trong 60 phút."
                : "4 sections liên tục, audio tự động chuyển section sau 30 giây."}
            </p>
          </div>
          <div className="relative z-10 border-2 border-[#1a1a1a] bg-[#1a1a1a] px-5 py-3 text-center font-[family-name:var(--font-mono)] text-xs font-black uppercase tracking-widest text-[#F5F1E9] transition-transform hover:scale-105">
            Mở Full Test
          </div>
        </Link>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {paginated.map((item) => (
            <ExamCard key={item.id} item={item} skill={skill} />
          ))}
        </div>

        {paginated.length === 0 && (
          <div className="border-2 border-[#1a1a1a] bg-[#FDFCF9] p-8 text-center font-[family-name:var(--font-mono)] text-sm font-bold uppercase shadow-neo-sm">
            Không tìm thấy đề phù hợp.
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="border-2 border-[#1a1a1a] bg-[#FDFCF9] px-3 py-2 font-[family-name:var(--font-mono)] text-xs font-bold disabled:opacity-40"
            >
              &lt;
            </button>
            {paginationItems(page, totalPages).map((item, index) =>
              item === "..." ? (
                <span key={`ellipsis-${index}`} className="px-2 font-[family-name:var(--font-mono)] text-xs font-bold">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item)}
                  className={`h-9 min-w-9 border-2 border-[#1a1a1a] px-2 font-[family-name:var(--font-mono)] text-xs font-bold ${
                    item === page ? "bg-[#1a1a1a] text-[#F5F1E9]" : "bg-[#FDFCF9] hover:bg-[#FFD700]/40"
                  }`}
                >
                  {item}
                </button>
              )
            )}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="border-2 border-[#1a1a1a] bg-[#FDFCF9] px-3 py-2 font-[family-name:var(--font-mono)] text-xs font-bold disabled:opacity-40"
            >
              &gt;
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function HinNav({ skill }: { skill: "reading" | "listening" }) {
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-[#1a1a1a] bg-[#F5F1E9]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/hin-logo.png" alt="HIN" width={32} height={32} className="border border-[#1a1a1a]" />
          <span className="font-display text-lg font-black tracking-tighter">
            HIN <span className="text-[#d9381e]">NAVIGATOR</span>
          </span>
        </Link>
        <div className="flex items-center gap-6 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest">
          <Link
            href="/luyen-thi/ielts/reading"
            className={skill === "reading" ? "text-[#d9381e]" : "transition-colors hover:text-[#d9381e]"}
          >
            Reading
          </Link>
          <Link
            href="/luyen-thi/ielts/listening"
            className={skill === "listening" ? "text-[#d9381e]" : "transition-colors hover:text-[#d9381e]"}
          >
            Listening
          </Link>
          <Link href="/luyen-thi/ielts/full-test" className="transition-colors hover:text-[#d9381e]">
            Full Test
          </Link>
        </div>
      </div>
    </nav>
  );
}

function ExamCard({ item, skill }: { item: LibraryItem; skill: "reading" | "listening" }) {
  const title = cleanTitle(item.title);
  const source = titleSource(item.title);
  const displayTags = skill === "reading"
    ? item.tags.filter((t) => !t.code.startsWith("section_"))
    : item.tags;
  const primaryTag = displayTags[0]?.title || "Mixed";

  return (
    <Link
      href={`/thi-thu/${skill}/${item.id}`}
      className="btn-press shadow-neo-sm group block overflow-hidden border-4 border-[#1a1a1a] bg-[#FDFCF9] transition-all duration-200 hover:-translate-y-2 hover:-rotate-1 hover:bg-[#FFD700] hover:shadow-neo"
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-[#1a1a1a] bg-[#F5F1E9]">
        <img
          src={`/thumbs/${item.id}.jpg`}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = "none";
            const parent = el.parentElement;
            if (parent) parent.dataset.fallback = "1";
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-[#F5F1E9] font-display text-4xl font-black tracking-tighter text-[#1a1a1a]/20 [[data-fallback='1']>&]:flex"
        >
          {skill === "listening" ? "LSN" : "RDG"}
        </div>
        <span className="absolute left-2 top-2 border border-[#1a1a1a] bg-[#FDFCF9] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wide">
          {item.time}min
        </span>
        <span className="absolute right-2 top-2 border border-[#1a1a1a] bg-[#FFD700] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wide">
          #{item.id}
        </span>
      </div>

      <div className="p-4">
        <div className="mb-2 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/50">
          // {primaryTag}
        </div>
        <h3 className="mb-3 line-clamp-2 min-h-14 font-display text-lg font-black leading-tight tracking-tight transition-colors group-hover:text-[#d9381e]">
          {title}
        </h3>
        <div className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase text-[#1a1a1a]/70">
          <span className="group-hover:text-[#1a1a1a]">{item.total_submitted.toLocaleString()} lượt</span>
          {displayTags.slice(0, 2).map((tag) => (
            <span key={tag.code} className="border-2 border-[#1a1a1a] bg-[#F5F1E9] px-1.5 py-0.5 comic-tooltip group-hover:bg-white transition-colors cursor-help" data-tooltip={`${tag.title} - Chi tiết`}>
              {tag.title}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function paginationItems(current: number, total: number): Array<number | "..."> {
  const visible = Array.from({ length: total }, (_, index) => index + 1).filter(
    (item) => Math.abs(item - current) <= 2 || item === 1 || item === total
  );

  return visible.reduce<Array<number | "...">>((acc, item, index) => {
    if (index > 0 && visible[index - 1] !== item - 1) acc.push("...");
    acc.push(item);
    return acc;
  }, []);
}
