// app/components/conductor/unit-verification/DriverList.tsx
import { ChevronRight } from "lucide-react";
import { UserAvatar } from "@/components/admin/ui/user-avatar";
import type { ConductorDriver } from "@/lib/conductor/types";

const unavailableLabel: Record<Exclude<ConductorDriver["status"], "available">, string> = {
  "on-shift": "On Shift",
  inactive: "Inactive",
  assigned: "Assigned",
};

export default function DriverList({
  drivers,
  onSelect,
  onUnavailable,
}: {
  drivers: ConductorDriver[];
  onSelect: (driver: ConductorDriver) => void;
  /** Tapping a driver who can't be used reports why instead of selecting. */
  onUnavailable?: (driver: ConductorDriver) => void;
}) {
  return (
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-[64dvh] lg:max-h-[70dvh]">
      {drivers.map((driver) => {
        const isAvailable = driver.status === "available";
        return (
          <button key={driver.id} type="button" onClick={() => (isAvailable ? onSelect(driver) : onUnavailable?.(driver))} aria-disabled={!isAvailable}
            className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors ${isAvailable ? "cursor-pointer border-[#1C3350] light:border-gray-200 bg-[#0B1E33] light:bg-white hover:border-[#1A5FB4] hover:bg-[#10273F] light:hover:bg-gray-100 active:scale-[0.99]" : "cursor-not-allowed border-[#142640] light:border-gray-200 bg-[#081626] light:bg-gray-100"}`}>
            {/* Uploaded R2 photo, or the default person icon when there is none. */}
            <UserAvatar
              src={driver.profilePictureUrl}
              alt={`Photo of ${driver.name}`}
              className={`h-11 w-11 ${isAvailable ? "" : "grayscale"}`}
              iconClassName="h-5 w-5"
              sizes="44px"
              surfaceClassName="rounded-full border border-[#1C3350] light:border-gray-200 bg-[#16304F] light:bg-gray-100 text-slate-400 light:text-gray-500"
            />
            <div className="min-w-0 flex-1">
              <p className={`text-base font-semibold ${isAvailable ? "text-white light:text-gray-900" : "text-slate-500 light:text-gray-500"}`}>{driver.name}</p>
              <p className={`mt-0.5 text-xs font-medium ${isAvailable ? "text-slate-400 light:text-gray-600" : "text-slate-500 light:text-gray-500"}`}>
                {isAvailable ? "Ready for dispatch" : driver.unavailableReason ?? "Currently on shift"}
              </p>
            </div>
            <span className={`shrink-0 text-[11px] font-semibold uppercase tracking-wider ${isAvailable ? "text-slate-300 light:text-gray-700" : "text-slate-500 light:text-gray-500"}`}>
              {driver.status === "available" ? "Available" : unavailableLabel[driver.status]}
            </span>
            {isAvailable && <ChevronRight size={18} className="-ml-2 shrink-0 text-slate-500 light:text-gray-500" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
