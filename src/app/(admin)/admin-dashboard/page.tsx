"use client";

import Link from "next/link";
import { ArrowRight, AlertCircle } from "lucide-react";

import { useDashboardData } from "./data/dashboard-data";
import { SkeletonMetric, SkeletonCard } from "@/components/admin/ui/skeleton";
import { DashboardQuickStats } from "@/components/admin/dashboard/dashboard-quick-stats";
import { DashboardMapPreview } from "@/components/admin/dashboard/dashboard-map-preview";
import { DashboardAnalyticsPreview } from "@/components/admin/dashboard/dashboard-analytics-preview";
import { DashboardPreviewCards } from "@/components/admin/dashboard/dashboard-preview-cards";
import { DashboardSettingsCarousel } from "@/components/admin/dashboard/dashboard-settings-carousel";

export default function DashboardHome() {
  const { data, isLoading, error, refetch } = useDashboardData();

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="space-y-6 pb-8">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-40 rounded bg-gray-700 animate-pulse" />
            <div className="h-4 w-72 rounded bg-gray-700 animate-pulse" />
          </div>
        </div>
        {/* Stats skeleton */}
        <SkeletonMetric count={4} />
        {/* Map + analytics skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard count={1} height="380px" />
          <div className="space-y-6">
            <SkeletonCard count={1} height="160px" />
            <SkeletonCard count={1} height="160px" />
          </div>
        </div>
        {/* Preview cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard count={3} height="200px" />
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Failed to load dashboard</h2>
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

  const {
    recentVehicles,
    recentLostFound,
    recentUsers,
    quickStats,
    settingsModules,
    topPickupPoints,
    paymentTendencies,
  } = data;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Welcome back. Here&apos;s what&apos;s happening across your network today.</p>
        </div>
        <Link href="/settings" className="group flex items-center gap-2 text-sm font-medium text-[#62A0EA] hover:text-[#99C1F1] transition-colors w-fit">
          Open Full Settings
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Quick Stats */}
      <DashboardQuickStats quickStats={quickStats} />

      {/* Main Grid: Map & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardMapPreview />
        <DashboardAnalyticsPreview paymentTendencies={paymentTendencies} topPickupPoints={topPickupPoints} />
      </div>

      {/* Previews: Vehicles, Lost & Found, Users */}
      <DashboardPreviewCards recentVehicles={recentVehicles} recentLostFound={recentLostFound} recentUsers={recentUsers} />

      {/* System Settings Carousel */}
      <DashboardSettingsCarousel settingsModules={settingsModules} />

      <style jsx global>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
