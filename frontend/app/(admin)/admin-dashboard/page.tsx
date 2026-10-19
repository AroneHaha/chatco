"use client";

import { AlertCircle } from "lucide-react";

import { useDashboardData } from "./data/dashboard-data";
import {
  SkeletonMetric,
  SkeletonPreviewCard,
  SkeletonDashboardMap,
  SkeletonDashboardAnalytics,
  SkeletonDashboardCarousel,
} from "@/components/admin/ui/skeleton";
import { DashboardQuickStats } from "@/components/admin/dashboard/dashboard-quick-stats";
import { DashboardMapPreview } from "@/components/admin/dashboard/dashboard-map-preview";
import { DashboardAnalyticsPreview } from "@/components/admin/dashboard/dashboard-analytics-preview";
import { DashboardPreviewCards } from "@/components/admin/dashboard/dashboard-preview-cards";
import { DashboardSettingsCarousel } from "@/components/admin/dashboard/dashboard-settings-carousel";
import { StickyPageHeader } from "@/components/admin/layout/sticky-page-header";

export default function DashboardHome() {
  const { data, isLoading, error, refetch, activityFeed } = useDashboardData();

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-40 rounded bg-gray-700 admin-light:bg-slate-200 animate-pulse" />
            <div className="h-4 w-72 rounded bg-gray-700 admin-light:bg-slate-200 animate-pulse" />
          </div>
        </div>
        <SkeletonMetric count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonDashboardMap />
          <SkeletonDashboardAnalytics />
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-5"><SkeletonPreviewCard variant="fleet" /></div>
            <div className="min-h-0 min-w-0 lg:relative lg:col-span-7">
              <div className="max-h-[360px] overflow-hidden lg:absolute lg:inset-0 lg:max-h-none"><SkeletonPreviewCard variant="timeline" rows={10} /></div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
            <div className="min-w-0 md:col-span-2 xl:col-span-5"><SkeletonPreviewCard variant="featured" /></div>
            <div className="min-w-0 xl:col-span-4"><SkeletonPreviewCard variant="featured" /></div>
            <div className="min-w-0 xl:col-span-3"><SkeletonPreviewCard /></div>
          </div>
        </div>
        <SkeletonDashboardCarousel />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 admin-light:text-red-600 mb-4" />
        <h2 className="text-lg font-semibold text-white admin-light:text-slate-900 mb-2">Failed to load dashboard</h2>
        <p className="text-sm text-slate-400 admin-light:text-slate-500 mb-4">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#62A0EA] admin-light:bg-[#1A5FB4] hover:bg-[#99C1F1] admin-light:hover:bg-[#164A8F] text-white rounded-md text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // isLoading and error are handled above, but neither narrows `data` for the
  // compiler — it stays `DashboardData | null`. Guard before destructuring.
  if (!data) return null;

  const {
    recentVehicles,
    recentClaims,
    recentUsers,
    recentNotifications,
    recentActivityLogs,
    quickStats,
    settingsModules,
    topPickupPoints,
    paymentTendencies,
  } = data;

  return (
    <div className="space-y-4 pb-8">
      {/* Header. Only the title pins on phones — the greeting stays in the
          scroll flow so the sticky bar stays one line tall instead of
          eating a third of a small screen. */}
      <StickyPageHeader>
        <h1 className="text-2xl font-bold text-white admin-light:text-slate-900">Dashboard</h1>
      </StickyPageHeader>
      <p className="text-sm text-slate-400 admin-light:text-slate-500 -mt-2">Welcome back. Here&apos;s what&apos;s happening across your network today.</p>

      <DashboardQuickStats stats={quickStats} />

      {/* Main Grid: Map leads (live tracking is the product's core surface),
          Analytics rides alongside as the supporting column — a 2:1 split
          instead of an even 50/50 that undersells the map. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DashboardMapPreview />
        </div>
        <DashboardAnalyticsPreview paymentTendencies={paymentTendencies} topPickupPoints={topPickupPoints} />
      </div>

      <DashboardPreviewCards
        activeVehicles={quickStats.find((stat) => stat.link === "/monitoring")?.value ?? "—"}
        recentVehicles={recentVehicles}
        recentClaims={recentClaims}
        recentUsers={recentUsers}
        recentNotifications={recentNotifications}
        recentActivityLogs={recentActivityLogs}
        activityFeed={activityFeed}
      />

      <DashboardSettingsCarousel modules={settingsModules} />
    </div>
  );
}
