// app/components/conductor/unit-verification/DriverList.tsx
import { Driver } from "@/app/(conductor)/unit-verification/data";

export default function DriverList({ drivers, onSelect }: { drivers: Driver[]; onSelect: (driver: Driver) => void }) {
  return (
    <div className="space-y-2.5">
      {drivers.map((driver) => {
        const isAvailable = driver.status === "available";
        return (
          <button key={driver.id} onClick={() => isAvailable && onSelect(driver)} disabled={!isAvailable}
            className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${isAvailable ? "bg-[#071A2E] border-white/[0.06] hover:border-[#1A5FB4]/40 hover:bg-[#071A2E]/80 active:scale-[0.98]" : "bg-[#071A2E]/40 border-white/[0.03] opacity-50 cursor-not-allowed"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${isAvailable ? "bg-[#1A5FB4]/15" : "bg-white/5"} flex items-center justify-center flex-shrink-0`}>
                <span className={`text-sm font-bold ${isAvailable ? "text-[#62A0EA]" : "text-white/20"}`}>{driver.name[0]}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-bold text-sm ${isAvailable ? "text-white" : "text-white/40"}`}>{driver.name}</p>
                <p className="text-[11px] text-white/35 font-medium mt-0.5">{isAvailable ? "Ready for dispatch" : "Currently on shift"}</p>
              </div>
              <span className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${isAvailable ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/25" : "text-white/30 bg-white/5 border-white/10"}`}>
                {isAvailable ? "Available" : "On Shift"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}