import Link from "next/link";
import type { PaymentTendencies, PickupPoint } from "@/app/(admin)/admin-dashboard/data/dashboard-data";

interface DashboardAnalyticsPreviewProps {
  paymentTendencies: PaymentTendencies;
  topPickupPoints: PickupPoint[];
}

export function DashboardAnalyticsPreview({ paymentTendencies, topPickupPoints }: DashboardAnalyticsPreviewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex-1 bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Payment Tendencies (Today)</h3>
          <Link href="/analytics" className="text-xs text-[#62A0EA] hover:underline">More Analytics</Link>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-slate-300">GCash</span>
              <span className="text-xs font-bold text-slate-200">{paymentTendencies.gcash}%</span>
            </div>
            <div className="h-2 bg-[#0E1628] rounded-full overflow-hidden">
              <div className="h-full bg-[#62A0EA] rounded-full" style={{ width: `${paymentTendencies.gcash}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-slate-300">Cash</span>
              <span className="text-xs font-bold text-slate-200">{paymentTendencies.cash}%</span>
            </div>
            <div className="h-2 bg-[#0E1628] rounded-full overflow-hidden">
              <div className="h-full bg-slate-500 rounded-full" style={{ width: `${paymentTendencies.cash}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Top Pickup Points */}
      <div className="flex-1 bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Top Pickup Points</h3>
        <div className="space-y-3">
          {topPickupPoints.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 w-3">{i + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-300">{p.name}</span>
                  <span className="text-xs text-slate-500">{p.val}</span>
                </div>
                <div className="h-1.5 bg-[#0E1628] rounded-full overflow-hidden">
                  <div className="h-full bg-[#62A0EA] rounded-full" style={{ width: `${topPickupPoints.length > 0 ? (p.val / Math.max(...topPickupPoints.map(pt => pt.val))) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
