// app/components/conductor/remittance/SuccessOverlay.tsx
import { fmt } from "@/app/(conductor)/conductor-dashboard/end-of-day/helpers";

interface SuccessOverlayProps { show: boolean; onClose: () => void; totalCashless: number; unitNumber: string; }

export default function SuccessOverlay({ show, onClose, totalCashless, unitNumber }: SuccessOverlayProps) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0B1E33] border border-emerald-500/20 rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl space-y-4">
        <div className="flex justify-center"><div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center animate-scale-in"><svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></div></div>
        <div><h2 className="text-white font-bold text-xl">Remitted to Admin</h2><p className="text-xs text-white/40 mt-1.5 leading-relaxed">Report for <span className="text-white/60 font-semibold">{unitNumber}</span> submitted. Cashless transferred. Hand over physical cash to admin.</p></div>
        <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-3 space-y-1"><p className="text-xs text-emerald-400/60 font-medium">Cashless Transferred</p><p className="text-xl font-extrabold text-emerald-400 tabular-nums">{fmt(totalCashless)}</p></div>
        <div className="space-y-2"><p className="text-[10px] text-white/25 tabular-nums">Redirecting to login…</p><button onClick={onClose} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/10 transition-all">Done</button></div>
      </div>
    </div>
  );
}