"use client";

import { initialPickupPoints } from "@/app/(admin)/analytics/data/analytics-data";
import type { PickupPoint } from "@/app/(admin)/analytics/data/analytics-data";

const maxPickup = Math.max(...initialPickupPoints.map((p: PickupPoint) => p.count));

export function PickupPointsList() {
  return (
    // Fixed outer container height
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 h-[340px] flex flex-col">
      <h3 className="text-sm font-semibold text-white mb-4 flex-shrink-0">Most Used Pickup Points</h3>
      <div className="space-y-3 flex-1 flex flex-col justify-center">
        {initialPickupPoints.map((point: PickupPoint, index: number) => (
          <div key={point.name} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
              index === 0 ? "bg-[#62A0EA] text-white" : "bg-[#0E1628] text-slate-500"
            }`}>
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-300 font-medium truncate">{point.name}</span>
                <span className="text-xs text-slate-500 ml-2 flex-shrink-0">{point.count} pickups</span>
              </div>
              <div className="h-1.5 bg-[#0E1628] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#62A0EA] rounded-full transition-all" 
                  style={{ width: `${(point.count / maxPickup) * 100}%` }} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}