"use client";

import { initialPaymentUsageData } from "@/app/(admin)/analytics/data/analytics-data";
import type { PaymentMethodUsage } from "@/app/(admin)/analytics/data/analytics-data";

export function PaymentUsageTable() {
  return (
    // Fixed outer container height
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 h-[270px] flex flex-col">
      <h3 className="text-sm font-semibold text-white mb-4 flex-shrink-0">Payment Method Usage</h3>
      
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold border-b border-[#1E2D45] flex-shrink-0">
        <div className="col-span-5">Method</div>
        <div className="col-span-2 text-center">Txns</div>
        <div className="col-span-3 text-center">Share</div>
        <div className="col-span-2 text-right">Revenue</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-[#1E2D45] flex-1 flex flex-col justify-center">
        {initialPaymentUsageData.map((row: PaymentMethodUsage) => (
          <div key={row.method} className="grid grid-cols-12 gap-2 px-3 py-3 items-center">
            <div className="col-span-5 flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium truncate">{row.method}</span>
            </div>
            <div className="col-span-2 text-center text-xs text-slate-400">{row.transactions.toLocaleString()}</div>
            <div className="col-span-3 flex flex-col gap-1">
              <div className="h-1.5 bg-[#0E1628] rounded-full overflow-hidden w-full">
                <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.percentage}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 text-center">{row.percentage}%</span>
            </div>
            <div className="col-span-2 text-right text-xs font-semibold text-white">{row.amount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}