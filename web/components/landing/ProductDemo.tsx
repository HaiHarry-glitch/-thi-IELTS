"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const DEMO_TABS = [
  {
    id: "reading",
    label: "Reading Library",
    title: "Thư viện Reading",
    description: "510+ đề Reading bản full. Lọc theo nguồn (Cambridge, Actual Tests...), theo dạng câu hỏi hoặc tìm kiếm trực tiếp.",
    screenshot: "/screenshots/reading-library.png",
    cta: "Khám phá Reading",
    link: "/luyen-thi/ielts/reading",
  },
  {
    id: "listening",
    label: "Listening Library",
    title: "Thư viện Listening",
    description: "637+ đề Listening có đầy đủ audio và transcript. Hoàn toàn miễn phí 100%.",
    screenshot: "/screenshots/listening-library.png",
    cta: "Khám phá Listening",
    link: "/luyen-thi/ielts/listening",
  },
  {
    id: "exam",
    label: "Exam Mode",
    title: "Chế độ Thi thật",
    description: "Giao diện giống thi thật 100% kèm giải thích siêu chi tiết. Submit xong xem ngay kết quả.",
    screenshot: "/screenshots/exam-mode.png",
    cta: "Thử thi ngay",
    link: "/luyen-thi/ielts/reading", // Link to library to choose an exam
  },
];

export default function ProductDemo() {
  const [activeTab, setActiveTab] = useState(DEMO_TABS[0]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-3">
        {DEMO_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab)}
            className={`demo-tab ${activeTab.id === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-12 lg:grid-cols-2 items-center">
        <div className="order-2 lg:order-1">
          <div className="mb-4 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.2em] text-[#d9381e]">
            // FEATURE PREVIEW
          </div>
          <h3 className="mb-6 font-[family-name:var(--font-fraunces)] text-4xl font-black tracking-tight leading-none uppercase">
            {activeTab.title}
          </h3>
          <p className="mb-8 text-lg leading-relaxed text-[#1a1a1a]/80 max-w-md">
            {activeTab.description}
          </p>
          <Link
            href={activeTab.link}
            className="btn-press shadow-neo inline-block border-2 border-[#1a1a1a] bg-[#1a1a1a] px-8 py-4 font-[family-name:var(--font-fraunces)] text-lg font-black tracking-tight text-[#F5F1E9] uppercase"
          >
            {activeTab.cta} →
          </Link>
        </div>

        <div className="order-1 lg:order-2">
          <div className="shadow-neo-lg relative aspect-video overflow-hidden border-4 border-[#1a1a1a] bg-[#FDFCF9]">
            <img
              src={activeTab.screenshot}
              alt={activeTab.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.src = "https://placehold.co/1280x800/F5F1E9/1a1a1a?text=Product+Screenshot+Coming+Soon";
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
