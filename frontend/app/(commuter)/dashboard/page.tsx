"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { User } from "@/app/types/user.types";

import ShowQRModal from "@/components/commuter/modals/show-qr-modal";
import FareCalcModal from "@/components/commuter/modals/fare-calc-modal";
import TopUpModal from "@/components/commuter/modals/top-up-modal";
import PaymentHistoryModal from "@/components/commuter/modals/payment-history-modal";
import ShareRideModal from "@/components/commuter/modals/share-ride-modal";
import SosModal from "@/components/commuter/modals/sos-modal"; 

const CommuterMap = dynamic(() => import("@/components/commuter/commuter-map/commuter-map"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#050F1A]" />,
});

const mockUser: User = {
  id: "c_001",
  firstName: "Arone",
  surname: "Dela Cruz",
  commuterType: "Regular",
  balance: 487.5,
};

export default function CommuterHome() {
  const [showQR, setShowQR] = useState(false);
  const [showFareCalc, setShowFareCalc] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShareRide, setShowShareRide] = useState(false);
  const [showSOS, setShowSOS] = useState(false); 
  const [isHailing, setIsHailing] = useState(false);
  const [showSheet, setShowSheet] = useState(true);

  const quickActions = [
    { label: "Show QR", iconPath: "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z", action: () => setShowQR(true), isSos: false },
    { label: "Fare Calc", iconPath: "M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007v-.008Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z", action: () => setShowFareCalc(true), isSos: false },
    { label: "Share Ride", iconPath: "M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z", action: () => setShowShareRide(true), isSos: false },
    { label: "SOS", iconPath: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z", action: () => setShowSOS(true), isSos: true }
  ];

  return (
    <div className="relative h-full w-full bg-[#050F1A]">
      
      {/* --- ACTUAL MAP --- */}
      {/* Shrinks right side on desktop to perfectly center the map in the remaining space */}
      <div className="absolute inset-0 z-0 lg:right-[336px] xl:right-[400px]">
        <CommuterMap />
      </div>

      {/* ========================================== */}
      {/* --- MOBILE UI (Hidden on Desktop) --- */}
      {/* ========================================== */}
      
      <div className="lg:hidden absolute top-0 inset-x-0 z-20 p-4 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-black/40 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
          <h1 className="text-white font-bold text-base">Good morning, {mockUser.firstName}!</h1>
          <span className="text-[10px] font-semibold text-[#62A0EA] bg-[#62A0EA]/10 px-2 py-0.5 rounded-full mt-1 inline-block">{mockUser.commuterType}</span>
        </div>
        <div className="pointer-events-auto w-10 h-10 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20">{mockUser.firstName[0]}</div>
      </div>

      <div className={`lg:hidden absolute bottom-0 inset-x-0 z-20 bg-[#071A2E] rounded-t-3xl border-t border-white/10 transition-transform duration-300 ease-in-out ${showSheet ? "translate-y-0" : "translate-y-[calc(80%-64px)]"}`}>
        <div className="absolute -top-23 right-4 z-30">
          <button onClick={() => setIsHailing(!isHailing)} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border-4 ${isHailing ? "bg-red-500 border-red-300 shadow-red-500/50 animate-bounce" : "bg-[#FF6D3A] border-[#FF9A76] hover:bg-[#e55a2b] shadow-[#FF6D3A]/50"}`}>
            {isHailing ? (<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>) : (<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>)}
          </button>
          <span className="block text-center text-[10px] font-extrabold text-white mt-2 drop-shadow-lg uppercase tracking-wider">{isHailing ? "Cancel" : "Hail Me"}</span>
        </div>
        <div className="h-16 flex flex-col items-center justify-center cursor-pointer flex-shrink-0" onClick={() => setShowSheet(!showSheet)}>
          <div className={`w-10 h-1 rounded-full transition-colors duration-300 ${showSheet ? "bg-white/30" : "bg-white/60"}`} />
          {!showSheet && (<div className="flex items-center gap-1.5 mt-2 text-white/50"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg><span className="text-[10px] font-semibold uppercase tracking-wider">Wallet & Tools</span></div>)}
        </div>
        <div className="px-5 pb-24 overflow-y-auto max-h-[60vh]">
          <div className="bg-gradient-to-br from-[#1A5FB4] to-[#164A8F] rounded-2xl p-5 shadow-xl shadow-[#1A5FB4]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <p className="text-white/70 text-xs font-medium mb-1">My Wallet Balance</p>
            <h2 className="text-white text-3xl font-extrabold tracking-tight">₱ {mockUser.balance.toLocaleString()}</h2>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowTopUp(true)} className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-semibold py-2.5 rounded-lg transition-colors">+ Top Up</button>
              <button onClick={() => setShowHistory(true)} className="flex-1 bg-white text-[#071A2E] text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-100 transition-colors">View History</button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-5">
            {quickActions.map((action) => (
              <button key={action.label} onClick={action.action} className="flex flex-col items-center gap-1.5 group">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-colors ${action.isSos ? "bg-red-500/10 border-red-500/30 group-hover:bg-red-500/20" : "bg-white/5 border-white/10 group-hover:bg-white/10"}`}>
                  <svg className={`w-6 h-6 transition-colors ${action.isSos ? "text-red-400" : "text-white/60"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={action.iconPath} /></svg>
                </div>
                <span className={`text-[10px] font-medium ${action.isSos ? "text-red-400" : "text-white/40"}`}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* --- DESKTOP UI (Hidden on Mobile) --- */}
      {/* ========================================== */}
      <div className="hidden lg:flex absolute right-4 top-4 bottom-4 w-80 xl:w-96 z-20 bg-[#071A2E]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex-col overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">Good morning, {mockUser.firstName}!</h1>
            <span className="text-xs font-semibold text-[#62A0EA] bg-[#62A0EA]/10 px-2 py-0.5 rounded-full mt-1 inline-block">{mockUser.commuterType}</span>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20 text-base">{mockUser.firstName[0]}</div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="bg-gradient-to-br from-[#1A5FB4] to-[#164A8F] rounded-2xl p-5 shadow-xl shadow-[#1A5FB4]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <p className="text-white/70 text-xs font-medium mb-1">My Wallet Balance</p>
            <h2 className="text-white text-3xl font-extrabold tracking-tight">₱ {mockUser.balance.toLocaleString()}</h2>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowTopUp(true)} className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">+ Top Up</button>
              <button onClick={() => setShowHistory(true)} className="flex-1 bg-white text-[#071A2E] text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-100 transition-colors">View History</button>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button key={action.label} onClick={action.action} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${action.isSos ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${action.isSos ? "bg-red-500/20" : "bg-white/5"}`}>
                    <svg className={`w-5 h-5 ${action.isSos ? "text-red-400" : "text-white/60"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={action.iconPath} /></svg>
                  </div>
                  <span className={`text-sm font-medium ${action.isSos ? "text-red-400" : "text-white/80"}`}>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-white/10">
          <button onClick={() => setIsHailing(!isHailing)} className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl text-base font-bold transition-all duration-300 ${isHailing ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40" : "bg-[#FF6D3A] hover:bg-[#e55a2b] shadow-lg shadow-[#FF6D3A]/40 text-white"}`}>
            {isHailing ? (<><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg> Cancel Hail</>) : (<><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg> Hail Me</>)}
          </button>
        </div>
      </div>

      {/* --- MODALS --- */}
      {showQR && <ShowQRModal user={mockUser} onClose={() => setShowQR(false)} />}
      {showFareCalc && <FareCalcModal onClose={() => setShowFareCalc(false)} />}
      {showTopUp && <TopUpModal currentBalance={mockUser.balance} onClose={() => setShowTopUp(false)} />}
      {showHistory && <PaymentHistoryModal onClose={() => setShowHistory(false)} />}
      {showShareRide && <ShareRideModal commuterName={mockUser.firstName} onClose={() => setShowShareRide(false)} />}
      {showSOS && <SosModal commuterId={mockUser.id} commuterName={mockUser.firstName} onClose={() => setShowSOS(false)} />}
    </div>
  );
}