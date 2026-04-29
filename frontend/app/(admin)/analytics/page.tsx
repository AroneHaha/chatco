"use client";

import { RemittanceTable } from "@/components/admin/analytics/remittance-table";
import { PaymentUsageTable } from "@/components/admin/analytics/payment-usage-table";
import { TopUpRevenueTable } from "@/components/admin/analytics/topup-revenue-table";
import { PickupPointsList } from "@/components/admin/analytics/pickup-points-list";
import { DemandHeatmapData } from "@/components/admin/analytics/demand-heatmap-data";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Financial & Operations Analytics</h1>
        <p className="text-sm text-white/40 mt-1">
          Conductor remittances, payment method breakdowns, top-up revenues, and commuter demand data.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <RemittanceTable />
          <PaymentUsageTable />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <TopUpRevenueTable />
          <PickupPointsList />
          <DemandHeatmapData />
        </div>
      </div>
    </div>
  );
}