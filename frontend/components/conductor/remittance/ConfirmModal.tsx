// app/components/conductor/remittance/ConfirmModal.tsx
import { fmt } from "@/app/(conductor)/conductor-dashboard/end-of-day/helpers";

interface ConfirmModalProps {
  show: boolean; onClose: () => void; onConfirm: () => void; isRemitting: boolean; shiftInfo: { driverName: string; unitNumber: string }; totalCashless: number; cashAmount: number; grandTotal: number;
}

export default function ConfirmModal({ show, onClose, onConfirm, isRemitting, shiftInfo, totalCashless, cashAmount, grandTotal }: ConfirmModalProps) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#0B1E33] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
        <div className="p-6 space-y-5">
          <div className="flex justify-center"><div className="w-14 h-14 rounded-full bg-[#1A5FB4]/15 flex items-center justify-center"><svg className="w-7 h-7 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg></div></div>
          <div className="text-center"><h2 className="text-white font-bold text-lg">Confirm Remittance</h2><p className="text-xs text-white/40 mt-1">Submit report to admin</p></div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-sm"><span className="text-white/40">Driver / Unit</span><span className="text-white font-semibold">{shiftInfo.driverName} · {shiftInfo.unitNumber}</span></div><div className="h-px bg-white/[0.04]" />
            <div className="flex justify-between text-sm"><span className="text-white/40">Cashless (digital transfer)</span><span className="text-white font-bold tabular-nums">{fmt(totalCashless)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-white/40">Cash (manual handover)</span><span className="text-amber-400 font-bold tabular-nums">{fmt(cashAmount)}</span></div><div className="h-px bg-white/10" />
            <div className="flex justify-between"><span className="text-xs font-bold text-white/50 uppercase tracking-wider">Total</span><span className="text-lg font-extrabold text-white tabular-nums">{fmt(grandTotal)}</span></div><div className="h-px bg-white/[0.04]" />
            <div className="flex justify-between text-sm"><span className="text-white/40">Remit to</span><span className="text-white font-semibold">Admin</span></div>
          </div>
          <div className="flex items-start gap-2.5 bg-amber-500/8 border border-amber-500/15 rounded-xl p-3"><svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg><p className="text-[11px] text-amber-400/70 leading-relaxed">Cashless amount will be transferred to admin wallet instantly. Physical cash of <span className="font-bold text-amber-400">{fmt(cashAmount)}</span> must be handed over manually.</p></div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/10 transition-all active:scale-[0.98]">Cancel</button>
            <button onClick={onConfirm} disabled={isRemitting} className="flex-1 py-3 rounded-xl bg-[#1A5FB4] text-white text-sm font-bold shadow-lg shadow-[#1A5FB4]/25 hover:bg-[#165a9f] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isRemitting ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Processing…</>) : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}