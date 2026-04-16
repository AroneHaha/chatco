"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import FareCalculatorModal from "./modals/fare-calculator-modal";
import QrPaymentModal from "./modals/qr-payment-modal";
import HistoryLogModal from "./modals/history-log-modal";

const ConductorMap = dynamic(() => import("@/components/conductor/conductor-map"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#050F1A]" />,
});

const mockData = {
  name: "Mark",
  plateNumber: "RIZ 2024",
  route: "Quiapo - Taytay",
  passengers: 12,
  walletCollected: 150.0,
  gcashCollected: 216.0,
  isAvailable: true,
  driverName: "Ramon" // Added for receipts
};

export default function ConductorDashboard() {
  const [isAvailable, setIsAvailable] = useState(mockData.isAvailable);
  const [showSheet, setShowSheet] = useState(true);
  const [showFareCalc, setShowFareCalc] = useState(false);
  const [showQrPayment, setShowQrPayment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const quickActions = [
    { 
      label: "Fare Calc", 
      iconPath: "M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007v-.008Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z", 
      action: () => setShowFareCalc(true) 
    },
    { 
      label: "QR Pay", 
      iconPath: "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z", 
      action: () => setShowQrPayment(true) 
    },
  ];

  return (
    <div className="relative h-full w-full bg-[#050F1A]">
      <div className="absolute inset-0 z-0"><ConductorMap /></div>

      {/* --- MOBILE UI --- */}
      <div className="lg:hidden absolute top-0 inset-x-0 z-20 p-4 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-black/40 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
          <h1 className="text-white font-bold text-base">Unit: {mockData.plateNumber}</h1>
          <p className="text-[11px] text-white/50 font-medium">{mockData.route}</p>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <button className="w-10 h-10 rounded-full bg-red-500/20 backdrop-blur-md border border-red-400/30 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
          </button>
          <div className="w-10 h-10 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20">{mockData.name[0]}</div>
        </div>
      </div>

      <div className={`lg:hidden absolute bottom-0 inset-x-0 z-20 bg-[#071A2E] rounded-t-3xl border-t border-white/10 transition-transform duration-300 ease-in-out ${showSheet ? "translate-y-0" : "translate-y-[calc(80%-64px)]"}`}>
        <div className="absolute -top-23 right-4 z-30">
          <button onClick={() => setShowFareCalc(true)} className="w-16 h-16 rounded-full bg-[#1A5FB4] flex items-center justify-center shadow-2xl shadow-blue-500/50 border-4 border-[#071A2E] hover:bg-[#165a9f] transition-colors">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" /></svg>
          </button>
          <span className="block text-center text-[10px] font-extrabold text-white/50 mt-2 uppercase tracking-wider">Scan</span>
        </div>

        <div className="h-16 flex flex-col items-center justify-center cursor-pointer flex-shrink-0" onClick={() => setShowSheet(!showSheet)}>
          <div className={`w-10 h-1 rounded-full transition-colors duration-300 ${showSheet ? "bg-white/30" : "bg-white/60"}`} />
          {!showSheet && (<div className="flex items-center gap-1.5 mt-2 text-white/50"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg><span className="text-[10px] font-semibold uppercase tracking-wider">Shift Status</span></div>)}
        </div>
        
        <div className="px-5 pb-24 overflow-y-auto max-h-[60vh] space-y-5">
          <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4 border border-white/10">
            <div>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Unit Capacity</p>
              <p className="text-lg font-bold text-white mt-0.5">{isAvailable ? "Available" : "Full"}</p>
            </div>
            <button onClick={() => setIsAvailable(!isAvailable)} className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${isAvailable ? 'bg-[#1A5FB4]' : 'bg-gray-600'}`}>
              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${isAvailable ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#1A5FB4]/10 border border-[#1A5FB4]/20 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold text-[#62A0EA]">{mockData.passengers}</p><p className="text-[10px] font-semibold text-[#62A0EA]/60 mt-1 uppercase">Passengers</p></div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold text-purple-400">₱{mockData.walletCollected}</p><p className="text-[10px] font-semibold text-purple-400/60 mt-1 uppercase">Wallet</p></div>
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold text-cyan-400">₱{mockData.gcashCollected}</p><p className="text-[10px] font-semibold text-cyan-400/60 mt-1 uppercase">GCash</p></div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button key={action.label} onClick={action.action} className="flex items-center gap-3 p-3 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/5">
                    <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={action.iconPath} /></svg>
                  </div>
                  <span className="text-sm font-medium text-white/80">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- DESKTOP UI --- */}
      <div className="hidden lg:block absolute bottom-4 right-4 z-10 pointer-events-auto w-[380px] bg-[#071A2E]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-base">Unit: {mockData.plateNumber}</h1>
            <p className="text-[11px] text-white/50 font-medium">{mockData.route}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </button>
            <div className="w-10 h-10 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20">{mockData.name[0]}</div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Scan & History Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setShowFareCalc(true)} className="bg-[#1A5FB4] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-[#165a9f] transition-colors flex flex-col items-center justify-center gap-1">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" /></svg>
              <span className="text-xs">Scan QR</span>
            </button>
            <button onClick={() => setShowHistory(true)} className="bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-bold hover:bg-white/10 transition-colors flex flex-col items-center justify-center gap-1">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              <span className="text-xs">View History</span>
            </button>
          </div>

          <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4 border border-white/10">
            <div>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Unit Capacity</p>
              <p className="text-lg font-bold text-white mt-0.5">{isAvailable ? "Available" : "Full"}</p>
            </div>
            <button onClick={() => setIsAvailable(!isAvailable)} className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${isAvailable ? 'bg-[#1A5FB4]' : 'bg-gray-600'}`}>
              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${isAvailable ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#1A5FB4]/10 border border-[#1A5FB4]/20 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold text-[#62A0EA]">{mockData.passengers}</p><p className="text-[10px] font-semibold text-[#62A0EA]/60 mt-1 uppercase">Passengers</p></div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold text-purple-400">₱{mockData.walletCollected}</p><p className="text-[10px] font-semibold text-purple-400/60 mt-1 uppercase">Wallet</p></div>
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold text-cyan-400">₱{mockData.gcashCollected}</p><p className="text-[10px] font-semibold text-cyan-400/60 mt-1 uppercase">GCash</p></div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button key={action.label} onClick={action.action} className="flex items-center gap-3 p-3 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/5">
                    <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={action.iconPath} /></svg>
                  </div>
                  <span className="text-sm font-medium text-white/80">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      <FareCalculatorModal isOpen={showFareCalc} onClose={() => setShowFareCalc(false)} conductorName={mockData.name} unitNumber={mockData.plateNumber} driverName={mockData.driverName} />
      <QrPaymentModal isOpen={showQrPayment} onClose={() => setShowQrPayment(false)} conductorName={mockData.name} plateNumber={mockData.plateNumber} />
      <HistoryLogModal isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
}