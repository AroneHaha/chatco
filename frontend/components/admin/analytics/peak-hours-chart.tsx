"use client";

// components/admin/analytics/peak-hours-chart.tsx
//
// Ride volume by hour of day, aggregated across the selected window.
// Directly actionable for dispatch: it answers "when do we need more units
// on the road", which none of the existing panels could.

import { useMemo, useState } from "react";
import {
  formatHour,
  formatPeso,
  type AnalyticsHourlyPoint,
} from "@/lib/admin/services/analytics.service";

export function PeakHoursChart({ data }: { data: AnalyticsHourlyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const { max, busiest, totalRides } = useMemo(() => {
    const max = Math.max(...data.map(d => d.count), 1);
    const busiest = data.reduce((a, b) => (b.count > a.count ? b : a), data[0]);
    const totalRides = data.reduce((s, d) => s + d.count, 0);
    return { max, busiest, totalRides };
  }, [data]);

  if (totalRides === 0) {
    return (
      <div className="py-16 text-center text-slate-600 text-sm">
        No rides in this date range.
      </div>
    );
  }

  const active = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="flex items-end gap-[3px] h-40" onMouseLeave={() => setHover(null)}>
        {data.map(d => {
          const pct = (d.count / max) * 100;
          const isPeak = d.hour === busiest.hour;
          const isHover = hover === d.hour;
          return (
            <button
              key={d.hour}
              type="button"
              onMouseEnter={() => setHover(d.hour)}
              onFocus={() => setHover(d.hour)}
              aria-label={`${formatHour(d.hour)}: ${d.count} rides, ${formatPeso(d.revenue)}`}
              className="flex-1 h-full flex flex-col justify-end group focus:outline-none focus:ring-1 focus:ring-[#62A0EA] rounded-sm"
            >
              <div
                className={`w-full rounded-t-sm transition-all ${
                  isHover
                    ? "bg-[#62A0EA]"
                    : isPeak
                      ? "bg-amber-500/80"
                      : "bg-[#62A0EA]/40 group-hover:bg-[#62A0EA]/70"
                }`}
                // Zero hours keep a 2px stub so the axis reads as continuous
                // rather than looking like missing data.
                style={{ height: `${Math.max(pct, d.count > 0 ? 3 : 1.5)}%` }}
              />
            </button>
          );
        })}
      </div>

      {/* Hour axis — every 3rd hour, enough to orient without crowding. */}
      <div className="flex gap-[3px] mt-1.5">
        {data.map(d => (
          <div key={d.hour} className="flex-1 text-center">
            {d.hour % 3 === 0 && (
              <span className="text-[9px] text-slate-600">{formatHour(d.hour)}</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 h-9 flex items-center justify-between rounded-md bg-[#0E1628] border border-[#1E2D45] px-3 text-xs">
        {active ? (
          <>
            <span className="text-slate-300 font-medium">
              {formatHour(active.hour)}–{formatHour((active.hour + 1) % 24)}
            </span>
            <div className="flex items-center gap-4 font-mono">
              <span className="text-white font-bold">{active.count} rides</span>
              <span className="text-emerald-400">{formatPeso(active.revenue)}</span>
            </div>
          </>
        ) : (
          <>
            <span className="text-slate-500">Busiest hour</span>
            <span className="font-mono text-amber-400">
              {formatHour(busiest.hour)}–{formatHour((busiest.hour + 1) % 24)} · {busiest.count} rides
            </span>
          </>
        )}
      </div>
    </div>
  );
}
