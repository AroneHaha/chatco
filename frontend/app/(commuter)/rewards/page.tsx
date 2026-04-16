"use client";

import { useRewards } from "./use-rewards";
import { Voucher } from "./types";

export default function RewardsPage() {
  const { 
    data, isLoading, progressPercent, ridesRemaining, 
    showVoucherModal, setShowVoucherModal, activeVoucher, redeemVoucher 
  } = useRewards();

  if (isLoading || !data) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#050F1A]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#62A0EA] rounded-full animate-spin" />
      </div>
    );
  }

  const getStatusColor = (status: Voucher["status"]) => {
    switch (status) {
      case "AVAILABLE": return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
      case "ACTIVE": return "border-amber-500/30 bg-amber-500/10 text-amber-400";
      case "USED": return "border-white/10 bg-white/5 text-white/30";
      case "EXPIRED": return "border-red-500/30 bg-red-500/10 text-red-400";
      default: return "";
    }
  };

  return (
    <div className="h-full w-full bg-[#050F1A] overflow-y-auto pb-28 lg:pb-8">
      <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-8">
        
        {/* --- HEADER --- */}
        <div>
          <h1 className="text-white font-bold text-2xl">Rewards</h1>
          <p className="text-white/40 text-sm mt-1">Ride more, save more. Track your loyalty progress here.</p>
        </div>

        {/* --- PROGRESS RING SECTION --- */}
        <div className="bg-[#071A2E] border border-white/10 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-xl shadow-black/20">
          
          {/* Circular Progress */}
          <div className="relative w-48 h-48 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="40" fill="none" 
                stroke={progressPercent === 100 ? "#10B981" : "#1A5FB4"} 
                strokeWidth="8" 
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`} 
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercent / 100)}`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-white">{data.currentCycleRides}</span>
              <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">of {data.ridesNeeded} rides</span>
            </div>
          </div>

          {/* Text Info */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-white font-bold text-xl mb-2">
              {ridesRemaining === 0 ? "Free Ride Unlocked! 🎉" : `${ridesRemaining} Rides to Free Ride`}
            </h2>
            <p className="text-white/40 text-sm mb-6">
              Complete {data.ridesNeeded} cashless rides to earn a free ride voucher. Your total completed rides: <span className="text-[#62A0EA] font-bold">{data.totalRides}</span>.
            </p>
            <div className="flex gap-3 justify-center md:justify-start">
              <div className="bg-[#050F1A] border border-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-[10px] text-white/40 uppercase font-semibold">Total Rides</p>
                <p className="text-lg font-bold text-white">{data.totalRides}</p>
              </div>
              <div className="bg-[#050F1A] border border-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-[10px] text-white/40 uppercase font-semibold">Vouchers Available</p>
                <p className="text-lg font-bold text-emerald-400">{data.vouchers.filter(v => v.status === "AVAILABLE").length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- VOUCHERS LIST --- */}
        <div>
          <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">My Vouchers</h3>
          <div className="space-y-4">
            {data.vouchers.map(voucher => (
              <div key={voucher.id} className={`border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${getStatusColor(voucher.status)}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-base">Free Ride Voucher</h4>
                    <p className="text-xs opacity-70 mt-0.5">Source: {voucher.rideOrigin} • Exp: {new Date(voucher.expiresAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  {voucher.status === "AVAILABLE" && (
                    <button 
                      onClick={() => redeemVoucher(voucher.id)}
                      className="bg-[#FF6D3A] hover:bg-[#e55a2b] text-white text-sm font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-[#FF6D3A]/30 transition-colors"
                    >
                      Use Voucher
                    </button>
                  )}
                  {voucher.status === "ACTIVE" && (
                    <span className="text-sm font-bold uppercase tracking-wider animate-pulse">Active - Show to Conductor</span>
                  )}
                  {voucher.status === "USED" && (
                    <span className="text-sm font-bold uppercase tracking-wider opacity-50">Redeemed</span>
                  )}
                </div>
              </div>
            ))}

            {data.vouchers.length === 0 && (
              <div className="text-center py-12 bg-[#071A2E] rounded-2xl border border-white/10">
                <p className="text-white/40 text-sm">No vouchers yet. Keep riding to earn your first free ride!</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- ACTIVE VOUCHER MODAL --- */}
      {showVoucherModal && activeVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowVoucherModal(false)}>
          <div className="bg-[#071A2E] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center border-b border-white/10">
              <h2 className="text-white font-bold text-xl">Voucher Activated!</h2>
              <p className="text-white/40 text-xs mt-1">Show this screen to the conductor</p>
            </div>
            <div className="p-8 flex flex-col items-center justify-center flex-1 bg-[#050F1A]">
              <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center shadow-lg mb-4">
                {/* Mock QR Code */}
                <div className="grid grid-cols-5 gap-1 w-24 h-24">
                  {Array.from({length: 25}).map((_, i) => (
                    <div key={i} className={`w-full h-full rounded-sm ${Math.random() > 0.3 ? 'bg-black' : 'bg-white'}`}></div>
                  ))}
                </div>
              </div>
              <p className="text-emerald-400 font-extrabold text-lg tracking-widest mt-2">{activeVoucher}</p>
            </div>
            <div className="p-4 border-t border-white/10">
              <button onClick={() => setShowVoucherModal(false)} className="w-full bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold py-3 rounded-xl border border-white/10 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}