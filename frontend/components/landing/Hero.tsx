// components/landing/Hero.tsx
"use client";

const QR_GRID = [1,1,1,0,1,1,1, 1,0,1,1,1,0,1, 1,1,1,0,1,1,1, 0,1,0,1,0,1,0, 1,1,1,0,0,1,1, 1,0,1,1,1,0,1, 1,1,1,0,1,0,1];

const ModernJeepSilhouette = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1024 320" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M120 280 L120 180 C120 160 140 140 100 140 L80 140 C60 140 40 120 40 100 L40 100 L80 80 L100 80 L160 80 C180 80 200 60 220 60 L800 60 C820 60 840 80 860 80 L920 80 L940 100 L940 100 C940 120 920 140 900 140 L880 140 C840 140 820 160 820 180 L820 280 M180 280 L180 200 C180 200 200 220 220 220 L800 220 C820 220 840 200 840 200 L840 280" 
          fill="url(#jeep-gradient)" />
    <path d="M120 180 C120 160 140 140 100 140 L80 140 C60 140 40 120 40 100 L40 100 L80 80 L100 80 L160 80 C180 80 200 60 220 60 L800 60 C820 60 840 80 860 80 L920 80 L940 100 L940 100 C940 120 920 140 900 140 L880 140 C840 140 820 160 820 180 L820 280 M180 280 L180 200 C180 200 200 220 220 220 L800 220 C820 220 840 200 840 200 L840 280" 
          stroke="url(#jeep-stroke)" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M240 90 L240 210 L500 210 L500 90 Z" fill="rgba(255,255,255,0.1)" />
    <path d="M520 90 L520 210 L780 210 L780 90 Z" fill="rgba(255,255,255,0.1)" />
    <circle cx="220" cy="280" r="40" fill="#0F172A" />
    <circle cx="220" cy="280" r="24" fill="#1E293B" />
    <circle cx="800" cy="280" r="40" fill="#0F172A" />
    <circle cx="800" cy="280" r="24" fill="#1E293B" />
    <rect x="40" y="110" width="30" height="20" rx="4" fill="#62A0EA" opacity="0.6"/>
    <rect x="910" y="110" width="30" height="20" rx="4" fill="#FF4444" opacity="0.6"/>
    <defs>
      <linearGradient id="jeep-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#62A0EA" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#1A5FB4" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id="jeep-stroke" x1="0" y1="0" x2="1024" y2="0">
        <stop offset="0%" stopColor="#62A0EA" stopOpacity="0.4" />
        <stop offset="50%" stopColor="#99C1F1" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#62A0EA" stopOpacity="0.4" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Hero() {
  return (
    <header className="relative overflow-hidden bg-[#071A2E] pt-28 pb-16 md:pt-32 md:pb-24 min-h-screen flex items-center">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-[#1A5FB4]/30 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#3584E4]/20 rounded-full blur-[120px]" />

      {/* MASSIVE HALF-SCREEN BACKGROUND E-JEEP */}
      <div className="absolute right-0 top-0 h-full w-1/2 pointer-events-none z-0 -scale-x-100 opacity-[0.15]">
        <ModernJeepSilhouette className="w-full h-full object-contain object-left object-bottom" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 md:px-8 w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        
        {/* Left Content */}
        <div className="flex-1 text-center lg:text-left max-w-xl relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/60 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Now boarding smarter
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
            The Future of <br />
            <span className="bg-gradient-to-r from-[#62A0EA] to-[#99C1F1] bg-clip-text text-transparent">Jeepney Rides.</span>
          </h1>
          
          <p className="mt-6 text-lg text-white/50 leading-relaxed">
            Experience seamless commuting with real-time tracking, cashless QR payments, and AI-powered safety features—all in your pocket.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <a href="#how-it-works" className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-all shadow-xl shadow-[#1A5FB4]/30 hover:shadow-2xl hover:shadow-[#1A5FB4]/40">
              Start Riding
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </a>
            <a href="#features" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-2xl text-base font-semibold border border-white/20 text-white hover:bg-white/5 transition-all">
              Learn More
            </a>
          </div>

          {/* MOBILE ONLY JEEPNEY */}
          <div className="mt-12 md:hidden opacity-70 -scale-x-100">
            <ModernJeepSilhouette className="w-full max-w-md mx-auto" />
          </div>
        </div>

        {/* Right Content - FOOLPROOF GRID (Zero Overlap Guarantee) */}
        <div className="flex-1 relative w-full max-w-5xl h-[500px] md:h-[750px] hidden md:flex items-center justify-center">
          
          <div className="relative z-10 h-full w-full grid grid-cols-[minmax(0,_230px)_auto_minmax(0,_230px)] gap-x-6 items-center md:items-end pt-16 md:pt-0">
            
            {/* Column 1: Floating Cards */}
            <div className="flex flex-col gap-20 items-end justify-end pr-6">
              {/* Live Tracking Card */}
              <div className="w-56 bg-white rounded-2xl shadow-2xl shadow-black/10 p-4 float-animation-1">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Live Tracking</div>
                <div className="h-28 bg-[#DAEEFF] rounded-xl relative overflow-hidden">
                  <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(#1A5FB4 1px, transparent 1px), linear-gradient(90deg, #1A5FB4 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                  <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[#1A5FB4]/30" />
                  <div className="absolute top-[30%] left-[15%] w-4 h-4 bg-[#1A5FB4] rounded-full shadow-lg shadow-[#1A5FB4]/40 animate-pulse" />
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[11px] text-gray-500">En route — 3 min away</span>
                </div>
              </div>

              {/* Scan to Pay Card */}
              <div className="w-56 bg-white rounded-2xl shadow-2xl shadow-black/10 p-4 float-animation-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Scan to Pay</div>
                <div className="flex items-center gap-3">
                  <div className="grid grid-cols-7 gap-[2px] w-14 h-14 flex-shrink-0">
                    {QR_GRID.map((v, i) => (<div key={i} className={`rounded-[1px] ${v ? "bg-[#071A2E]" : "bg-gray-100"}`} />))}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">₱13.00</div>
                    <div className="text-[11px] text-gray-400">Cubao to QC</div>
                    <div className="mt-1 text-[10px] font-semibold text-green-600 flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-2 h-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      </span>
                      Paid
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#050F1A] rounded-[2.5rem] border-[6px] border-gray-700 shadow-2xl shadow-black/50 overflow-hidden w-[260px] md:w-[300px] h-[560px] md:h-[640px] flex-shrink-0 mx-auto justify-self-center flex flex-col">
              {/* Notch */}
              <div className="flex-shrink-0 mt-3 mx-auto w-28 h-6 bg-gray-700 rounded-lg" />
              
            
              <div className="flex-1 flex flex-col min-h-0 px-4 pt-3 pb-4">
                {/* Map area — flex-1 + min-h-0 so it fills all remaining space */}
                <div className="flex-1 min-h-0 bg-[#DAEEFF] rounded-2xl relative overflow-hidden mb-3">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(#1A5FB4 1px, transparent 1px), linear-gradient(90deg, #1A5FB4 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                  <div className="absolute top-[45%] left-0 right-0 h-[2px] bg-[#1A5FB4]/40" />
                  <div className="absolute top-[45%] left-[20%] w-5 h-5 bg-[#1A5FB4] rounded-full shadow-lg shadow-[#1A5FB4]/50 animate-pulse border-2 border-white" />
                  <div className="absolute top-[45%] left-[20%] w-10 h-10 bg-[#1A5FB4]/10 rounded-full animate-ping" />
                </div>
                {/* Info card — flex-shrink-0 so it never collapses */}
                <div className="flex-shrink-0 bg-[#071A2E] rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-xs font-bold">ABC</div>
                      <div>
                        <p className="text-xs font-semibold">Jeep ABC-123</p>
                        <p className="text-[10px] text-white/50">En route • 3 min</p>
                      </div>
                    </div>
                    <div className="px-2 py-1 bg-green-500/20 rounded-full">
                      <span className="text-[10px] text-green-400 font-bold">LIVE</span>
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                    <div className="text-white/60 text-xs">Fare to pay:</div>
                    <div className="text-white font-bold text-lg">₱13.00</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Digital Wallet */}
            <div className="flex flex-col items-start justify-end pl-6 pb-16">
              <div className="w-52 bg-[#071A2E] rounded-2xl shadow-2xl shadow-black/20 p-4 text-white float-animation-3">
                <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Digital Wallet</div>
                <div className="text-2xl font-bold">₱487.50</div>
                <div className="text-[11px] text-white/50 mt-0.5">Available Balance</div>
                <div className="mt-3 flex gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] font-medium text-white/70">+ Top Up</span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#1A5FB4] text-[10px] font-medium text-white">Receipts</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .float-animation-1 { animation: float1 6s ease-in-out infinite; }
        .float-animation-2 { animation: float2 7s ease-in-out infinite 1s; }
        .float-animation-3 { animation: float3 5s ease-in-out infinite 0.5s; }
      `}</style>
    </header>
  );
}