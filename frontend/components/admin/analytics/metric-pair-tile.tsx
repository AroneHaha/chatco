// components/admin/analytics/metric-pair-tile.tsx
//
// Two related Overview figures in one panel: a headline metric and its
// companion (e.g. Awaiting Remittance with Shortage). Fills its grid cell's
// height so tiles beside a chart line up with it.

import type { ReactNode } from 'react';

interface Metric {
  label: string;
  value: string;
  note: string;
}

interface MetricPairTileProps {
  title: string;
  main: Metric;
  /** Rendered before the main metric's note, e.g. a period-over-period delta. */
  mainDelta?: ReactNode;
  second: Metric;
}

export function MetricPairTile({ title, main, mainDelta, second }: MetricPairTileProps) {
  return (
    <section className="h-full flex flex-col justify-between gap-4 rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 admin-light:text-slate-500">{title}</h2>

      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-300 admin-light:text-slate-700">{main.label}</p>
        <p className="mt-1 text-3xl font-bold leading-tight tabular-nums text-white admin-light:text-slate-900 truncate" title={main.value}>{main.value}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {mainDelta}
          <p className="text-xs text-slate-400 admin-light:text-slate-500">{main.note}</p>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-3.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-300 admin-light:text-slate-700">{second.label}</p>
          <p className="mt-0.5 text-xs text-slate-400 admin-light:text-slate-500">{second.note}</p>
        </div>
        <p className="shrink-0 text-xl font-bold tabular-nums text-white admin-light:text-slate-900">{second.value}</p>
      </div>
    </section>
  );
}
