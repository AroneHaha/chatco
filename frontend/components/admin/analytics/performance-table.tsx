"use client";

// components/admin/analytics/performance-table.tsx
// A unit's or conductor's shifts, passengers and fare revenue for the
// selected range, ranked by revenue. Same panel and row styling as
// PaymentUsageTable so the two read as one family.

import { formatNumber, formatPeso } from "@/lib/admin/services/analytics.service";

export interface PerformanceRow {
  id: string;
  name: string;
  /** Secondary identifier, e.g. a unit's plate number. */
  detail?: string;
  shifts: number;
  passengers: number;
  revenue: number;
}

interface PerformanceTableProps {
  title: string;
  /** Header for the name column ("Unit", "Conductor"). */
  nameLabel: string;
  rows: PerformanceRow[];
  emptyMessage: string;
}

export function PerformanceTable({ title, nameLabel, rows, emptyMessage }: PerformanceTableProps) {
  return (
    <div className="bg-[#131C2E] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg p-5 h-80 flex flex-col">
      <h3 className="text-sm font-semibold text-white admin-light:text-slate-900 mb-4 flex-shrink-0">{title}</h3>

      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-[#1E2D45] admin-light:border-[#E2E8F0] flex-shrink-0">
        <div className="col-span-1">#</div>
        <div className="col-span-5">{nameLabel}</div>
        <div className="col-span-2 text-right">Shifts</div>
        <div className="col-span-2 text-right">Riders</div>
        <div className="col-span-2 text-right">Revenue</div>
      </div>

      <div className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0] flex-1 min-h-0 overflow-y-auto scrollbar-themed">
        {rows.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 admin-light:text-slate-500 text-xs">
            {emptyMessage}
          </div>
        ) : (
          rows.map((row, index) => (
            <div key={row.id} className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center">
              <div className="col-span-1 text-xs tabular-nums text-slate-500">{index + 1}</div>
              <div className="col-span-5 min-w-0">
                <p className="text-xs font-medium text-slate-300 admin-light:text-slate-700 truncate" title={row.name}>{row.name}</p>
                {row.detail && <p className="text-[10px] text-slate-500 truncate">{row.detail}</p>}
              </div>
              <div className="col-span-2 text-right text-xs tabular-nums text-slate-400 admin-light:text-slate-500">{formatNumber(row.shifts)}</div>
              <div className="col-span-2 text-right text-xs tabular-nums text-slate-400 admin-light:text-slate-500">{formatNumber(row.passengers)}</div>
              <div className="col-span-2 text-right text-xs font-semibold tabular-nums text-white admin-light:text-slate-900">{formatPeso(row.revenue)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
