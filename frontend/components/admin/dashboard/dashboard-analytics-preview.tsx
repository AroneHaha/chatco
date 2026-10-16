import Link from "next/link";
import type { PaymentTendencies, PickupPoint } from "@/app/(admin)/admin-dashboard/data/dashboard-data";

interface DashboardAnalyticsPreviewProps {
  paymentTendencies: PaymentTendencies;
  topPickupPoints: PickupPoint[];
}

export function DashboardAnalyticsPreview({ paymentTendencies, topPickupPoints }: DashboardAnalyticsPreviewProps) {
  const maxPickupVal = Math.max(...topPickupPoints.map((p) => p.val), 0);

  return (
    // Height matches DashboardMapPreview so both grid columns line up.
    <div className="flex flex-col gap-4 h-[380px]">
      <div className="shrink-0 bg-[#131C2E] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white admin-light:text-slate-900">Payment Tendencies (Today)</h3>
          <Link href="/analytics" className="text-xs text-[#62A0EA] admin-light:text-[#1A5FB4] hover:underline">More Analytics</Link>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-slate-300 admin-light:text-slate-700">GCash</span>
              <span className="text-xs font-bold text-slate-200 admin-light:text-slate-700">{paymentTendencies.gcash}%</span>
            </div>
            <div className="h-2 bg-[#0E1628] admin-light:bg-[#E2E8F0] rounded-full overflow-hidden">
              <div className="h-full bg-[#62A0EA] admin-light:bg-[#1A5FB4] rounded-full" style={{ width: `${paymentTendencies.gcash}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-slate-300 admin-light:text-slate-700">Cash</span>
              <span className="text-xs font-bold text-slate-200 admin-light:text-slate-700">{paymentTendencies.cash}%</span>
            </div>
            <div className="h-2 bg-[#0E1628] admin-light:bg-[#E2E8F0] rounded-full overflow-hidden">
              <div className="h-full bg-slate-500 rounded-full" style={{ width: `${paymentTendencies.cash}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Top Pickup Points */}
      <div className="flex-1 min-h-0 flex flex-col bg-[#131C2E] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg p-5">
        <div className="shrink-0 mb-4">
          <h3 className="text-sm font-semibold text-white admin-light:text-slate-900">Top Pickup Points</h3>
          <p className="text-[11px] text-slate-400 admin-light:text-slate-500 mt-1">This week</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-themed pr-1 space-y-3">
          {topPickupPoints.length === 0 && (
            <p className="text-xs text-slate-400 admin-light:text-slate-500">No pickups this week.</p>
          )}
          {topPickupPoints.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 w-3">{i + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-300 admin-light:text-slate-700">{p.name}</span>
                  <span className="text-xs text-slate-500">{p.val}</span>
                </div>
                <div className="h-1.5 bg-[#0E1628] admin-light:bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#62A0EA] admin-light:bg-[#1A5FB4] rounded-full" style={{ width: `${maxPickupVal > 0 ? (p.val / maxPickupVal) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
