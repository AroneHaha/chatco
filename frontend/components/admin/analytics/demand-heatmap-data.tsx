"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { List, Map as MapIcon } from "lucide-react";
import type { AnalyticsHeatmapZone } from "@/lib/admin/services/analytics.service";

// Leaflet reaches for `window` on import, so the map stays out of SSR and
// off the initial bundle — it's behind a toggle most visits won't open.
const DemandMap = dynamic(() => import("./demand-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-slate-600 text-xs">
      Loading map…
    </div>
  ),
});

interface DemandHeatmapDataProps {
  zones: AnalyticsHeatmapZone[];
  /** Range label, so the panel can say what period it's describing. */
  rangeLabel?: string;
}

export function DemandHeatmapData({ zones, rangeLabel }: DemandHeatmapDataProps) {
  const [view, setView] = useState<"list" | "map">("list");

  const plottable = zones.filter(z => z.lat && z.lng);

  return (
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 h-92.5 flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0 gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">Boardings by Location</h3>
          {/* The old header carried a date input that set state nothing read,
              and a "Live Estimation" badge on what is a historical aggregate.
              Both are gone; this states the actual window instead. */}
          <p className="text-[10px] text-slate-500 truncate">
            Completed boardings{rangeLabel ? ` · ${rangeLabel}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-0.5 bg-[#0E1628] p-0.5 rounded-md border border-[#1E2D45] flex-shrink-0">
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            title="List view"
            className={`p-1.5 rounded transition-colors ${
              view === "list" ? "bg-[#62A0EA] text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <List size={13} />
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            aria-pressed={view === "map"}
            title="Map view"
            disabled={plottable.length === 0}
            className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              view === "map" ? "bg-[#62A0EA] text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <MapIcon size={13} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 pb-2.5 border-b border-[#1E2D45] flex-shrink-0">
        {[
          ["bg-red-500", "Critical", "50+"],
          ["bg-orange-500", "High", "20+"],
          ["bg-yellow-500", "Moderate", "5+"],
          ["bg-green-500", "Low", "<5"],
        ].map(([color, label, threshold]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[10px] text-slate-500">
              {label} <span className="text-slate-600">{threshold}</span>
            </span>
          </div>
        ))}
      </div>

      {/* overflow-y-auto: the backend returns up to 15 zones and the previous
          overflow-hidden hard-clipped everything past ~5 with no scroll. */}
      <div className="flex-1 min-h-0">
        {view === "map" ? (
          <DemandMap zones={plottable} />
        ) : (
          <div className="space-y-2 h-full overflow-y-auto scrollbar-themed pr-1">
            {zones.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-600 text-xs">
                No boarding data in this range.
              </div>
            ) : (
              zones.map((zone) => (
                <div
                  key={zone.zone}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1628] border border-[#1E2D45]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-8 rounded-full flex-shrink-0 ${zone.color}`} />
                    <span className="text-xs text-slate-300 font-medium truncate" title={zone.zone}>
                      {zone.zone}
                    </span>
                  </div>

                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-sm font-bold text-white">{zone.commuters}</p>
                    {/* Was "waiting", which read as a live queue. These are
                        completed PAID boardings over the selected window. */}
                    <p className="text-[10px] text-slate-500">boardings</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
