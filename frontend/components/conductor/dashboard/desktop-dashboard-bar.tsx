"use client";

import { formatTime } from "@/lib/conductor/services/shift.service";
import { formatPeso } from "@/lib/utils/display";
import { ConductorStatus } from "./use-dashboard-state";

interface DesktopDashboardBarProps {
  unitNumber: string;
  route: string;
  conductorName: string;
  status: ConductorStatus;
  setStatus: (s: ConductorStatus) => void;
  total: number;
  gcash: number;
  cash: number;
  voucher: number;
  isOnBreak: boolean;
  breakBusy: boolean;
  shiftTimeIn: string | undefined;
  onHistoryClick: () => void;
  onOpenBreakModal: () => void;
  canOperate: boolean;
}

const STATUS_ACTIVE_CLASSES: Record<ConductorStatus, string> = {
  Available: "bg-emerald-500/20 border-emerald-500/40 text-emerald-400",
  Standing: "bg-amber-500/20 border-amber-500/40 text-amber-400",
  Full: "bg-gray-500/20 border-gray-500/40 text-gray-300",
};

const STATUS_DOT_CLASSES: Record<ConductorStatus, string> = {
  Available: "bg-emerald-400 shadow-sm shadow-emerald-400/50",
  Standing: "bg-amber-400 shadow-sm shadow-amber-400/50",
  Full: "bg-red-400 shadow-sm shadow-red-400/50",
};

/**
 * Wide-screen (xl:+) counterpart to DesktopDashboardCard — same data and
 * actions, reflowed into a horizontal strip docked top-center over the map
 * instead of a vertical stack docked bottom-right. Below xl:, the original
 * vertical card still renders (see conductor-dashboard.tsx) — this is an
 * additive breakpoint, not a replacement, so nothing regresses on narrower
 * "large" screens (1024–1279px).
 */
export function DesktopDashboardBar({
  unitNumber,
  route,
  conductorName,
  status,
  setStatus,
  total,
  gcash,
  cash,
  voucher,
  isOnBreak,
  breakBusy,
  shiftTimeIn,
  onHistoryClick,
  onOpenBreakModal,
  canOperate,
}: DesktopDashboardBarProps) {
  return (
    <div className="hidden xl:flex absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto items-stretch divide-x divide-white/10 bg-[#071A2E]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/10 overflow-hidden">
      {/* Identity */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          aria-label={isOnBreak ? "Conductor on break" : "Conductor on duty"}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 flex-shrink-0 transition-colors duration-300 ${
            isOnBreak ? "border-sky-300/50 bg-sky-500 shadow-sky-500/30" : "border-white/20 bg-[#1A5FB4]"
          }`}
        >
          {conductorName[0]}
        </div>
        <div className="min-w-0">
          <h1 className="text-white font-bold text-sm leading-tight whitespace-nowrap">Unit: {unitNumber}</h1>
          <p className="text-[11px] text-white/50 font-medium max-w-[180px] truncate mt-0.5">{route}</p>
        </div>
      </div>

      {/* Payment History / Break — Payment itself already lives in the
          navbar (ConductorDock at xl:+), so it doesn't need a second
          entry point here. */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={onHistoryClick}
          className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-white/10 transition-colors whitespace-nowrap"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Payment History
        </button>
        <button
          type="button"
          onClick={onOpenBreakModal}
          disabled={breakBusy || !canOperate}
          aria-pressed={isOnBreak}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors disabled:cursor-wait disabled:opacity-60 whitespace-nowrap border ${
            isOnBreak
              ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              : "border-amber-400/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
          }`}
        >
          {breakBusy ? "Updating..." : isOnBreak ? "Resume Duty" : "Take a Break"}
        </button>
      </div>

      {/* Unit Status */}
      <div className="flex flex-col justify-center gap-1.5 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              isOnBreak ? "bg-sky-400 shadow-sm shadow-sky-400/50" : STATUS_DOT_CLASSES[status]
            }`}
          />
          <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap">
            {isOnBreak ? "On Break" : "Unit Status"}
          </p>
        </div>
        <div className="flex gap-1">
          {(["Available", "Standing", "Full"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              disabled={isOnBreak || !canOperate}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors border disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap ${
                status === s ? STATUS_ACTIVE_CLASSES[s] : "bg-transparent border-white/10 text-white/30 hover:bg-white/5"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Total collected + breakdown */}
      <div className="flex items-center gap-4 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold text-[#62A0EA]/60 uppercase tracking-wider whitespace-nowrap">Total Collected</p>
          <p className="text-xl font-extrabold text-[#62A0EA] mt-0.5 whitespace-nowrap">{formatPeso(total)}</p>
        </div>
        <div className="flex flex-col gap-1 border-l border-white/10 pl-4">
          <div className="flex items-center gap-1.5">
            <span className="w-11 text-[9px] font-semibold text-blue-400/60 uppercase tracking-wider">GCash</span>
            <span className="text-[11px] font-bold text-blue-400 tabular-nums whitespace-nowrap">{formatPeso(gcash)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-11 text-[9px] font-semibold text-emerald-400/60 uppercase tracking-wider">Cash</span>
            <span className="text-[11px] font-bold text-emerald-400 tabular-nums whitespace-nowrap">{formatPeso(cash)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-11 text-[9px] font-semibold text-amber-400/60 uppercase tracking-wider">Voucher</span>
            <span className="text-[11px] font-bold text-amber-400 tabular-nums whitespace-nowrap">{formatPeso(voucher)}</span>
          </div>
        </div>
      </div>

      {/* Shift started */}
      {shiftTimeIn && (
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider whitespace-nowrap">Shift Started</p>
            <p className="text-xs font-semibold text-white/60 mt-0.5 whitespace-nowrap">{formatTime(shiftTimeIn)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
