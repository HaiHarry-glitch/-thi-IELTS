import Image from "next/image";
import Link from "next/link";

export default function HinNav() {
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-[#1a1a1a] bg-[#F5F1E9]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/hin-logo.png" alt="HIN" width={32} height={32} className="border border-[#1a1a1a]" />
          <span className="font-display text-lg font-black tracking-tighter">
            HIN <span className="text-[#d9381e]">NAVIGATOR</span>
          </span>
        </Link>
        
        <div className="flex items-center gap-8 font-mono text-[11px] font-bold uppercase tracking-widest nav-links">
          <a href="#pain" className="transition-colors hover:text-[#d9381e]">Nỗi đau</a>
          <a href="#workflow" className="transition-colors hover:text-[#d9381e]">Workflow</a>
          <a href="#library" className="transition-colors hover:text-[#d9381e]">Thư viện</a>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/luyen-thi/ielts/reading" 
              className="border-2 border-[#1a1a1a] bg-[#1a1a1a] px-4 py-2 text-[#F5F1E9] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[0_0_0_0_#1a1a1a] shadow-[4px_4px_0_0_#1a1a1a]"
            >
              Vào học
            </Link>
            <a 
              href="#donate" 
              className="border-2 border-[#1a1a1a] bg-[#FFD700] px-4 py-2 text-[#1a1a1a] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[0_0_0_0_#1a1a1a] shadow-[4px_4px_0_0_#1a1a1a]"
            >
              Ủng hộ
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
