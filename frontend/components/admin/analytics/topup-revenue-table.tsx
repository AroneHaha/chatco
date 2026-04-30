"use client";

import { useState } from "react";

const TOPUP_DAILY = [
  { day: "Monday", topups: 120, revenue: "₱12,000" },
  { day: "Tuesday", topups: 105, revenue: "₱10,500" },
  { day: "Wednesday", topups: 130, revenue: "₱13,000" },
  { day: "Thursday", topups: 90, revenue: "₱9,000" },
  { day: "Friday", topups: 150, revenue: "₱15,000" },
  { day: "Saturday", topups: 80, revenue: "₱8,000" },
  { day: "Sunday", topups: 45, revenue: "₱4,500" },
];

const TOPUP_MONTHLY = [
  { month: "July", revenue: "₱245,000" },
  { month: "August", revenue: "₱268,000" },
  { month: "September", revenue: "₱290,000" },
  { month: "October", revenue: "₱315,000" },
];

export function TopUpRevenueTable() {
  const [view, setView] = useState<"daily" | "monthly">("daily");
  const data = view === "daily" ? TOPUP_DAILY : TOPUP_MONTHLY;
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
        {data.map((row) => {
          const numericRevenue = parseInt(row.revenue.replace(/[₱,]/g, ""));
          return (
            <div key={'day' in row ? row.day : row.month} className="flex items-center gap-3">
              <span className="text-xs text-white/50 w-20 flex-shrink-0">{'day' in row ? row.day : row.month}</span>
              <div className="flex-1 h-5 bg-white/[0.04] rounded-md overflow-hidden relative">
                <div className="h-full bg-green-500/40 rounded-md" style={{ width: `${(numericRevenue / maxRevenue) * 100}%` }} />
                {'day' in row && <span className="absolute left-2 top-0 text-[10px] text-white/50 font-medium leading-5">{row.topups} txns</span>}
              </div>
              <span className="text-xs font-bold text-green-400 w-20 text-right flex-shrink-0">{row.revenue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}