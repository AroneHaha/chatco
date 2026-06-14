// components/conductor/dashboard/desktop-dashboard-card.tsx
// Desktop floating card — extracted from conductor-dashboard.tsx

"use client";

import { formatTime } from "@/lib/conductor/services/shift.service";
import type { ConductorStatus } from "./use-dashboard-state";

interface DesktopDashboardCardProps {
  conductorName: string;
  unitNumber: string;
  route: string;
  elapsed: string | null;
  status: ConductorStatus;
  setStatus: (s: ConductorStatus) => void;
  liveTransactions: { total: number; gcash: number; cash: number; voucher: number };
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
  shiftTimeIn?: string | null;
}

export default function DesktopDashboardCard({
  conductorName,
  unitNumber,
  route,
  elapsed,
  status,
  setStatus,
  liveTransactions,
  setShowHistory,
  shiftTimeIn,
}: DesktopDashboardCardProps) {
  return (
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
          <div className="w-10 h-10 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20">{conductorName[0]}</div>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => window.dispatchEvent(new CustomEvent("conductor:open-payment"))} className="bg-[#1A5FB4] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-[#165a9f] transition-colors flex flex-col items-center justify-center gap-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
            <span className="text-xs">Payment</span>
          </button>
          <button onClick={() => setShowHistory(true)} className="bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-bold hover:bg-white/10 transition-colors flex flex-col items-center justify-center gap-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <span className="text-xs">View History</span>
          </button>
        </div>

        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-1.5 mb-3">
            <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${status === 'Available' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : status === 'Standing' ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-gray-500'}`} />
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Unit Status</p>
          </div>
          <div className="flex gap-2">
            {(["Available", "Standing", "Full"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors border ${
                  status === s
                    ? s === "Available"
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : s === "Standing"
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                        : "bg-gray-500/20 border-gray-500/40 text-gray-300"
                    : "bg-transparent border-white/10 text-white/30 hover:bg-white/5"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
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
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="text-[10px] font-semibold text-blue-400/60 uppercase tracking-wider">GCash</p>
              <p className="text-lg font-extrabold text-blue-400 mt-0.5">₱{liveTransactions.gcash.toFixed(2)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-wider">Cash</p>
              <p className="text-lg font-extrabold text-emerald-400 mt-0.5">₱{liveTransactions.cash.toFixed(2)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="text-[10px] font-semibold text-amber-400/60 uppercase tracking-wider">Voucher</p>
              <p className="text-lg font-extrabold text-amber-400 mt-0.5">₱{liveTransactions.voucher.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {shiftTimeIn && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Shift Started</p>
              <p className="text-xs font-semibold text-white/60 mt-0.5">{formatTime(shiftTimeIn)}</p>
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
  );
}
