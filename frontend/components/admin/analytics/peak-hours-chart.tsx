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

  const { max, busiest, peakHours, totalRides } = useMemo(() => {
    const max = Math.max(...data.map(d => d.count), 1);
    const busiest = data.reduce((a, b) => (b.count > a.count ? b : a), data[0]);
    // The three busiest hours with rides carry the accent; the rest stay neutral.
    const peakHours = new Set([...data].filter(d => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 3).map(d => d.hour));
    const totalRides = data.reduce((s, d) => s + d.count, 0);
    return { max, busiest, peakHours, totalRides };
  }, [data]);

  if (totalRides === 0) {
    return (
      <div className="py-16 text-center text-slate-600 admin-light:text-slate-500 text-sm">
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
          const isPeak = peakHours.has(d.hour);
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
                className={`w-full rounded-t-sm transition-colors ${
                  isHover
                    ? "bg-[#99C1F1] admin-light:bg-[#164A8F]"
                    : isPeak
                      ? "bg-[#62A0EA] admin-light:bg-[#1A5FB4]"
                      : "bg-[#334155] admin-light:bg-[#CBD5E1]"
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
              <span className="text-[9px] text-slate-600 admin-light:text-slate-500">{formatHour(d.hour)}</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 h-9 flex items-center justify-between rounded-md bg-[#0E1628] admin-light:bg-[#F1F5F9] border border-[#1E2D45] admin-light:border-[#E2E8F0] px-3 text-xs">
        {active ? (
          <>
            <span className="text-slate-300 admin-light:text-slate-700 font-medium">
              {formatHour(active.hour)}–{formatHour((active.hour + 1) % 24)}
            </span>
            <div className="flex items-center gap-4 font-mono">
              <span className="text-white admin-light:text-slate-900 font-bold">{active.count} rides</span>
              <span className="text-slate-300 admin-light:text-slate-700">{formatPeso(active.revenue)}</span>
            </div>
          </>
        ) : (
          <>
            <span className="text-slate-500">Busiest hour</span>
            <span className="font-mono text-white admin-light:text-slate-900">
              {formatHour(busiest.hour)}–{formatHour((busiest.hour + 1) % 24)} · {busiest.count} rides
            </span>
          </>
        )}
      </div>
    </div>
  );
}
