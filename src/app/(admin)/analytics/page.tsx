"use client";

import { AlertCircle } from "lucide-react";
import { useAnalyticsData } from "./data/analytics-data";
import { RemittanceTable } from "@/components/admin/analytics/remittance-table";
import { PaymentUsageTable } from "@/components/admin/analytics/payment-usage-table";
import { PickupPointsList } from "@/components/admin/analytics/pickup-points-list";
import { DemandHeatmapData } from "@/components/admin/analytics/demand-heatmap-data";
import { SkeletonTable, SkeletonCard } from "@/components/admin/ui/skeleton";

export default function AnalyticsPage() {
  const { data, isLoading, error, refetch } = useAnalyticsData();

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-72 rounded bg-gray-700 animate-pulse" />
          <div className="h-4 w-96 rounded bg-gray-700 animate-pulse mt-2" />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <SkeletonTable rows={7} columns={7} title="Conductor Remittance" />
            <SkeletonTable rows={2} columns={4} title="Payment Method Usage" />
          </div>
          <div className="space-y-6">
            <SkeletonCard count={5} height="340px" />
            <SkeletonCard count={5} height="370px" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Failed to load analytics</h2>
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#62A0EA] hover:bg-[#99C1F1] text-white rounded-md text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Data Loaded ──
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Financial & Operations Analytics</h1>
        <p className="text-sm text-white/40 mt-1">
          Conductor remittances, payment method breakdowns, and commuter demand data.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <RemittanceTable data={data.remittanceData} />
          <PaymentUsageTable data={data.paymentUsage} />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <PickupPointsList data={data.pickupPoints} />
          <DemandHeatmapData zones={data.heatmapZones} />
        </div>
      </div>
    </div>
  );
}