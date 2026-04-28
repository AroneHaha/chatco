// app/components/conductor/unit-verification/UnitList.tsx
import { Unit } from "@/app/(conductor)/unit-verification/data";

const statusConfig: Record<Unit["status"], { label: string; color: string; bg: string }> = {
  available: { label: "Available", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/25" },
  "in-use": { label: "In Use", color: "text-white/30", bg: "bg-white/5 border-white/10" },
  maintenance: { label: "Maintenance", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/25" },
};

export default function UnitList({ units, onSelect }: { units: Unit[]; onSelect: (unit: Unit) => void }) {
  return (
    <div className="space-y-2.5">
      {units.map((unit) => {
        const cfg = statusConfig[unit.status];
        const isAvailable = unit.status === "available";
        return (
          <button key={unit.id} onClick={() => isAvailable && onSelect(unit)} disabled={!isAvailable}
            className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${isAvailable ? "bg-[#071A2E] border-white/[0.06] hover:border-[#1A5FB4]/40 hover:bg-[#071A2E]/80 active:scale-[0.98]" : "bg-[#071A2E]/40 border-white/[0.03] opacity-50 cursor-not-allowed"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`w-10 h-10 rounded-xl ${isAvailable ? "bg-[#1A5FB4]/15" : "bg-white/5"} flex items-center justify-center flex-shrink-0`}>
                    <svg className={`w-5 h-5 ${isAvailable ? "text-[#62A0EA]" : "text-white/20"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H6.375c-.621 0-1.125-.504-1.125-1.125V14.25m17.25 4.5V14.25A2.25 2.25 0 0 0 20.25 12H3.75A2.25 2.25 0 0 0 1.5 14.25v4.5" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className={`font-bold text-sm ${isAvailable ? "text-white" : "text-white/40"}`}>{unit.unitNumber}</p>
                    <p className="text-[11px] text-white/35 font-medium mt-0.5 truncate">{unit.route}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pl-[50px]">
                  <span className="text-[11px] text-white/35 font-medium">{unit.plateNumber}</span>
                </div>
              </div>
              <span className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}