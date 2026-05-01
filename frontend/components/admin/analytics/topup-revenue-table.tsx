"use client";

import { useState } from "react";
import { initialTopUpDaily, initialTopUpMonthly } from "@/app/(admin)/analytics/data/analytics-data";
import type { TopUpDaily, TopUpMonthly } from "@/app/(admin)/analytics/data/analytics-data";

export function TopUpRevenueTable() {
  const [view, setView] = useState<"daily" | "monthly">("daily");
  const data = view === "daily" ? initialTopUpDaily : initialTopUpMonthly;
  const maxRevenue = view === "daily" ? 150 : 315000;

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Top-Up Revenue</h3>
        <div className="flex bg-white/[0.04] rounded-md p-0.5">
          <button onClick={() => setView("daily")} className={`px-3 py-1 rounded text-[11px] font-medium transition-all ${view === "daily" ? "bg-[#1A5FB4] text-white" : "text-white/40"}`}>Daily</button>
          <button onClick={() => setView("monthly")} className={`px-3 py-1 rounded text-[11px] font-medium transition-all ${view === "monthly" ? "bg-[#1A5FB4] text-white" : "text-white/40"}`}>Monthly</button>
        </div>
      </div>
      
      <div className="space-y-2">
        {data.map((row: TopUpDaily | TopUpMonthly) => {
          const numericRevenue = parseInt(row.revenue.replace(/[₱,]/g, ""));
          const isDaily = 'day' in row;
          return (
            <div key={isDaily ? (row as TopUpDaily).day : (row as TopUpMonthly).month} className="flex items-center gap-3">
              <span className="text-xs text-white/50 w-20 flex-shrink-0">{isDaily ? (row as TopUpDaily).day : (row as TopUpMonthly).month}</span>
              <div className="flex-1 h-5 bg-white/[0.04] rounded-md overflow-hidden relative">
                <div className="h-full bg-green-500/40 rounded-md" style={{ width: `${(numericRevenue / maxRevenue) * 100}%` }} />
                {isDaily && <span className="absolute left-2 top-0 text-[10px] text-white/50 font-medium leading-5">{(row as TopUpDaily).topups} txns</span>}
              </div>
              <span className="text-xs font-bold text-green-400 w-20 text-right flex-shrink-0">{row.revenue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}