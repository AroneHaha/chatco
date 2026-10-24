"use client";

import { formatTime } from "@/lib/conductor/services/shift.service";
import { formatPeso } from "@/lib/utils/display";
import { ConductorAvatar } from "@/components/conductor/conductor-avatar";
import { unitStatusOptionClass, UNIT_STATUS_PANEL_CLASS } from "./unit-status-styles";
import { ConductorStatus } from "./use-dashboard-state";

interface DesktopDashboardCardProps {
  unitNumber: string;
  route: string;
  conductorName: string;
  conductorPhotoUrl: string | null;
  elapsed: string | null;
  status: ConductorStatus;
  setStatus: (s: ConductorStatus) => void;
  total: number;
  gcash: number;
  cash: number;
  isOnBreak: boolean;
  shiftTimeIn: string | undefined;
  onPaymentClick: () => void;
  onHistoryClick: () => void;
  canOperate: boolean;
}

export function DesktopDashboardCard({
  unitNumber,
  route,
  conductorName,
  conductorPhotoUrl,
  elapsed,
  status,
  setStatus,
  total,
  gcash,
  cash,
  isOnBreak,
  shiftTimeIn,
  onPaymentClick,
  onHistoryClick,
  canOperate,
}: DesktopDashboardCardProps) {
  return (
    // xl:hidden: at xl:+ (1280px), DesktopDashboardBar takes over as the
    // horizontal top-center layout — this vertical card stays as-is for the
    // 1024–1279px range so nothing regresses there.
    <div className="hidden lg:block xl:hidden absolute bottom-4 right-4 z-10 pointer-events-auto w-[380px] bg-[#071A2E]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden light:bg-white/95 light:border-gray-200 light:shadow-black/10">
      <div className="p-4 border-b border-white/10 light:border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-white light:text-gray-900 font-bold text-base">Unit: {unitNumber}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] text-white/50 light:text-gray-500 font-medium">{route}</p>
            {elapsed && (
              <>
                <span className="text-white/15 light:text-gray-300">·</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-400/80 light:text-emerald-700 tabular-nums">{elapsed}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span role="img" aria-label={isOnBreak ? `${conductorName}, on break` : `${conductorName}, on duty`}>
            <ConductorAvatar src={conductorPhotoUrl} isOnBreak={isOnBreak} className="w-10 h-10 shadow-lg" iconClassName="w-5 h-5" sizes="40px" />
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
        <div className="grid grid-cols-2 gap-3">
          <button disabled={!canOperate} onClick={onPaymentClick} className="bg-[#1A5FB4] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-[#165a9f] transition-colors flex flex-col items-center justify-center gap-1 disabled:cursor-not-allowed disabled:opacity-40">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
            <span className="text-xs">Payment</span>
          </button>
          <button onClick={onHistoryClick} className="bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-bold hover:bg-white/10 light:bg-gray-50 light:border-gray-200 light:text-gray-900 light:hover:bg-gray-100 transition-colors flex flex-col items-center justify-center gap-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <span className="text-xs">View History</span>
          </button>
        </div>

        <div className={`rounded-2xl border p-4 ${UNIT_STATUS_PANEL_CLASS}`}>
          <div className="flex items-center gap-1.5 mb-3">
            <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isOnBreak ? 'bg-sky-400 shadow-sm shadow-sky-400/50' : status === 'Available' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : status === 'Standing' ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-red-400 shadow-sm shadow-red-400/50'}`} />
            <p className="text-xs font-semibold text-white/50 light:text-gray-500 uppercase tracking-wider">Unit Status</p>
            <span className={`ml-auto text-xs font-bold ${isOnBreak ? "text-sky-300 light:text-sky-700" : "text-white/60 light:text-gray-700"}`}>
              {isOnBreak ? "On Break" : status}
            </span>
          </div>
          <div className="flex gap-2">
            {(["Available", "Standing", "Full"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                disabled={isOnBreak || !canOperate}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors border disabled:cursor-not-allowed disabled:opacity-40 ${
                  unitStatusOptionClass(status === s)
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1A5FB4]/10 border border-[#1A5FB4]/20 rounded-2xl p-4 light:bg-[#F0F7FF] light:border-[#DAEEFF]">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-[#62A0EA]/60 light:text-[#1A5FB4]/70 uppercase tracking-wider">Total Collected</p>
            {elapsed && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-emerald-400/80 light:text-emerald-700 tabular-nums">{elapsed}</span>
              </div>
            )}
          </div>
          <p className="text-3xl font-extrabold text-[#62A0EA] light:text-[#1A5FB4] mt-1">{formatPeso(total)}</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 light:bg-white light:border-[#DAEEFF]">
              <p className="text-[10px] font-semibold text-white/40 light:text-gray-500 uppercase tracking-wider">GCash</p>
              <p className="text-lg font-extrabold text-white light:text-gray-900 mt-0.5">{formatPeso(gcash)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 light:bg-white light:border-[#DAEEFF]">
              <p className="text-[10px] font-semibold text-white/40 light:text-gray-500 uppercase tracking-wider">Cash</p>
              <p className="text-lg font-extrabold text-white light:text-gray-900 mt-0.5">{formatPeso(cash)}</p>
            </div>
          </div>
        </div>

        {shiftTimeIn && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between light:bg-gray-50 light:border-gray-200">
            <div>
              <p className="text-[9px] font-bold text-white/25 light:text-gray-400 uppercase tracking-wider">Shift Started</p>
              <p className="text-xs font-semibold text-white/60 light:text-gray-700 mt-0.5">{formatTime(shiftTimeIn)}</p>
            </div>
            <svg className="w-6 h-6 flex-shrink-0 text-white light:text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
