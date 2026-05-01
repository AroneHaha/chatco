"use client";

import { initialPaymentUsageData } from "@/app/(admin)/analytics/data/analytics-data";
import type { PaymentMethodUsage } from "@/app/(admin)/analytics/data/analytics-data";

export function PaymentUsageTable() {
  return (
    // Fixed outer container height
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 h-[270px] flex flex-col">
      <h3 className="text-sm font-semibold text-white mb-4 flex-shrink-0">Payment Method Usage</h3>
      
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-white/30 font-semibold border-b border-white/[0.06] flex-shrink-0">
        <div className="col-span-5">Method</div>
        <div className="col-span-2 text-center">Txns</div>
        <div className="col-span-3 text-center">Share</div>
        <div className="col-span-2 text-right">Revenue</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-white/[0.04] flex-1 flex flex-col justify-center">
        {initialPaymentUsageData.map((row: PaymentMethodUsage) => (
          <div key={row.method} className="grid grid-cols-12 gap-2 px-3 py-3 items-center">
            <div className="col-span-5 flex items-center gap-2">
              <span className="text-xs text-white/80 font-medium truncate">{row.method}</span>
            </div>
            <div className="col-span-2 text-center text-xs text-white/60">{row.transactions.toLocaleString()}</div>
            <div className="col-span-3 flex flex-col gap-1">
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden w-full">
                <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.percentage}%` }} />
              </div>
              <span className="text-[10px] text-white/40 text-center">{row.percentage}%</span>
            </div>
            <div className="col-span-2 text-right text-xs font-semibold text-white">{row.amount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}