"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import FareCalculatorModal from "@/components/conductor/modals/fare-calculator-modal";
import HistoryLogModal from "@/components/conductor/modals/history-log-modal";
import { getActiveShift, getElapsed, formatTime } from "@/lib/conductor-shift";
import type { ConductorShift } from "@/lib/conductor-shift";
import { getShiftTransactions } from "@/lib/conductor-transactions";

const ConductorMap = dynamic(() => import("@/components/conductor/conductor-map"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#050F1A]" />,
});

export default function ConductorDashboard() {
  const [shift, setShift] = useState<ConductorShift | null>(null);
  const [elapsed, setElapsed] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [showFareCalc, setShowFareCalc] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mobileCardExpanded, setMobileCardExpanded] = useState(true);

  const [liveTransactions, setLiveTransactions] = useState<{ scanned: number; prepaid: number; voucher: number; total: number }>({
    scanned: 0,
    prepaid: 0,
    voucher: 0,
    total: 0,
  });

  // Load shift and compute totals
  useEffect(() => {
    const load = () => {
      const s = getActiveShift();
      setShift(s);
      if (s) {
        setElapsed(getElapsed(s));

        const txns = getShiftTransactions(s.shiftId);
        const scanned = txns.filter((t) => t.paymentMethod === "Wallet_Scanned").reduce((sum, t) => sum + t.finalAmount, 0);
        const prepaid = txns.filter((t) => t.paymentMethod === "Wallet_Prepay").reduce((sum, t) => sum + t.finalAmount, 0);
        const voucher = txns.filter((t) => t.paymentMethod === "Voucher").reduce((sum, t) => sum + t.finalAmount, 0);
        setLiveTransactions({ scanned, prepaid, voucher, total: scanned + prepaid + voucher });
      }
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch totals when a transaction is saved
  useEffect(() => {
    const handler = () => {
      const s = getActiveShift();
      if (s) {
        const txns = getShiftTransactions(s.shiftId);
        const scanned = txns.filter((t) => t.paymentMethod === "Wallet_Scanned").reduce((sum, t) => sum + t.finalAmount, 0);
        const prepaid = txns.filter((t) => t.paymentMethod === "Wallet_Prepay").reduce((sum, t) => sum + t.finalAmount, 0);
        const voucher = txns.filter((t) => t.paymentMethod === "Voucher").reduce((sum, t) => sum + t.finalAmount, 0);
        setLiveTransactions({ scanned, prepaid, voucher, total: scanned + prepaid + voucher });
      }
    };
    window.addEventListener("conductor:transaction-updated", handler);
    return () => window.removeEventListener("conductor:transaction-updated", handler);
  }, []);

  // >>> FIX 1a: Listen for the scan button from bottom nav <<<
  useEffect(() => {
    const handler = () => setShowFareCalc(true);
    window.addEventListener("conductor:scan-qr", handler);
    return () => window.removeEventListener("conductor:scan-qr", handler);
  }, []);

  const conductorName = shift?.conductorName || "—";
  const unitNumber = shift?.unitNumber || "—";
  const route = shift?.route || "—";
  const driverName = shift?.driverName || "—";

  return (
    <div className="relative h-full w-full bg-[#050F1A] flex flex-col lg:block">

      {/* ========== MOBILE: TOP CARD ========== */}
      <div className="lg:hidden flex-shrink-0 bg-[#071A2E]/95 backdrop-blur-xl z-20 border-b border-white/10">
        
        {/* Header Row — always visible */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-sm truncate">Unit: {unitNumber}</h1>
              {elapsed && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-400/80 tabular-nums">{elapsed}</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-white/40 font-medium mt-0.5 truncate">{route}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <button className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-95">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold text-xs shadow-lg border-2 border-white/20">{conductorName[0]}</div>
          </div>
        </div>

        {/* Collapsible Content */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: mobileCardExpanded ? "200px" : "0px" }}
        >
          <div className="px-4 pb-3 space-y-2.5">
            
            {/* Toggle + History row */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isAvailable ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-gray-500'}`} />
                  <span className="text-xs font-bold text-white">{isAvailable ? "Available" : "Full"}</span>
                </div>
                <button onClick={() => setIsAvailable(!isAvailable)} className={`relative w-10 h-[22px] rounded-full transition-colors duration-300 ${isAvailable ? 'bg-[#1A5FB4]' : 'bg-gray-600'}`}>
                  <div className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${isAvailable ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                </button>
              </div>

              <button onClick={() => setShowHistory(true)} className="flex items-center justify-center gap-1 bg-white/5 border border-white/10 text-white/70 px-3 py-2 rounded-xl text-[10px] font-semibold hover:bg-white/10 transition-colors active:scale-[0.98] flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <span>History</span>
              </button>
            </div>

            {/* Collection Summary */}
            <div className="bg-[#1A5FB4]/10 border border-[#1A5FB4]/20 rounded-xl p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-semibold text-[#62A0EA]/60 uppercase tracking-wider">Total Collected</p>
                <p className="text-lg font-extrabold text-[#62A0EA]">₱{liveTransactions.total.toFixed(2)}</p>                
                </div>
                <div className="flex gap-2">
                  <div className="bg-white/5 rounded-lg px-2 py-1.5 border border-white/5">
                    <p className="text-[7px] font-semibold text-purple-400/60 uppercase tracking-wider">Scanned</p>
                    <p className="text-xs font-extrabold text-purple-400 leading-tight">₱{liveTransactions.scanned.toFixed(2)}</p>                  
                    </div>
                  <div className="bg-white/5 rounded-lg px-2 py-1.5 border border-white/5">
                    <p className="text-[7px] font-semibold text-emerald-400/60 uppercase tracking-wider">Prepaid</p>
                    <p className="text-xs font-extrabold text-emerald-400 leading-tight">₱{liveTransactions.prepaid.toFixed(2)}</p>                  
                    </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Collapse Handle */}
        <button 
          onClick={() => setMobileCardExpanded(!mobileCardExpanded)} 
          className="flex-shrink-0 flex items-center justify-center py-1.5 w-full border-t border-white/5 hover:bg-white/5 transition-colors active:bg-white/10"
        >
          <svg
            className={`w-4 h-4 text-white/30 transition-transform duration-300 ${mobileCardExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* ========== DESKTOP: FLOATING CARD ========== */}
      <div className="hidden lg:block absolute bottom-4 right-4 z-10 pointer-events-auto w-[380px] bg-[#071A2E]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-base">Unit: {unitNumber}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-white/50 font-medium">{route}</p>
              {elapsed && (
                <>
                  <span className="text-white/15">·</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-semibold text-emerald-400/80 tabular-nums">{elapsed}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </button>
            <div className="w-10 h-10 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20">{conductorName[0]}</div>
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
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold text-[#62A0EA]/60 uppercase tracking-wider">Total Collected</p>
              {elapsed && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-400/80 tabular-nums">{elapsed}</span>
                </div>
              )}
            </div>
            <p className="text-3xl font-extrabold text-[#62A0EA] mt-1">₱{liveTransactions.total.toFixed(2)}</p>                
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] font-semibold text-purple-400/60 uppercase tracking-wider">Scanned</p>
                <p className="text-lg font-extrabold text-purple-400 mt-0.5">₱{liveTransactions.scanned.toFixed(2)}</p>              
                </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-wider">Prepaid</p>
                <p className="text-lg font-extrabold text-emerald-400 mt-0.5">₱{liveTransactions.prepaid.toFixed(2)}</p>              
                </div>
            </div>
          </div>

          {shift?.timeIn && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Shift Started</p>
                <p className="text-xs font-semibold text-white/60 mt-0.5">{formatTime(shift.timeIn)}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== MAP ========== */}
      <div className="fixed inset-0 z-0 lg:left-64">
        <ConductorMap />
      </div>  

      {/* ========== MODALS ========== */}
      <FareCalculatorModal
        isOpen={showFareCalc}
        onClose={() => setShowFareCalc(false)}
        shiftId={shift?.shiftId || ""}
        conductorName={conductorName}
        unitNumber={unitNumber}
        driverName={driverName}
      />
      <HistoryLogModal isOpen={showHistory} onClose={() => setShowHistory(false)} shiftId={shift?.shiftId || ""} />
    </div>
  );
}