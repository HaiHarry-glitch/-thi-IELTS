import Image from "next/image";
import Link from "next/link";
import { getFullTests, type FullTestSkill } from "@/lib/fullTest";

export default async function FullTestLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string; cambridge?: string }>;
}) {
  const sp = await searchParams;
  const skill: FullTestSkill = sp.skill === "listening" ? "listening" : "reading";
  const all = getFullTests(skill);
  const cambridgeList = [...new Set(all.map((item) => item.cambridge))].sort((a, b) => b - a);
  const selectedCambridge = sp.cambridge ? Number(sp.cambridge) : cambridgeList[0];
  const tests = all
    .filter((item) => item.cambridge === selectedCambridge)
    .sort((a, b) => a.test - b.test);

  return (
    <div className="min-h-screen bg-[#F5F1E9]">
      <HinNav />

      <section className="border-b-2 border-[#1a1a1a] px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/60">
            // Full Test · Cambridge IELTS
          </div>
          <h1 className="font-display text-5xl font-black tracking-tighter md:text-7xl">
            Làm cả một đề <em className="text-[#d9381e]">đúng format thi.</em>
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-[#1a1a1a]/70">
            Reading gồm 3 passages trong 60 phút. Listening gồm 4 sections, audio tự động chuyển section sau 30 giây như thi thật.
          </p>
        </div>
      </section>

      <section className="border-b-2 border-[#1a1a1a] bg-[#FDFCF9] px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <SkillTab label="Reading 60'" skill="reading" active={skill === "reading"} />
          <SkillTab label="Listening 30'" skill="listening" active={skill === "listening"} />
          <div className="mx-2 h-8 w-px bg-[#1a1a1a]/30" />
          {cambridgeList.map((cambridge) => (
            <Link
              key={cambridge}
              href={`/luyen-thi/ielts/full-test?skill=${skill}&cambridge=${cambridge}`}
              className={`border-2 border-[#1a1a1a] px-3 py-1.5 font-[family-name:var(--font-mono)] text-xs font-black uppercase ${
                cambridge === selectedCambridge ? "bg-[#FFD700] shadow-[2px_2px_0_0_#1a1a1a]" : "bg-[#F5F1E9] hover:bg-[#FFD700]/40"
              }`}
            >
              C{cambridge}
            </Link>
          ))}
          <div className="ml-auto font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase text-[#1a1a1a]/50">
            {all.length} full tests
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tests.map((test) => {
            const parts = skill === "reading" ? test.passages || [] : test.sections || [];
            return (
              <Link
                key={`${test.skill}-${test.key}`}
                href={`/thi-thu/full/${skill}/${test.key}`}
                className="btn-press shadow-neo-sm flex min-h-80 flex-col border-2 border-[#1a1a1a] bg-[#FDFCF9]"
              >
                <div className="border-b-2 border-[#1a1a1a] bg-[#FFD700] p-4">
                  <div className="font-[family-name:var(--font-mono)] text-[10px] font-black uppercase tracking-widest text-[#1a1a1a]/60">
                    Cambridge {test.cambridge}
                  </div>
                  <h2 className="font-display text-3xl font-black tracking-tighter">
                    Test {test.test}
                  </h2>
                  <div className="mt-1 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase">
                    {test.totalQuestions} câu · {test.durationMin} phút
                  </div>
                </div>
                <div className="flex-1 space-y-3 p-4">
                  {parts.map((part) => (
                    <div key={part.id} className="border-b border-[#1a1a1a]/15 pb-2 last:border-b-0">
                      <div className="font-[family-name:var(--font-mono)] text-[10px] font-black uppercase text-[#d9381e]">
                        {skill === "reading" ? "Passage" : "Section"} {part.order} · {part.questions} câu
                      </div>
                      <div className="line-clamp-2 text-sm font-bold leading-snug">{part.title}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t-2 border-[#1a1a1a] bg-[#1a1a1a] p-3 text-center font-[family-name:var(--font-mono)] text-xs font-black uppercase tracking-widest text-[#F5F1E9]">
                  Bắt đầu
                </div>
              </Link>
            );
          })}
        </div>

        {tests.length === 0 && (
          <div className="border-2 border-[#1a1a1a] bg-[#FDFCF9] p-8 text-center font-[family-name:var(--font-mono)] text-sm font-bold uppercase shadow-neo-sm">
            Chưa có full test đủ data cho Cambridge này.
          </div>
        )}
      </main>
    </div>
  );
}

function SkillTab({ label, skill, active }: { label: string; skill: FullTestSkill; active: boolean }) {
  return (
    <Link
      href={`/luyen-thi/ielts/full-test?skill=${skill}`}
      className={`border-2 border-[#1a1a1a] px-4 py-2 font-[family-name:var(--font-mono)] text-xs font-black uppercase ${
        active ? "bg-[#1a1a1a] text-[#F5F1E9]" : "bg-[#F5F1E9] hover:bg-[#FFD700]/40"
      }`}
    >
      {label}
    </Link>
  );
}

function HinNav() {
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
          <Link href="/luyen-thi/ielts/reading" className="transition-colors hover:text-[#d9381e]">Reading</Link>
          <Link href="/luyen-thi/ielts/listening" className="transition-colors hover:text-[#d9381e]">Listening</Link>
          <Link href="/luyen-thi/ielts/full-test" className="text-[#d9381e]">Full Test</Link>
        </div>
      </div>
    </nav>
  );
}
