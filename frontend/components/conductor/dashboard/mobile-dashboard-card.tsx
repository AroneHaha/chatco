"use client";

import { ConductorStatus } from "./use-dashboard-state";
import { formatPeso } from "@/lib/utils/display";

interface MobileDashboardCardProps {
  unitNumber: string;
  route: string;
  conductorName: string;
  elapsed: string | null;
  status: ConductorStatus;
  setStatus: (s: ConductorStatus) => void;
  mobileCardExpanded: boolean;
  setMobileCardExpanded: (v: boolean) => void;
  total: number;
  gcash: number;
  cash: number;
  voucher: number;
  onHistoryClick: () => void;
  isOnBreak: boolean;
  breakBusy: boolean;
  breakError: string | null;
  onToggleBreak: () => void;
}

export function MobileDashboardCard({
  unitNumber,
  route,
  conductorName,
  elapsed,
  status,
  setStatus,
  mobileCardExpanded,
  setMobileCardExpanded,
  total,
  gcash,
  cash,
  voucher,
  onHistoryClick,
  isOnBreak,
  breakBusy,
  breakError,
  onToggleBreak,
}: MobileDashboardCardProps) {
  return (
    <div className="lg:hidden flex-shrink-0 bg-[#071A2E]/95 backdrop-blur-xl z-20 border-b border-white/10">
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
          <div className="w-8 h-8 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold text-xs shadow-lg border-2 border-white/20">{conductorName[0]}</div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={onToggleBreak}
          disabled={breakBusy}
          aria-pressed={isOnBreak}
          className={`flex min-h-11 w-full items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-bold shadow-lg transition-colors active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 ${
            isOnBreak
              ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
              : "border-amber-400/40 bg-amber-500/20 text-amber-300"
          }`}
        >
          {breakBusy ? "Updating..." : isOnBreak ? "Resume Duty" : "Take a Break"}
        </button>
        {breakError && (
          <p role="alert" className="mt-1.5 rounded-lg bg-red-950/90 px-3 py-2 text-center text-xs text-red-300">
            {breakError}
          </p>
        )}
      </div>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: mobileCardExpanded ? "240px" : "0px" }}
      >
        <div className="px-4 pb-3 space-y-2.5">
          {/* Status + History row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${status === 'Available' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : status === 'Standing' ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-gray-500'}`} />
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Status</span>
              </div>
              <div className="flex gap-1.5">
                {(["Available", "Standing", "Full"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors border ${
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

            <button onClick={onHistoryClick} className="flex items-center justify-center gap-1 bg-white/5 border border-white/10 text-white/70 px-3 py-2 rounded-xl text-[10px] font-semibold hover:bg-white/10 transition-colors active:scale-[0.98] flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              <span>History</span>
            </button>
          </div>

          <div className="bg-[#1A5FB4]/10 border border-[#1A5FB4]/20 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-semibold text-[#62A0EA]/60 uppercase tracking-wider">Total Collected</p>
              <p className="text-xl font-extrabold text-[#62A0EA]">{formatPeso(total)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <p className="text-[8px] font-semibold text-blue-400/60 uppercase tracking-wider">GCash</p>
                <p className="text-sm font-extrabold text-blue-400">{formatPeso(gcash)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <p className="text-[8px] font-semibold text-emerald-400/60 uppercase tracking-wider">Cash</p>
                <p className="text-sm font-extrabold text-emerald-400">{formatPeso(cash)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <p className="text-[8px] font-semibold text-amber-400/60 uppercase tracking-wider">Voucher</p>
                <p className="text-sm font-extrabold text-amber-400">{formatPeso(voucher)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setMobileCardExpanded(!mobileCardExpanded)}
        className="flex-shrink-0 flex items-center justify-center py-1.5 w-full border-t border-white/5 hover:bg-white/5 transition-colors active:bg-white/10"
      >
        <svg className={`w-4 h-4 text-white/30 transition-transform duration-300 ${mobileCardExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
        </svg>
      </button>
    </div>
  );
}
