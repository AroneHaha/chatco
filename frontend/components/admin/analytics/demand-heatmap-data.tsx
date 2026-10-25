"use client";

import dynamic from "next/dynamic";
import { formatNumber, type AnalyticsHeatmapZone } from "@/lib/admin/services/analytics.service";
import { ReportPanel } from "@/components/admin/analytics/report-tables";

// Leaflet reaches for `window` on import, so the map stays out of SSR and
// off the initial bundle; it only loads when this report is opened.
const DemandMap = dynamic(() => import("./demand-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-slate-600 admin-light:text-slate-500 text-xs">
      Loading map…
    </div>
  ),
});

interface DemandHeatmapDataProps {
  zones: AnalyticsHeatmapZone[];
}

/**
 * Paid boardings per fare point: a ranked list beside the map. This replaced
 * two panels ("Most Used Pickup Points" and "Boardings by Location") that
 * counted the same boardings grouped two ways, so their numbers disagreed.
 */
export function DemandHeatmapData({ zones }: DemandHeatmapDataProps) {
  const plottable = zones.filter((zone) => zone.lat && zone.lng);
  const maxBoardings = Math.max(...zones.map((zone) => zone.commuters), 1);
  const total = zones.reduce((sum, zone) => sum + zone.commuters, 0);

  return (
    <ReportPanel title="Pickup Points" description="Paid boardings by fare point, busiest first.">
      {zones.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-slate-600 admin-light:text-slate-500 text-xs">
          No boardings in this date range.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:grid-rows-1 lg:flex-1 lg:min-h-0">
          <ol className="space-y-3 lg:h-full overflow-y-auto scrollbar-themed pr-1">
            {zones.map((zone, index) => (
              <li key={zone.zone} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-xs tabular-nums text-slate-500">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-slate-300 admin-light:text-slate-700 font-medium truncate" title={zone.zone}>
                      {zone.zone}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {formatNumber(zone.commuters)} boardings
                      {total > 0 && <span> · {((zone.commuters / total) * 100).toFixed(0)}%</span>}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#0E1628] admin-light:bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#62A0EA] admin-light:bg-[#1A5FB4] rounded-full"
                      style={{ width: `${(zone.commuters / maxBoardings) * 100}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="h-72 lg:h-full min-w-0">
            <DemandMap zones={plottable} />
          </div>
        </div>
      )}
    </ReportPanel>
  );
}
