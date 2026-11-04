"use client";

import { memo, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { NearbyVehicle } from "@/lib/shared/geo/nearby-detector";

const CAPACITY_LABEL: Record<NearbyVehicle["capacityStatus"], string> = {
  Available: "Seats available",
  Standing: "Standing only",
  Full: "Full",
};

const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

interface NearbyUnitsCardProps {
  /** Units whose 1km radius covers the commuter (the hailable set), nearest first. */
  vehicles: NearbyVehicle[];
  className?: string;
}

/**
 * Nearest unit up front; any other units in range stay behind one button so the
 * sheet stays short. Solid surfaces only, no ETA.
 */
export const NearbyUnitsCard = memo(function NearbyUnitsCard({ vehicles, className = "" }: NearbyUnitsCardProps) {
  const [showOthers, setShowOthers] = useState(false);
  const listId = useId();

  const panel = `rounded-xl border border-[#1C3350] bg-[#0B1E33] light:border-gray-200 light:bg-gray-50 ${className}`;

  if (vehicles.length === 0) {
    return (
      <div className={`${panel} p-3.5`}>
        <p className="text-sm font-bold text-white light:text-gray-900">No units within 1 km</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/50 light:text-gray-500">
          They appear here as soon as one comes near. Hold to Hail unlocks then.
        </p>
      </div>
    );
  }

  const [nearest, ...others] = vehicles;
  // Collapses on its own if the other units drive out of range.
  const open = showOthers && others.length > 0;

  return (
    <div className={panel}>
      <div className="flex items-end justify-between gap-3 p-3.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 light:text-gray-500">Nearest unit</p>
          <p className="mt-1 truncate text-lg font-bold tracking-wide text-white light:text-gray-900">{nearest.plateNumber}</p>
          <p className="text-xs text-white/50 light:text-gray-500">{CAPACITY_LABEL[nearest.capacityStatus]}</p>
        </div>
        <p className="shrink-0 text-2xl font-bold leading-none tabular-nums text-white light:text-gray-900">
          {formatDistance(nearest.distanceInMeters)}
        </p>
      </div>

      {open && (
        <ul id={listId} className="border-t border-[#1C3350] px-3.5 light:border-gray-200">
          {others.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 border-b border-[#1C3350] py-2 last:border-b-0 light:border-gray-200">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-wide text-white light:text-gray-900">{v.plateNumber}</p>
                <p className="text-[11px] text-white/50 light:text-gray-500">{CAPACITY_LABEL[v.capacityStatus]}</p>
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums text-white light:text-gray-900">{formatDistance(v.distanceInMeters)}</p>
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <div className={`px-2.5 pb-2.5 ${open ? "border-t border-[#1C3350] pt-2.5 light:border-gray-200" : ""}`}>
          <button
            type="button"
            onClick={() => setShowOthers((v) => !v)}
            aria-expanded={open}
            aria-controls={listId}
            className="flex w-full items-center justify-between rounded-lg border border-[#1C3350] bg-[#071A2E] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0E2440] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] light:border-gray-200 light:bg-white light:text-gray-900 light:hover:bg-gray-100 light:focus-visible:outline-[#1A5FB4]"
          >
            <span>{open ? "Hide other units" : `${others.length} more unit${others.length === 1 ? "" : "s"} nearby`}</span>
            <ChevronDown size={14} strokeWidth={2.5} aria-hidden className={`transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}
    </div>
  );
});
