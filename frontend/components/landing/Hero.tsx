// components/landing/Hero.tsx
"use client";

import { motion } from "framer-motion";

const QR_GRID = [1,1,1,0,1,1,1, 1,0,1,1,1,0,1, 1,1,1,0,1,1,1, 0,1,0,1,0,1,0, 1,1,1,0,0,1,1, 1,0,1,1,1,0,1, 1,1,1,0,1,0,1];

export default function Hero() {
  return (
    <header className="relative overflow-hidden bg-[#071A2E] pt-28 pb-16 md:pt-32 md:pb-24 min-h-screen flex items-center">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-[#1A5FB4]/20 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#3584E4]/10 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8 w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        
        {/* Left Content */}
        <motion.div 
          className="flex-1 text-center lg:text-left max-w-xl relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
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
            <a href="/login" className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-all shadow-xl shadow-[#1A5FB4]/30 hover:shadow-2xl hover:shadow-[#1A5FB4]/40">
              Create Account
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </a>
            <a href="#features" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-2xl text-base font-semibold border border-white/20 text-white hover:bg-white/5 transition-all">
              Learn More
            </a>
          </div>
        </motion.div>

        {/* Right Content - Cohesive Product Showcase */}
        <div className="flex-1 relative w-full hidden lg:flex items-center justify-center h-[700px] perspective-[1200px]">
          
          {/* Main Phone Mockup */}
          <motion.div 
            className="relative z-20"
            initial={{ opacity: 0, y: 60, rotateY: 10 }}
            animate={{ opacity: 1, y: 0, rotateY: -5 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="bg-[#050F1A] rounded-[2.5rem] border-[6px] border-gray-700 shadow-2xl shadow-black/50 overflow-hidden w-[280px] h-[600px] flex flex-col">
              {/* Notch */}
              <div className="flex-shrink-0 mt-3 mx-auto w-28 h-6 bg-gray-700 rounded-lg" />
            
              <div className="flex-1 flex flex-col min-h-0 px-4 pt-3 pb-4">
                {/* Map area */}
                <div className="flex-1 min-h-0 bg-[#DAEEFF] rounded-2xl relative overflow-hidden mb-3">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(#1A5FB4 1px, transparent 1px), linear-gradient(90deg, #1A5FB4 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                  <div className="absolute top-[45%] left-0 right-0 h-[2px] bg-[#1A5FB4]/40" />
                  <div className="absolute top-[45%] left-[20%] w-5 h-5 bg-[#1A5FB4] rounded-full shadow-lg shadow-[#1A5FB4]/50 animate-pulse border-2 border-white" />
                  <div className="absolute top-[45%] left-[20%] w-10 h-10 bg-[#1A5FB4]/10 rounded-full animate-ping" />
                </div>
                
                {/* Info card */}
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
          </motion.div>

          {/* 1. Push Notification - Top Left */}
          <motion.div 
            className="absolute top-16 -left-8 z-30"
            initial={{ opacity: 0, x: -40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
          >
            <div className="w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-black/10 p-3.5 border border-gray-100/80">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1A5FB4] flex items-center justify-center flex-shrink-0 shadow-inner">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-gray-800">CHATCO Tracker</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Your jeep is 3 mins away! 🚐</p>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">now</span>
              </div>
            </div>
          </motion.div>

          {/* 2. Digital Wallet Card - Top Right */}
          <motion.div 
            className="absolute top-12 -right-12 z-30"
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 1.3, ease: "easeOut" }}
          >
            <div className="w-60 bg-[#071A2E]/95 backdrop-blur-md rounded-2xl shadow-xl shadow-black/20 p-4 border border-white/10 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Digital Wallet</span>
                <div className="w-5 h-5 rounded-full bg-[#1A5FB4] flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight">₱487.50</div>
              <div className="text-[11px] text-white/40 mt-1">Available Balance</div>
              <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] font-medium text-white/70">Top Up</span>
                <span className="px-2.5 py-1 rounded-lg bg-[#1A5FB4] text-[10px] font-medium text-white">History</span>
              </div>
            </div>
          </motion.div>

          {/* 3. Pick Me Up Signal - Bottom Left */}
          <motion.div 
            className="absolute bottom-24 -left-16 z-30"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 1.6, ease: "easeOut" }}
          >
            <div className="w-56 bg-gradient-to-br from-[#FF6D3A] to-[#e55a2b] rounded-2xl shadow-xl shadow-[#FF6D3A]/20 p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                   <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold">Pick Me Up</p>
                  <p className="text-[10px] text-white/80">Signal sent!</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-semibold bg-white/20 rounded-lg px-2.5 py-1.5 w-fit">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Finding nearby jeeps...
              </div>
            </div>
          </motion.div>

          {/* 4. Digital Receipt - Bottom Right */}
          <motion.div 
            className="absolute bottom-20 -right-10 z-30"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
          >
            <div className="w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-black/10 p-4 border border-gray-100/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-800">Payment Success</span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  Paid
                </span>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-2 border border-gray-100">
                <div className="grid grid-cols-7 gap-[2px] w-10 h-10 flex-shrink-0">
                  {QR_GRID.map((v, i) => (<div key={i} className={`rounded-[1px] ${v ? "bg-[#071A2E]" : "bg-gray-200"}`} />))}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">₱13.00</div>
                  <div className="text-[10px] text-gray-400">Calumpit → Meycauayan</div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </header>
  );
}