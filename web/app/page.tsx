import Image from "next/image";
import Link from "next/link";
import { getIndex, getListeningIndex } from "@/lib/data";
import ProductDemo from "@/components/landing/ProductDemo";
import HinNav from "@/components/landing/HinNav";

export default function HomePage() {
  const readingCount = getIndex().length;
  const listeningCount = getListeningIndex().filter((item) => item.questions > 0).length;

  return (
    <div className="min-h-screen bg-[#F5F1E9] text-[#1a1a1a] selection:bg-[#FFD700] cursor-crosshair">
      {/* READING PROGRESS BAR */}
      <div className="fixed top-0 left-0 h-1.5 bg-[#FF6B00] z-[10000] transition-all duration-75" id="progress-bar" style={{ width: '0%' }}></div>
      <script dangerouslySetInnerHTML={{ __html: `
        if (typeof window !== 'undefined') {
          window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            const bar = document.getElementById('progress-bar');
            if (bar) bar.style.width = scrolled + "%";
          });
        }
      `}} />

      <HinNav />

      {/* SECTION 2: HERO (OVERLAPPING STYLE) */}
      <section className="section-paper border-b-2 border-[#1a1a1a] px-6 py-20 md:py-32 overflow-hidden">
        <div className="mx-auto max-w-6xl">
          <div className="hero-grid items-start">
            <div>
              <div className="mb-6 flex flex-wrap gap-2">
                <div className="badge badge-green animate-pulse">✓ 100% Giống Thi Thật</div>
                <div className="badge">Miễn Phí 100%</div>
              </div>
              
              <h1 className="mb-8 font-display text-[clamp(42px,7vw,84px)] font-black leading-[0.95] tracking-[-0.03em] uppercase">
                Luyện đề IELTS 
                <br />
                <em className="text-[#d9381e] italic underline decoration-[#d9381e]/20 decoration-[16px] underline-offset-[-2px]">bản full,</em>
                <br />
                không giới hạn.
              </h1>
              
              <p className="mb-10 max-w-lg text-lg leading-relaxed text-[#1a1a1a]/80 font-medium">
                Thư viện <span className="font-bold text-[#d9381e]">{readingCount}+ đề Reading</span> và <span className="font-bold text-[#d9381e]">{listeningCount}+ đề Listening</span> từ <span className="group relative cursor-help inline-block font-black underline decoration-2 decoration-dashed underline-offset-4 text-[#d9381e]">Cambridge<div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-32 border-4 border-black shadow-neo rotate-3 z-50 pointer-events-none bg-white"><img src="/editorial-books.png" alt="Cambridge" className="w-full h-auto object-cover aspect-[3/4]" /></div></span>, Actual Tests và Practice Plus. Mở đề là làm ngay — không cần tạo tài khoản, giải thích siêu chi tiết.
              </p>
              
              <div className="flex flex-wrap gap-5">
                <Link
                  href="/luyen-thi/ielts/reading"
                  className="btn-press shadow-neo border-4 border-[#1a1a1a] bg-[#d9381e] px-10 py-5 font-display text-xl font-black tracking-tight text-white uppercase"
                >
                  ➤ Bắt đầu Reading
                </Link>
                <Link
                  href="/luyen-thi/ielts/listening"
                  className="btn-press shadow-neo border-4 border-[#1a1a1a] bg-[#1a1a1a] px-10 py-5 font-display text-xl font-black tracking-tight text-white uppercase"
                >
                  ➜ Luyện Listening
                </Link>
              </div>
              
              <div className="mt-12 flex gap-4">
                <div className="badge badge-green">Full Giải Thích Chi Tiết</div>
              </div>
            </div>

            <div className="relative mt-20 lg:mt-0">
              <div className="overlap-container">
                <div className="absolute -top-4 -right-2 z-30 rotate-[15deg] hover:rotate-0 transition-transform badge badge-red border-4 text-[10px] px-3 py-1 animate-pulse">
                  HOT 2024!
                </div>
                {/* Main Image (Retro Window) */}
                <div className="window-frame tilted-image relative z-10 w-[80%] -rotate-2 aspect-[4/3]">
                  <div className="window-frame-bar">
                    <span>C:\HIN\IELTS.EXE</span>
                    <span className="flex gap-1 text-[8px] tracking-tighter">
                      <span className="border border-white px-1">_</span>
                      <span className="border border-white px-1">□</span>
                      <span className="border border-white px-1 bg-[#d9381e]">X</span>
                    </span>
                  </div>
                  <div className="window-frame-content">
                    <img 
                      src="/editorial-books.png" 
                      alt="Study Setup" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 badge">GIAO DIỆN CHUẨN THI THẬT</div>
                  </div>
                </div>
                
                {/* Overlapping Illustration/Screenshot */}
                <div className="shadow-neo-lg tilted-image absolute -right-4 top-1/2 z-20 w-[60%] rotate-6 -translate-y-1/2 border-4 border-[#1a1a1a] bg-white p-2">
                  <img 
                    src="/screenshots/reading-library.png" 
                    alt="Library Preview" 
                    className="aspect-[4/3] w-full object-cover grayscale transition-all hover:grayscale-0"
                  />
                  <div className="mt-2 text-center font-[family-name:var(--font-mono)] text-[8px] font-black uppercase">
                    // HIN NAVIGATOR — ĐỀ LUÔN MỚI
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE SECTION */}
      <div className="border-b-4 border-[#1a1a1a] bg-[#00FF41] py-3 overflow-hidden flex font-[family-name:var(--font-mono)] text-sm font-black uppercase tracking-widest text-[#1a1a1a]">
        <div className="animate-marquee gap-12">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="flex gap-12 items-center">
              <span>✦ 100% MIỄN PHÍ</span>
              <span>✦ {readingCount}+ ĐỀ READING</span>
              <span>✦ {listeningCount}+ ĐỀ LISTENING</span>
              <span>✦ CHUẨN FORM THI CDI</span>
            </span>
          ))}
        </div>
      </div>

      {/* SECTION 3: DARK PAIN POINT */}
      <section id="pain" className="section-dark border-b-2 border-[#1a1a1a] px-6 py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[#d9381e]/5 pointer-events-none"></div>
        
        <div className="mx-auto max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <div className="shadow-neo-lg border-4 border-[#d9381e] overflow-hidden rotate-1 transition-transform hover:rotate-0">
                <img 
                  src="/pain-visual.png" 
                  alt="Overwhelmed Student" 
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute bottom-4 left-4 badge badge-red">ĐIỂM SỐ ĐỨNG YÊN // 100%</div>
              </div>
            </div>
            
            <div>
              <div className="mb-8 badge badge-red">NỖI ĐAU THẬT</div>
              <h2 className="mb-10 font-display text-[clamp(36px,5vw,64px)] font-black leading-[1.05] tracking-tighter uppercase">
                Bạn luyện IELTS kiểu
                <br />
                <em className="text-[#d9381e] italic underline decoration-[#d9381e]/40 underline-offset-4">"có đề là làm",</em>
                <br />
                nhưng điểm đứng yên?
              </h2>
              
              <p className="mb-12 text-lg leading-relaxed text-[#F5F1E9]/70 max-w-lg transition-all hover:text-white hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] cursor-default">
                Giải đề trên giấy, xem đáp án A B C D xong rồi thôi. Bạn không biết tại sao sai, tốn thời gian tìm kiếm lời giải mập mờ trên mạng và không có môi trường áp lực như phòng thi thật.
              </p>
              
              <ul className="flex flex-col gap-5">
                {[
                  "Làm đề tràn lan không chọn lọc nguồn uy tín.",
                  "Không có giải thích chi tiết, sai vẫn hoàn sai.",
                  "Quen làm giấy, khi thi trên máy tính (CDI) bị ngợp.",
                ].map((text, i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-[#d9381e] font-black text-[10px]">{i+1}</span>
                    <span className="font-bold text-sm tracking-tight">{text}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-12 p-6 border-l-4 border-[#d9381e] bg-white/5 italic text-sm text-[#F5F1E9]/50">
                "Luyện đề hiệu quả là phải biết chính xác mình hổng kiến thức ở đâu qua từng câu sai, và làm quen với giao diện thi thật ngay từ những ngày đầu."
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: WORKFLOW (HORIZONTAL CARD STYLE) */}
      <section id="workflow" className="section-paper border-b-2 border-[#1a1a1a] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 font-[family-name:var(--font-mono)] text-sm font-black uppercase tracking-widest">
            WORKFLOW LUYỆN ĐỀ <span className="text-[#d9381e]/30 font-normal ml-4">// XÂY HỆ THỐNG LUYỆN THI</span>
          </div>
          <div className="h-1 w-full bg-[#1a1a1a] mb-16"></div>

          <div className="workflow-grid">
            {[
              { step: "01", title: "Chọn đề", desc: "Lọc theo nguồn Cambridge, tag, tìm kiếm thông minh.", icon: "📚" },
              { step: "02", title: "Làm bài", desc: "Timer 60 phút. Giao diện chia đôi chuẩn thi thật.", icon: "⏱️" },
              { step: "03", title: "Nộp bài", desc: "Xem kết quả ngay. Thống kê đúng/sai từng câu.", icon: "✅" },
              { step: "04", title: "Review", desc: "Xem lời giải siêu chi tiết. Highlight đoạn văn liên quan.", icon: "🔍" },
              { step: "05", title: "Lặp lại", desc: "Lưu local. Quay lại bất cứ lúc nào xem tiến độ.", icon: "🔄" },
            ].map((item) => (
              <div key={item.step} className="shadow-neo-sm flex flex-col justify-between border-4 border-[#1a1a1a] bg-white p-6 transition-all hover:-translate-y-2 hover:shadow-neo group">
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center border-2 border-[#1a1a1a] bg-[#FFD700] font-[family-name:var(--font-mono)] text-[10px] font-black">
                      B{item.step}
                    </span>
                    <span className="text-xl grayscale group-hover:grayscale-0 transition-all group-hover:scale-125">{item.icon}</span>
                  </div>
                  <h3 className="mb-2 font-display text-lg font-black uppercase tracking-tight">{item.title}</h3>
                  <p className="text-[11px] leading-relaxed text-[#1a1a1a]/60">{item.desc}</p>
                </div>
                <div className="mt-6 flex justify-end text-[10px] text-[#FF6B00] font-black opacity-0 group-hover:opacity-100 transition-opacity">➤</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: VIDEO / DEMO */}
      <section className="section-paper border-b-2 border-[#1a1a1a] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center max-w-3xl mx-auto">
            <div className="mb-8 badge badge-red">HIN — TRỰC QUAN</div>
            <h2 className="mb-6 font-display text-[clamp(36px,5vw,64px)] font-black leading-[1.1] text-[#1a1a1a] uppercase tracking-tighter">
              Trải nghiệm thực tế
            </h2>
            <p className="text-[#1a1a1a]/80 text-lg font-medium leading-relaxed">
              Hệ thống giao diện chuẩn thi máy (Computer-Delivered IELTS). Xem demo cách làm bài trực tiếp cho cả hai kỹ năng Reading và Listening.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* READING VIDEO */}
            <div className="flex flex-col gap-4">
              <div className="window-frame hover:shadow-neo-lg transition-all">
                <div className="window-frame-bar">
                  <span>READING_DEMO.EXE</span>
                  <span className="flex gap-1 text-[8px] tracking-tighter">
                    <span className="border border-white px-1">_</span>
                    <span className="border border-white px-1">□</span>
                    <span className="border border-white px-1 bg-[#d9381e]">X</span>
                  </span>
                </div>
                <div className="window-frame-content relative aspect-video bg-black">
                  <iframe
                    src="https://www.youtube.com/embed/tMziq8vpy5I?modestbranding=1&rel=0"
                    title="HIN Reading Demo"
                    className="absolute inset-0 h-full w-full border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              <div className="flex gap-4 items-center p-4 border-4 border-[#1a1a1a] bg-white shadow-neo-sm">
                <div className="h-8 w-8 shrink-0 flex items-center justify-center bg-[#1a1a1a] text-white text-sm font-bold">R</div>
                <div>
                  <div className="text-[#1a1a1a] font-black text-sm uppercase tracking-tight">Hướng dẫn làm bài Reading</div>
                  <div className="text-[#1a1a1a]/50 text-[10px] font-bold uppercase tracking-widest">Highlight & Giải thích</div>
                </div>
              </div>
            </div>

            {/* LISTENING VIDEO */}
            <div className="flex flex-col gap-4">
              <div className="window-frame hover:shadow-neo-lg transition-all">
                <div className="window-frame-bar">
                  <span>LISTENING_DEMO.EXE</span>
                  <span className="flex gap-1 text-[8px] tracking-tighter">
                    <span className="border border-white px-1">_</span>
                    <span className="border border-white px-1">□</span>
                    <span className="border border-white px-1 bg-[#d9381e]">X</span>
                  </span>
                </div>
                <div className="window-frame-content relative aspect-video bg-black">
                  <iframe
                    src="https://www.youtube.com/embed/cu5jl2vS9Eg?modestbranding=1&rel=0"
                    title="HIN Listening Demo"
                    className="absolute inset-0 h-full w-full border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              <div className="flex gap-4 items-center p-4 border-4 border-[#1a1a1a] bg-white shadow-neo-sm">
                <div className="h-8 w-8 shrink-0 flex items-center justify-center bg-[#1a1a1a] text-white text-sm font-bold">L</div>
                <div>
                  <div className="text-[#1a1a1a] font-black text-sm uppercase tracking-tight">Hướng dẫn làm bài Listening</div>
                  <div className="text-[#1a1a1a]/50 text-[10px] font-bold uppercase tracking-widest">Audio Player & Điền đáp án</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT DEMO (Tabs) */}
      <section className="border-b-2 border-[#1a1a1a] bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 font-[family-name:var(--font-mono)] text-[11px] font-black uppercase tracking-[0.2em] text-[#d9381e]">
            // TRẢI NGHIỆM TÍNH NĂNG
          </div>
          <h2 className="mb-16 max-w-4xl font-display text-[clamp(36px,5vw,64px)] font-black leading-[1.1] tracking-tighter">
            GIẢI THÍCH SIÊU CHI TIẾT,
            <br />
            BIẾT CHÍNH XÁC SAI Ở ĐÂU.
          </h2>

          <ProductDemo />
        </div>
      </section>

      {/* LIBRARY GRID */}
      <section id="library" className="section-paper border-b-2 border-[#1a1a1a] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 font-[family-name:var(--font-mono)] text-[11px] font-black uppercase tracking-[0.2em] text-[#d9381e]">
            // THƯ VIỆN ĐỀ
          </div>
          <h2 className="mb-16 max-w-3xl font-display text-[clamp(36px,5vw,64px)] font-black leading-[1.1] tracking-tighter">
            NGUỒN ĐỀ ĐA DẠNG,
            <br />
            CẬP NHẬT LIÊN TỤC.
          </h2>

          <div className="library-grid">
            {[
              { title: "Cambridge IELTS", count: "120+ đề", tags: ["Chuẩn nhất"], color: "bg-[#FDFCF9]" },
              { title: "Actual Tests", count: "200+ đề", tags: ["Sát đề thật"], color: "bg-[#FFD700]" },
              { title: "Practice Plus", count: "80+ đề", tags: ["Đề nâng cao"], color: "bg-[#FDFCF9]" },
              { title: "IELTS Trainer", count: "50+ đề", tags: ["Luyện kỹ năng"], color: "bg-[#FDFCF9]" },
            ].map((item, idx) => (
              <div key={idx} className={`shadow-neo flex flex-col justify-between border-4 border-[#1a1a1a] p-8 ${item.color}`}>
                <div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {item.tags.map(tag => (
                      <span key={tag} className="border-2 border-[#1a1a1a] bg-white px-2 py-0.5 font-[family-name:var(--font-mono)] text-[9px] font-black uppercase tracking-wider">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="mb-4 font-display text-3xl font-black leading-none uppercase tracking-tight">
                    {item.title}
                  </h3>
                </div>
                <div className="font-[family-name:var(--font-mono)] text-sm font-black uppercase text-[#d9381e]">
                  // {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DONATE */}
      <section id="donate" className="section-paper border-b-2 border-[#1a1a1a] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="donate-grid">
            <div className="max-w-xl">
              <div className="mb-8 badge">ỦNG HỘ DỰ ÁN</div>
              <h2 className="mb-8 font-display text-[clamp(40px,6vw,80px)] font-black leading-[1.1] tracking-tighter uppercase">
                HIN Navigator 
                <br />
                <em className="text-[#d9381e] italic">miễn phí 100%.</em>
              </h2>
              <p className="mb-10 text-xl font-medium leading-relaxed text-[#1a1a1a]/80">
                Không bắt buộc. Học vẫn miễn phí. 
                <br />
                Donate chỉ để giúp dự án sống lâu hơn, duy trì server và cập nhật thêm đề mới mỗi tuần.
              </p>
              
              <div className="flex flex-col gap-4 border-l-4 border-[#d9381e] pl-6 italic font-medium text-[#1a1a1a]/70">
                <p>"QR bên phải là mã donate, không phải mã đăng nhập."</p>
                <div className="flex gap-6 font-[family-name:var(--font-mono)] text-[11px] font-black uppercase tracking-widest not-italic">
                  <a href="https://www.facebook.com/harry.workk/" target="_blank" className="hover:text-[#d9381e]">Facebook</a>
                  <a href="https://www.tiktok.com/@daily_dictation" target="_blank" className="hover:text-[#d9381e]">TikTok</a>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="shadow-neo border-4 border-[#1a1a1a] bg-white p-8 animate-levitate md:scale-110 lg:scale-125 origin-center">
                <Image src="/QRCode.png" alt="Donate QR Code" width={360} height={360} className="aspect-square object-contain" />
                <div className="mt-8 border-t-2 border-[#1a1a1a]/10 pt-6 text-center">
                  <span className="font-mono text-xs font-black uppercase tracking-[0.25em] text-[#1a1a1a]/40">
                    // DONATE — NGÂN HÀNG
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-12 bg-white relative pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Image src="/hin-logo.png" alt="HIN" width={40} height={40} className="border-2 border-[#1a1a1a]" />
                <span className="font-display text-2xl font-black tracking-tighter glitch-hover cursor-pointer">
                  HIN <span className="text-[#d9381e]">NAVIGATOR</span>
                </span>
              </div>
              <p className="max-w-xs text-sm font-medium text-[#1a1a1a]/60">
                Một sản phẩm thuộc hệ sinh thái Harry IELTS Navigator. Nền tảng luyện thi IELTS bản full, không giới hạn.
              </p>
            </div>

            <div className="flex flex-wrap gap-12 font-[family-name:var(--font-mono)] text-[11px] font-black uppercase tracking-[0.2em]">
              <div className="flex flex-col gap-4">
                <span className="text-[#1a1a1a]/30">Sản phẩm</span>
                <Link href="/luyen-thi/ielts/reading" className="hover:text-[#d9381e] transition-colors">Reading Library</Link>
                <Link href="/luyen-thi/ielts/listening" className="hover:text-[#d9381e] transition-colors">Listening Library</Link>
                <Link href="/luyen-thi/ielts/reading" className="hover:text-[#d9381e] transition-colors">Luyện thi thử</Link>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-[#1a1a1a]/30">Kết nối</span>
                <a href="https://www.facebook.com/harry.workk/" target="_blank" className="hover:text-[#d9381e] transition-colors">Facebook</a>
                <a href="https://www.tiktok.com/@daily_dictation" target="_blank" className="hover:text-[#d9381e] transition-colors">TikTok</a>
                <a href="#donate" className="hover:text-[#d9381e] transition-colors">Ủng hộ</a>
              </div>
            </div>
          </div>
          
          <div className="mt-16 border-t-2 border-[#1a1a1a]/10 pt-8 flex justify-between items-center font-[family-name:var(--font-mono)] text-[10px] font-black uppercase tracking-widest text-[#1a1a1a]/40">
            <span>© 2026 HIN — NAVIGATOR. ALL RIGHTS RESERVED.</span>
            <span>BUILT WITH ❤️ FOR IELTS LEARNERS</span>
          </div>
        </div>
        
        {/* Ticker Tape Footer */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden flex font-[family-name:var(--font-mono)] text-[9px] font-black uppercase tracking-widest text-[#1a1a1a]/30 py-1.5 bg-[#FFD700] border-t-2 border-[#1a1a1a]">
          <div className="animate-marquee gap-8">
            {[...Array(10)].map((_, i) => (
              <span key={i} className="flex gap-8 items-center">
                <span>// LUYỆN THI IELTS KHÔNG GIỚI HẠN // CẬP NHẬT 2026 //</span>
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
