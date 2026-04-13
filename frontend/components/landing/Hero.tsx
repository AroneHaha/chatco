const QR_GRID = [1,1,1,0,1,1,1, 1,0,1,1,1,0,1, 1,1,1,0,1,1,1, 0,1,0,1,0,1,0, 1,1,1,0,0,1,1, 1,0,1,1,1,0,1, 1,1,1,0,1,0,1];

export default function Hero() {
  return (
    <header className="hero-bg relative overflow-hidden pt-16">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#1A5FB4]/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#3584E4]/15 rounded-full blur-[100px]" />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-32 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        <div className="flex-1 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-white/80 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#62A0EA] animate-pulse" />
            Philippines&apos; Smart Jeepney Platform
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
            Commuting<br /><span className="text-[#62A0EA]">Reimagined.</span><br />Payments Digitized.
          </h1>
          <p className="mt-6 text-lg text-white/60 max-w-lg mx-auto lg:mx-0 leading-relaxed">
            CHATCO bridges traditional jeepney operations and modern transport technology — real-time tracking, offline QR payments, and smart fleet management in one ecosystem.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <a href="#how-it-works" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold bg-white text-[#071A2E] hover:bg-gray-100 transition-colors shadow-lg shadow-black/10">
              Get Started Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </a>
            <a href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold border border-white/20 text-white hover:bg-white/10 transition-colors">Login</a>
          </div>
        </div>

        <div className="flex-1 relative w-full max-w-md h-[420px] md:h-[480px]">
          {/* Floating Cards mapped out exactly as before, omitted for brevity but identical to original */}
          <div className="float-a absolute top-2 left-0 w-60 bg-white rounded-2xl shadow-2xl shadow-black/10 p-4 z-10">
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

          <div className="float-b absolute top-28 left-16 w-60 bg-white rounded-2xl shadow-2xl shadow-black/10 p-4 z-20">
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

          <div className="float-c absolute bottom-4 right-0 w-56 bg-[#071A2E] rounded-2xl shadow-2xl shadow-black/20 p-4 text-white z-30">
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
    </header>
    
  );
}