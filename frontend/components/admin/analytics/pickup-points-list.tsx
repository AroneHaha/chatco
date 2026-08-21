"use client";

import type { PickupPoint } from "@/app/(admin)/analytics/data/analytics-data";

interface PickupPointsListProps {
  data: PickupPoint[];
}

export function PickupPointsList({ data }: PickupPointsListProps) {
  const maxPickup = data.length > 0 ? Math.max(...data.map((p) => p.count)) : 1;
  const totalPickups = data.reduce((s, p) => s + p.count, 0);

  return (
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 h-125 flex flex-col">
      <div className="flex items-baseline justify-between mb-4 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white">Most Used Pickup Points</h3>
        {data.length > 0 && (
          <span className="text-[10px] text-slate-500">Top {data.length}</span>
        )}
      </div>

      {/* overflow-y-auto, and no justify-center. The backend returns up to 10
          points; the previous fixed-height centred flex column had no scroll,
          so everything past ~6 rows overflowed the card and was unreachable. */}
      <div className="space-y-3 flex-1 min-h-0 overflow-y-auto scrollbar-themed pr-1">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-xs">
            No pickup point data available.
          </div>
        ) : (
          data.map((point, index) => (
            <div key={point.name} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                index === 0 ? "bg-[#62A0EA] text-white" : "bg-[#0E1628] text-slate-500"
              }`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300 font-medium truncate" title={point.name}>
                    {point.name}
                  </span>
                  <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                    {point.count} pickups
                    {totalPickups > 0 && (
                      <span className="text-slate-600">
                        {" "}· {((point.count / totalPickups) * 100).toFixed(0)}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 bg-[#0E1628] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#62A0EA] rounded-full transition-all"
                    style={{ width: `${(point.count / maxPickup) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
