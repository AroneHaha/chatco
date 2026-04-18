"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import FareCalculatorModal from "./modals/fare-calculator-modal";
import HistoryLogModal from "./modals/history-log-modal";

const ConductorMap = dynamic(() => import("@/components/conductor/conductor-map"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#050F1A]" />,
});

const mockData = {
  name: "Mark",
  conductorId: "CON-001",
  shiftId: "SHF-001",
  plateNumber: "RIZ 2024",
  route: "Quiapo - Taytay",
  passengers: 12,
  scannedCollected: 150.0,
  prepaidCollected: 88.5,
  isAvailable: true,
  driverName: "Ramon",
};

export default function ConductorDashboard() {
  const [isAvailable, setIsAvailable] = useState(mockData.isAvailable);
  const [showFareCalc, setShowFareCalc] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mobileCardExpanded, setMobileCardExpanded] = useState(true);

  const totalCollected = mockData.scannedCollected + mockData.prepaidCollected;

  useEffect(() => {
    const handler = () => setShowFareCalc(true);
    window.addEventListener("conductor:scan-qr", handler);
    return () => window.removeEventListener("conductor:scan-qr", handler);
  }, []);

  return (
    <div className="relative h-full w-full bg-[#050F1A]">

            {/* ========== MAP (always behind everything) ========== */}
      <div className="fixed inset-0 z-0">
        <ConductorMap />
      </div>

      {/* ========== MOBILE: TOP CARD (overlay, does not push map) ========== */}
      <div className="lg:hidden absolute top-0 inset-x-0 z-20 bg-[#071A2E]/95 backdrop-blur-xl border-b border-white/10 flex flex-col">
        
        {/* Header Row */}
        <div className="flex items-center justify-between p-4 pb-3 flex-shrink-0">
          <div>
            <h1 className="text-white font-bold text-base">Unit: {mockData.plateNumber}</h1>
            <p className="text-[11px] text-white/50 font-medium">{mockData.route}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-95">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </button>
            <div className="w-9 h-9 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 border-white/20">{mockData.name[0]}</div>
          </div>
        </div>

        {/* Collapsible Content */}
        <div className={`grid transition-all duration-300 ease-in-out ${
          mobileCardExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}>
          <div className="overflow-hidden">
            <div className="px-4 pb-3 space-y-2.5">
              
              {/* Combined Row: Toggle (Left) + History (Right) */}
              <div className="flex items-center gap-2.5">
                <div className="flex-1 flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isAvailable ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-gray-500'}`} />
                    <div>
                      <p className="text-sm font-bold text-white leading-none">{isAvailable ? "Available" : "Full"}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">Capacity</p>
                    </div>
                  </div>
                  <button onClick={() => setIsAvailable(!isAvailable)} className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${isAvailable ? 'bg-[#1A5FB4]' : 'bg-gray-600'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${isAvailable ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <button onClick={() => setShowHistory(true)} className="flex items-center justify-center gap-1.5 bg-white/5 border border-white/10 text-white/70 px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition-colors active:scale-[0.98] flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  <span>History</span>
                </button>
              </div>

              {/* Shift Summary */}
              <div className="bg-[#1A5FB4]/10 border border-[#1A5FB4]/20 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-semibold text-[#62A0EA]/60 uppercase tracking-wider">Collected</p>
                    <p className="text-xl font-extrabold text-[#62A0EA] mt-0.5">₱{totalCollected.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">Passengers</p>
                    <p className="text-xl font-extrabold text-white mt-0.5">{mockData.passengers}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                    <p className="text-[8px] font-semibold text-purple-400/60 uppercase tracking-wider">Scanned</p>
                    <p className="text-sm font-extrabold text-purple-400 mt-0.5">₱{mockData.scannedCollected.toFixed(2)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                    <p className="text-[8px] font-semibold text-emerald-400/60 uppercase tracking-wider">Prepaid</p>
                    <p className="text-sm font-extrabold text-emerald-400 mt-0.5">₱{mockData.prepaidCollected.toFixed(2)}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Bottom Expand/Collapse Handle */}
        <button 
          onClick={() => setMobileCardExpanded(!mobileCardExpanded)} 
          className="flex-shrink-0 flex flex-col items-center justify-center py-2 w-full border-t border-white/5 hover:bg-white/5 transition-colors active:bg-white/10"
        >
          <div className={`w-8 h-1 rounded-full transition-all duration-300 ${
            mobileCardExpanded ? "bg-white/30 rotate-180" : "bg-white/50"
          }`} />
        </button>
      </div>

      {/* ========== DESKTOP: FLOATING CARD ========== */}
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

        <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
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

          <div className="bg-[#1A5FB4]/10 border border-[#1A5FB4]/20 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-[#62A0EA]/60 uppercase tracking-wider">Total Collected</p>
                <p className="text-3xl font-extrabold text-[#62A0EA] mt-1">₱{totalCollected.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Total Passengers</p>
                <p className="text-3xl font-extrabold text-white mt-1">{mockData.passengers}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] font-semibold text-purple-400/60 uppercase tracking-wider">Scanned</p>
                <p className="text-lg font-extrabold text-purple-400 mt-0.5">₱{mockData.scannedCollected.toFixed(2)}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-wider">Prepaid</p>
                <p className="text-lg font-extrabold text-emerald-400 mt-0.5">₱{mockData.prepaidCollected.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== MODALS ========== */}
      <FareCalculatorModal
        isOpen={showFareCalc}
        onClose={() => setShowFareCalc(false)}
        conductorName={mockData.name}
        unitNumber={mockData.plateNumber}
        driverName={mockData.driverName}
      />
      <HistoryLogModal isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
}