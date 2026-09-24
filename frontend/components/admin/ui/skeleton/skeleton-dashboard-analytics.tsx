// components/admin/ui/skeleton/skeleton-dashboard-analytics.tsx
// Mirrors DashboardAnalyticsPreview's two stacked cards (Payment Tendencies
// bars, Top Pickup Points list) instead of a blank pulsing rectangle.

export function SkeletonDashboardAnalytics() {
  return (
    <div className="flex flex-col gap-6 h-[380px] animate-pulse">
      <div className="shrink-0 bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="w-40 h-3.5 rounded bg-[#1A2540]" />
          <div className="w-24 h-3 rounded bg-[#1A2540]" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <div className="w-12 h-2.5 rounded bg-[#1A2540]" />
                <div className="w-8 h-2.5 rounded bg-[#1A2540]" />
              </div>
              <div className="h-2 bg-[#0E1628] rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
        <div className="shrink-0 w-32 h-3.5 rounded bg-[#1A2540] mb-4" />
        <div className="flex-1 min-h-0 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded bg-[#1A2540]" />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <div className="w-20 h-2.5 rounded bg-[#1A2540]" />
                  <div className="w-6 h-2.5 rounded bg-[#1A2540]" />
                </div>
                <div className="h-1.5 bg-[#0E1628] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
