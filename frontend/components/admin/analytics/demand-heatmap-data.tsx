"use client";

import { initialHeatmapZones } from "@/app/(admin)/analytics/data/analytics-data";
import type { HeatmapZone } from "@/app/(admin)/analytics/data/analytics-data";

export function DemandHeatmapData() {
  return (
    // Fixed outer container height
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 h-[370px] flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white">Demand Heatmap Data</h3>
        <span className="text-[10px] bg-white/[0.06] text-white/40 px-2 py-0.5 rounded">Live Estimation</span>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[10px] text-white/40">Critical</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div><span className="text-[10px] text-white/40">High</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-[10px] text-white/40">Moderate</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-[10px] text-white/40">Low</span></div>
      </div>

      {/* Fixed inner list height with overflow just in case */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        {initialHeatmapZones.map((zone: HeatmapZone) => (
          <div key={zone.zone} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-8 rounded-full ${zone.color}`}></div>
              <span className="text-xs text-white/70 font-medium">{zone.zone}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">{zone.commuters}</p>
              <p className="text-[10px] text-white/30">waiting</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}