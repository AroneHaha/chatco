// app/components/conductor/unit-verification/StartShiftModal.tsx
import { Unit, Driver, CURRENT_CONDUCTOR } from "@/app/(conductor)/unit-verification/data";
import { fmt } from "@/app/(conductor)/conductor-dashboard/end-of-day/helpers"; // Reuse helper if needed, or just use string templates

interface Props {
  show: boolean;
  unit: Unit | null;
  driver: Driver | null;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function StartShiftModal({ show, unit, driver, isProcessing, onConfirm, onCancel }: Props) {
  if (!show || !unit || !driver) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!isProcessing ? onCancel : undefined} />
      <div className="relative w-full max-w-sm bg-[#0B1E33] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
        <div className="p-6 space-y-5">
          <div className="flex justify-center"><div className="w-14 h-14 rounded-full bg-[#1A5FB4]/15 flex items-center justify-center"><svg className="w-7 h-7 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg></div></div>
          
          <div className="text-center">
            <h2 className="text-white font-bold text-lg">Confirm Shift Setup</h2>
            <p className="text-xs text-white/40 mt-1">Proceeding means your duty has officially begun.</p>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm"><span className="text-white/40">Conductor</span><span className="text-white font-semibold">{CURRENT_CONDUCTOR.name}</span></div>
            <div className="h-px bg-white/[0.06]" />
            <div className="flex items-center justify-between text-sm"><span className="text-white/40">Driver</span><span className="text-white font-semibold">{driver.name}</span></div>
            <div className="h-px bg-white/[0.06]" />
            <div className="flex items-center justify-between text-sm"><span className="text-white/40">Unit</span><span className="text-white font-semibold">{unit.unitNumber}</span></div>
            <div className="h-px bg-white/[0.06]" />
            <div className="flex items-center justify-between text-sm"><span className="text-white/40">Route</span><span className="text-white font-semibold text-right max-w-[180px] truncate">{unit.route}</span></div>
          </div>

          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2.5">
            <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            <p className="text-[11px] text-amber-400/80 font-medium">Action cannot be undone without admin assistance.</p>
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel} disabled={isProcessing} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50">Cancel</button>
            <button onClick={onConfirm} disabled={isProcessing} className="flex-1 py-3 rounded-xl bg-[#1A5FB4] text-white text-sm font-bold shadow-lg shadow-[#1A5FB4]/25 hover:bg-[#165a9f] transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
              {isProcessing ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Starting…</>) : "Start Shift"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}