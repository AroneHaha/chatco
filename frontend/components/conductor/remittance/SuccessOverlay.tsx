// app/components/conductor/remittance/SuccessOverlay.tsx
import { fmt } from "@/app/(conductor)/conductor-dashboard/end-of-day/helpers";

interface SuccessOverlayProps {
  show: boolean;
  onClose: () => void;
  gcashTotal: number;
  cashTotal: number;
  grandTotal: number;
  unitNumber: string;
  shortage?: number;
}

export default function SuccessOverlay({ show, onClose, gcashTotal, cashTotal, grandTotal, unitNumber, shortage }: SuccessOverlayProps) {
  // Guard: ensure numeric values even if undefined slips through
  const safeGcash = gcashTotal ?? 0;
  const safeCash = cashTotal ?? 0;
  const safeGrand = grandTotal ?? 0;
  const safeShortage = shortage ?? 0;

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0B1E33] border border-emerald-500/20 rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl space-y-4">
            <div className="flex justify-center"><div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center animate-scale-in"><svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></div></div>
            <div><h2 className="text-white font-bold text-xl">Remitted to Admin</h2><p className="text-xs text-white/40 mt-1.5 leading-relaxed">Report for <span className="text-white/60 font-semibold">{unitNumber}</span> submitted successfully.</p></div>
            <div className="space-y-2">
              <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl p-3 space-y-1">
                <p className="text-xs text-blue-400/60 font-medium">GCash (Digital)</p>
                <p className="text-lg font-extrabold text-blue-400 tabular-nums">{fmt(safeGcash)}</p>
              </div>
              <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-3 space-y-1">
                <p className="text-xs text-emerald-400/60 font-medium">Cash (Hand over to admin)</p>
                <p className="text-lg font-extrabold text-emerald-400 tabular-nums">{fmt(safeCash)}</p>
              </div>
              {safeShortage > 0 && (
                <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-3 space-y-1">
                  <p className="text-xs text-red-400/60 font-medium">Shortage Recorded</p>
                  <p className="text-lg font-extrabold text-red-400 tabular-nums">−{fmt(safeShortage)}</p>
                </div>
              )}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Total</p>
                <p className="text-xl font-extrabold text-white tabular-nums">{fmt(safeGrand)}</p>
              </div>
            </div>
            <div className="space-y-2"><p className="text-[10px] text-white/25 tabular-nums">Redirecting to login…</p><button onClick={onClose} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/10 transition-all">Done</button></div>
          </div>
        </div>
  );
}
